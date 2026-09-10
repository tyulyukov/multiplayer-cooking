import { createThread, listMessages as listThreadMessages, saveMessage } from "@convex-dev/agent";
import { RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { stepStatusValidator, timerStatusValidator } from "./cookingSchema";
import { admitAiGeneration } from "./lib/ai_admission";
import { AI_MAX_IMAGES, AI_RATE_LIMITS, AI_REQUEST_MAX_CHARACTERS } from "./lib/ai_config";
import { hashSecret, requireActiveMember, ROOM_MEMBER_LIMIT } from "./lib/cooking_access";
import { HELPER_UPLOAD_LIFETIME_MS, isValidHelperImage } from "./lib/cooking_helper_uploads";
import { type CookingPlan, validateCookingPlan } from "./lib/cooking_plan";
import { cookingPlanValidator, cookingStepValidator } from "./lib/cooking_validators";

const rateLimiter = new RateLimiter(components.rateLimiter, AI_RATE_LIMITS);
const tokenValidator = v.string();
const MAX_NOTES = 50;
const MAX_PROPOSALS = 20;
const HELPER_TIMEOUT_MS = 8 * 60_000;
const proposalStatusValidator = v.union(
  v.literal("open"),
  v.literal("approved"),
  v.literal("stale"),
  v.literal("rejected"),
);

const messageValidator = v.object({
  _id: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  text: v.string(),
  createdAt: v.number(),
  authorName: v.optional(v.string()),
  stepKey: v.optional(v.string()),
  attachmentUrls: v.optional(v.array(v.string())),
});
const noteValidator = v.object({
  _id: v.id("cookingNotes"),
  authorMemberId: v.id("cookingMembers"),
  text: v.string(),
  createdAt: v.number(),
});
const proposalValidator = v.object({
  _id: v.id("cookingProposals"),
  authorMemberId: v.id("cookingMembers"),
  status: proposalStatusValidator,
  planVersion: v.number(),
  preview: v.string(),
  plan: cookingPlanValidator,
  affectedStepKeys: v.array(v.string()),
  selectedStepKey: v.optional(v.string()),
  selectedStepStatus: v.optional(stepStatusValidator),
  selectedStepCheckedIds: v.optional(v.array(v.string())),
  approvedBy: v.optional(v.id("cookingMembers")),
  resolvedAt: v.optional(v.number()),
  createdAt: v.number(),
});

export const requestReference = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, stepKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const [room, step] = await Promise.all([
      ctx.db.get(args.roomId),
      ctx.db
        .query("cookingSteps")
        .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId).eq("stepKey", args.stepKey))
        .unique(),
    ]);
    const planStep = room?.plan?.steps.find((candidate) => candidate.id === args.stepKey);
    if (!room || !step || !planStep?.reference || room.state === "done") return false;
    if (step.imageStatus === "pending" || step.imageStatus === "ready") return false;
    const admitted = await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: room.hostUserId }),
    });
    if (!admitted) throw new ConvexError("Ліміт зображень для цієї сесії вичерпано.");
    const attempt = crypto.randomUUID();
    await ctx.db.patch(step._id, {
      imageStatus: "pending",
      imageAttempt: attempt,
      imageError: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.cookingGeneration.generateReference, {
      roomId: args.roomId,
      stepKey: args.stepKey,
      attempt,
    });
    await ctx.scheduler.runAfter(45_000, internal.cookingRooms.imageResult, {
      roomId: args.roomId,
      stepKey: args.stepKey,
      attempt,
      message: "Не вдалося вчасно створити зображення.",
    });
    return true;
  },
});

export const listNotes = query({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.array(noteValidator),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const notes = await ctx.db
      .query("cookingNotes")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(MAX_NOTES);
    return notes.reverse().map(({ _id, authorMemberId, text, createdAt }) => ({
      _id,
      authorMemberId,
      text,
      createdAt,
    }));
  },
});

export const addNote = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, text: v.string() },
  returns: v.union(v.null(), v.id("cookingNotes")),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const existingNotes = await ctx.db
      .query("cookingNotes")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .take(MAX_NOTES);
    if (existingNotes.length >= MAX_NOTES) throw new ConvexError("У цій сесії вже є 50 нотаток.");
    const text = args.text.trim();
    if (!text || text.length > 1_000) return null;
    return ctx.db.insert("cookingNotes", {
      roomId: args.roomId,
      authorMemberId: member._id,
      text,
      createdAt: Date.now(),
    });
  },
});

export const deleteNote = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    noteId: v.id("cookingNotes"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.roomId !== args.roomId) return false;
    if (note.authorMemberId !== member._id && member.role !== "host")
      throw new ConvexError("Видалити може автор нотатки або господар.");
    await ctx.db.delete(note._id);
    return true;
  },
});

export const generateHelperUploadUrl = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.union(v.null(), v.object({ uploadUrl: v.string(), uploadTicket: v.string() })),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room || !["ready", "cooking"].includes(room.state)) return null;
    const { ok } = await rateLimiter.limit(ctx, "uploadBurst", { key: room.hostUserId });
    if (!ok) return null;
    const grants = await ctx.db
      .query("cookingHelperUploadGrants")
      .withIndex("by_room_member", (q) => q.eq("roomId", args.roomId).eq("memberId", member._id))
      .take(AI_MAX_IMAGES + 1);
    const now = Date.now();
    const activeGrants = grants.filter((grant) => grant.expiresAt >= now);
    for (const grant of grants) if (grant.expiresAt < now) await ctx.db.delete(grant._id);
    if (activeGrants.length >= AI_MAX_IMAGES) return null;
    const uploadTicket = crypto.randomUUID();
    await ctx.db.insert("cookingHelperUploadGrants", {
      roomId: args.roomId,
      memberId: member._id,
      ticketHash: await hashSecret(uploadTicket),
      createdAt: now,
      expiresAt: now + HELPER_UPLOAD_LIFETIME_MS,
    });
    return { uploadUrl: await ctx.storage.generateUploadUrl(), uploadTicket };
  },
});

export const registerHelperUpload = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    uploadTicket: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const ticketHash = await hashSecret(args.uploadTicket);
    const grant = await ctx.db
      .query("cookingHelperUploadGrants")
      .withIndex("by_ticketHash", (q) => q.eq("ticketHash", ticketHash))
      .unique();
    if (!grant || grant.roomId !== args.roomId || grant.memberId !== member._id) return false;
    if (grant.expiresAt < Date.now()) {
      await ctx.db.delete(grant._id);
      return false;
    }
    const file = await ctx.db.system.get("_storage", args.storageId);
    if (!isValidHelperImage(file) || file._creationTime < grant.createdAt) return false;
    const [mainUpload, helperUpload] = await Promise.all([
      ctx.db
        .query("uploads")
        .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
        .unique(),
      ctx.db
        .query("cookingHelperUploads")
        .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
        .unique(),
    ]);
    if (mainUpload || helperUpload) return false;
    await ctx.db.delete(grant._id);
    await ctx.db.insert("cookingHelperUploads", {
      roomId: args.roomId,
      memberId: member._id,
      storageId: args.storageId,
      contentType: file.contentType,
      size: file.size,
    });
    return true;
  },
});

export const askHelper = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    prompt: v.string(),
    stepKey: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.union(v.null(), v.object({ threadId: v.string(), promptMessageId: v.string() })),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    const prompt = args.prompt.trim();
    const attachmentStorageIds = args.attachmentStorageIds ?? [];
    if (
      !room?.plan ||
      !["ready", "cooking"].includes(room.state) ||
      prompt.length > AI_REQUEST_MAX_CHARACTERS ||
      attachmentStorageIds.length > AI_MAX_IMAGES ||
      (!prompt && attachmentStorageIds.length === 0) ||
      (args.stepKey && !room.plan.steps.some((step) => step.id === args.stepKey))
    )
      return null;
    if (room.helperBusy) throw new ConvexError("Помічник уже відповідає.");
    const admitted = await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: room.hostUserId }),
    });
    if (!admitted) throw new ConvexError("Забагато запитів. Спробуйте трохи пізніше.");
    const attachments: { url: string; contentType: "image/jpeg" | "image/png" | "image/webp" }[] =
      [];
    for (const storageId of attachmentStorageIds) {
      const upload = await ctx.db
        .query("cookingHelperUploads")
        .withIndex("by_room_member_storage", (q) =>
          q.eq("roomId", args.roomId).eq("memberId", member._id).eq("storageId", storageId),
        )
        .unique();
      if (!upload) return null;
      const file = await ctx.db.system.get("_storage", storageId);
      if (
        !isValidHelperImage(file) ||
        file.contentType !== upload.contentType ||
        file.size !== upload.size
      )
        return null;
      const url = await ctx.storage.getUrl(storageId);
      if (!url) return null;
      attachments.push({
        url,
        contentType: upload.contentType,
      });
    }
    const threadId = room.helperThreadId ?? (await createThread(ctx, components.agent));
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId: member._id,
      message: {
        role: "user",
        content: [
          ...attachments.map(({ url, contentType }) => ({
            type: "image" as const,
            image: url,
            mediaType: contentType,
          })),
          {
            type: "text" as const,
            text: prompt || "Що на цьому фото і як продовжити?",
          },
        ],
      },
    });
    await ctx.db.insert("cookingHelperMessages", {
      roomId: args.roomId,
      messageId,
      authorMemberId: member._id,
      authorName: member.name,
      stepKey: args.stepKey,
      attachmentStorageIds,
    });
    await ctx.db.patch(args.roomId, {
      helperThreadId: threadId,
      helperBusy: true,
      helperError: undefined,
      helperFailedPromptMessageId: undefined,
      helperPromptMessageId: messageId,
      helperStartedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.cookingGeneration.respond, {
      roomId: args.roomId,
      promptMessageId: messageId,
    });
    await ctx.scheduler.runAfter(HELPER_TIMEOUT_MS, internal.cookingAssistance.finishHelper, {
      roomId: args.roomId,
      promptMessageId: messageId,
      error: "Помічник не відповів вчасно. Спробуйте ще раз.",
    });
    return { threadId, promptMessageId: messageId };
  },
});

export const listMessages = query({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room?.helperThreadId) return [];
    const page = await listThreadMessages(ctx, components.agent, {
      threadId: room.helperThreadId,
      paginationOpts: { cursor: null, numItems: 40 },
      excludeToolMessages: true,
    });
    const messages = await Promise.all(
      page.page.map(async (message) => {
        const role = message.message?.role;
        if (role !== "user" && role !== "assistant") return null;
        const text = messageText(message);
        if (!text) return null;
        const metadata = await ctx.db
          .query("cookingHelperMessages")
          .withIndex("by_room_message", (q) =>
            q.eq("roomId", args.roomId).eq("messageId", message._id),
          )
          .unique();
        const attachmentUrls = metadata
          ? (
              await Promise.all(
                metadata.attachmentStorageIds.map((storageId) => ctx.storage.getUrl(storageId)),
              )
            ).filter((url): url is string => Boolean(url))
          : [];
        return {
          _id: message._id,
          role,
          text,
          createdAt: message._creationTime,
          ...(metadata ? { authorName: metadata.authorName } : {}),
          ...(metadata?.stepKey ? { stepKey: metadata.stepKey } : {}),
          ...(attachmentUrls.length ? { attachmentUrls } : {}),
        };
      }),
    );
    return messages.flatMap((message) => (message ? [message] : [])).reverse();
  },
});

export const listProposals = query({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.array(proposalValidator),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const proposals = await ctx.db
      .query("cookingProposals")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(MAX_PROPOSALS);
    return proposals
      .reverse()
      .map(
        ({
          _id,
          authorMemberId,
          status,
          planVersion,
          preview,
          plan,
          affectedStepKeys,
          selectedStepKey,
          selectedStepStatus,
          selectedStepCheckedIds,
          approvedBy,
          resolvedAt,
          createdAt,
        }) => ({
          _id,
          authorMemberId,
          status,
          planVersion,
          preview,
          plan,
          affectedStepKeys,
          selectedStepKey,
          selectedStepStatus,
          selectedStepCheckedIds,
          approvedBy,
          resolvedAt,
          createdAt,
        }),
      );
  },
});

export const rejectProposal = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    proposalId: v.id("cookingProposals"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.roomId !== args.roomId || proposal.status !== "open") return false;
    await ctx.db.patch(proposal._id, { status: "rejected", resolvedAt: Date.now() });
    return true;
  },
});

export const approveProposal = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    proposalId: v.id("cookingProposals"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const [room, proposal] = await Promise.all([
      ctx.db.get(args.roomId),
      ctx.db.get(args.proposalId),
    ]);
    if (
      !room ||
      !proposal ||
      proposal.roomId !== args.roomId ||
      proposal.status !== "open" ||
      room.state === "done" ||
      room.state === "error"
    )
      return false;
    if (!room.plan || room.planVersion !== proposal.planVersion) return stale(ctx, proposal);
    const nextPlan = validateCookingPlan(proposal.plan, room.cookCount);
    const runtimes = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    const selectedRuntime = proposal.selectedStepKey
      ? runtimes.find((runtime) => runtime.stepKey === proposal.selectedStepKey)
      : undefined;
    if (
      proposal.selectedStepKey &&
      (!selectedRuntime ||
        selectedRuntime.status !== proposal.selectedStepStatus ||
        stableJson(selectedRuntime.checkedIds) !==
          stableJson(proposal.selectedStepCheckedIds ?? []))
    )
      return stale(ctx, proposal);
    const state = assessProposal(
      room.plan,
      nextPlan,
      runtimes,
      proposal.affectedStepKeys,
      proposal.selectedStepKey,
    );
    if (!state.ok) return stale(ctx, proposal);
    await replaceFuturePlan(ctx, args.roomId, room, nextPlan, runtimes);
    const openProposals = await ctx.db
      .query("cookingProposals")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(MAX_PROPOSALS);
    const resolvedAt = Date.now();
    for (const sibling of openProposals)
      if (sibling._id !== proposal._id && sibling.status === "open")
        await ctx.db.patch(sibling._id, { status: "stale", resolvedAt });
    await ctx.db.patch(proposal._id, {
      status: "approved",
      approvedBy: member._id,
      resolvedAt,
    });
    return true;
  },
});

export const helperData = internalQuery({
  args: { roomId: v.id("cookingRooms"), promptMessageId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      roomId: v.id("cookingRooms"),
      hostUserId: v.id("users"),
      memberId: v.id("cookingMembers"),
      threadId: v.string(),
      promptMessageId: v.string(),
      promptText: v.string(),
      currentStep: v.optional(v.object({ id: v.string(), title: v.string() })),
      plan: cookingPlanValidator,
      planVersion: v.number(),
      cookCount: v.number(),
      requestedServings: v.number(),
      constraints: v.string(),
      members: v.array(v.object({ name: v.string(), slots: v.array(v.number()) })),
      steps: v.array(
        v.object({
          stepKey: v.string(),
          status: stepStatusValidator,
          slots: v.array(v.number()),
          checkedIds: v.array(v.string()),
          startedAt: v.optional(v.number()),
          completedAt: v.optional(v.number()),
        }),
      ),
      timers: v.array(
        v.object({
          stepKey: v.string(),
          timerKey: v.string(),
          status: timerStatusValidator,
          deadline: v.optional(v.number()),
          remainingMs: v.optional(v.number()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (
      !room?.plan ||
      !room.helperBusy ||
      !["ready", "cooking"].includes(room.state) ||
      !room.helperBusy ||
      room.helperPromptMessageId !== args.promptMessageId ||
      !room.helperThreadId
    )
      return null;
    const messages = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [args.promptMessageId],
    });
    const promptMessage = messages[0];
    const promptText = promptMessage ? messageText(promptMessage) : "";
    if (!promptText) return null;
    const [members, steps, timers, messageMetadata] = await Promise.all([
      ctx.db
        .query("cookingMembers")
        .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
        .take(ROOM_MEMBER_LIMIT),
      ctx.db
        .query("cookingSteps")
        .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
        .take(80),
      ctx.db
        .query("cookingTimers")
        .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId))
        .take(24),
      ctx.db
        .query("cookingHelperMessages")
        .withIndex("by_room_message", (q) =>
          q.eq("roomId", args.roomId).eq("messageId", args.promptMessageId),
        )
        .unique(),
    ]);
    const member = members.find((candidate) => candidate._id === promptMessage?.userId);
    if (!member) return null;
    if (messageMetadata?.authorMemberId !== member._id) return null;
    const attachments = await Promise.all(
      (messageMetadata?.attachmentStorageIds ?? []).map(async (storageId) => {
        const [upload, file] = await Promise.all([
          ctx.db
            .query("cookingHelperUploads")
            .withIndex("by_room_member_storage", (q) =>
              q.eq("roomId", args.roomId).eq("memberId", member._id).eq("storageId", storageId),
            )
            .unique(),
          ctx.db.system.get("_storage", storageId),
        ]);
        return Boolean(
          upload &&
          isValidHelperImage(file) &&
          file.contentType === upload.contentType &&
          file.size === upload.size,
        );
      }),
    );
    if (attachments.some((valid) => !valid)) return null;
    return {
      roomId: args.roomId,
      hostUserId: room.hostUserId,
      memberId: member._id,
      threadId: room.helperThreadId,
      promptMessageId: args.promptMessageId,
      promptText,
      ...(messageMetadata?.stepKey
        ? {
            currentStep: {
              id: messageMetadata.stepKey,
              title:
                room.plan.steps.find((step) => step.id === messageMetadata.stepKey)?.title ??
                messageMetadata.stepKey,
            },
          }
        : {}),
      plan: room.plan,
      planVersion: room.planVersion,
      cookCount: room.cookCount,
      requestedServings: room.requestedServings,
      constraints: room.constraints,
      members: members.map(({ name, slots }) => ({ name, slots })),
      steps: steps.map(({ stepKey, status, slots, checkedIds, startedAt, completedAt }) => ({
        stepKey,
        status,
        slots,
        checkedIds,
        startedAt,
        completedAt,
      })),
      timers: timers.map(({ stepKey, timerKey, status, deadline, remainingMs }) => ({
        stepKey,
        timerKey,
        status,
        deadline,
        remainingMs,
      })),
    };
  },
});

export const saveProposal = internalMutation({
  args: {
    roomId: v.id("cookingRooms"),
    authorMemberId: v.id("cookingMembers"),
    promptMessageId: v.string(),
    planVersion: v.number(),
    preview: v.string(),
    plan: cookingPlanValidator,
  },
  returns: v.union(v.null(), v.id("cookingProposals")),
  handler: async (ctx, args) => {
    const [room, member, messageMetadata] = await Promise.all([
      ctx.db.get(args.roomId),
      ctx.db.get(args.authorMemberId),
      ctx.db
        .query("cookingHelperMessages")
        .withIndex("by_room_message", (q) =>
          q.eq("roomId", args.roomId).eq("messageId", args.promptMessageId),
        )
        .unique(),
    ]);
    if (
      !room?.plan ||
      !room.helperBusy ||
      !["ready", "cooking"].includes(room.state) ||
      room.helperPromptMessageId !== args.promptMessageId ||
      room.planVersion !== args.planVersion ||
      member?.roomId !== args.roomId ||
      member.status !== "active" ||
      (messageMetadata && messageMetadata.authorMemberId !== member._id)
    )
      return null;
    const plan = validateCookingPlan(args.plan, room.cookCount);
    const runtimes = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    const selectedRuntime = messageMetadata?.stepKey
      ? runtimes.find((runtime) => runtime.stepKey === messageMetadata.stepKey)
      : undefined;
    if (messageMetadata?.stepKey && !selectedRuntime) return null;
    const affectedStepKeys = changedStepKeys(room.plan, plan);
    if (
      (!affectedStepKeys.length && stableJson(room.plan) === stableJson(plan)) ||
      !assessProposal(room.plan, plan, runtimes, affectedStepKeys, messageMetadata?.stepKey).ok
    )
      return null;
    const preview = args.preview.trim();
    if (!preview || preview.length > 2_000) return null;
    return ctx.db.insert("cookingProposals", {
      roomId: args.roomId,
      authorMemberId: args.authorMemberId,
      status: "open",
      planVersion: args.planVersion,
      preview,
      plan,
      affectedStepKeys,
      selectedStepKey: messageMetadata?.stepKey,
      selectedStepStatus: selectedRuntime?.status,
      selectedStepCheckedIds: selectedRuntime?.checkedIds,
      createdAt: Date.now(),
    });
  },
});

export const finishHelper = internalMutation({
  args: {
    roomId: v.id("cookingRooms"),
    promptMessageId: v.string(),
    error: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.helperBusy || room.helperPromptMessageId !== args.promptMessageId)
      return false;
    await ctx.db.patch(args.roomId, {
      helperBusy: false,
      helperError: args.error?.slice(0, 500),
      helperFailedPromptMessageId: args.error ? args.promptMessageId : undefined,
      helperPromptMessageId: undefined,
      helperStartedAt: undefined,
    });
    return true;
  },
});

export const referenceData = internalQuery({
  args: { roomId: v.id("cookingRooms"), stepKey: v.string(), attempt: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      title: v.string(),
      step: cookingStepValidator,
      hostUserId: v.id("users"),
    }),
  ),
  handler: async (ctx, args) => {
    const [room, runtime] = await Promise.all([
      ctx.db.get(args.roomId),
      ctx.db
        .query("cookingSteps")
        .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId).eq("stepKey", args.stepKey))
        .unique(),
    ]);
    const step = room?.plan?.steps.find((candidate) => candidate.id === args.stepKey);
    if (
      !room ||
      !step?.reference ||
      !runtime ||
      runtime.imageStatus !== "pending" ||
      runtime.imageAttempt !== args.attempt
    )
      return null;
    return { title: room.source.title, step, hostUserId: room.hostUserId };
  },
});

function messageText(message: { text?: string; message?: { content?: unknown } }): string {
  if (message.text?.trim()) return message.text.trim();
  const content = message.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("\n")
    .trim();
}

function sameStep(
  left: CookingPlan["steps"][number],
  right: CookingPlan["steps"][number] | undefined,
): boolean {
  return stableJson(left) === stableJson(right);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function changedStepKeys(current: CookingPlan, next: CookingPlan): string[] {
  const currentById = new Map(current.steps.map((step) => [step.id, step]));
  const nextById = new Map(next.steps.map((step) => [step.id, step]));
  return [
    ...new Set(
      [...current.steps, ...next.steps]
        .filter(
          (step) =>
            !sameStep(step, nextById.get(step.id)) || !sameStep(step, currentById.get(step.id)),
        )
        .map((step) => step.id),
    ),
  ];
}

function dependentClosure(plan: CookingPlan, keys: readonly string[]): Set<string> {
  const affected = new Set(keys);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of plan.steps)
      if (step.dependsOn.some((dependency) => affected.has(dependency)) && !affected.has(step.id)) {
        affected.add(step.id);
        changed = true;
      }
  }
  return affected;
}

export function assessProposal(
  current: CookingPlan,
  next: CookingPlan,
  runtimes: readonly {
    stepKey: string;
    status: Doc<"cookingSteps">["status"];
    checkedIds?: readonly string[];
  }[],
  affectedKeys: readonly string[],
  mutableStartedStepKey?: string,
): { ok: boolean } {
  const currentById = new Map(current.steps.map((step) => [step.id, step]));
  const nextById = new Map(next.steps.map((step) => [step.id, step]));
  const runtimeByKey = new Map(runtimes.map((runtime) => [runtime.stepKey, runtime]));
  for (const [stepKey, runtime] of runtimeByKey) {
    if (runtime.status === "pending") continue;
    const currentStep = currentById.get(stepKey);
    const nextStep = nextById.get(stepKey);
    if (!currentStep || !nextStep) return { ok: false };
    if (sameStep(currentStep, nextStep)) continue;
    if (
      runtime.status === "done" ||
      stepKey !== mutableStartedStepKey ||
      !preservesStartedStep(currentStep, nextStep, runtime.checkedIds ?? [])
    )
      return { ok: false };
  }
  const currentEquipment = new Map(current.equipment.map((item) => [item.id, item]));
  const nextEquipment = new Map(next.equipment.map((item) => [item.id, item]));
  for (const runtime of runtimes) {
    if (runtime.status === "pending") continue;
    for (const equipmentId of currentById.get(runtime.stepKey)?.equipment ?? []) {
      if (
        stableJson(currentEquipment.get(equipmentId)) !== stableJson(nextEquipment.get(equipmentId))
      )
        return { ok: false };
    }
  }
  const blocked = dependentClosure(current, affectedKeys);
  for (const stepKey of blocked) {
    if (stepKey === mutableStartedStepKey) continue;
    if ((runtimeByKey.get(stepKey)?.status ?? "pending") !== "pending") return { ok: false };
  }
  return { ok: true };
}

function preservesStartedStep(
  current: CookingPlan["steps"][number],
  next: CookingPlan["steps"][number],
  checkedIds: readonly string[],
): boolean {
  return (
    current.kind === next.kind &&
    stableJson(current.slots) === stableJson(next.slots) &&
    stableJson(current.dependsOn) === stableJson(next.dependsOn) &&
    current.canWait === next.canWait &&
    stableJson(current.equipment) === stableJson(next.equipment) &&
    stableJson(current.timers) === stableJson(next.timers) &&
    stableJson(current.confirmation) === stableJson(next.confirmation) &&
    stableJson(current.choices) === stableJson(next.choices) &&
    stableJson(current.reference) === stableJson(next.reference) &&
    checkedIds.every((id) => {
      const item = current.checklist.find((item) => item.id === id);
      return item && stableJson(item) === stableJson(next.checklist.find((item) => item.id === id));
    })
  );
}

async function replaceFuturePlan(
  ctx: MutationCtx,
  roomId: Id<"cookingRooms">,
  room: Doc<"cookingRooms">,
  nextPlan: CookingPlan,
  runtimes: readonly Doc<"cookingSteps">[],
): Promise<void> {
  const current = room.plan!;
  const currentById = new Map(current.steps.map((step) => [step.id, step]));
  const nextById = new Map(nextPlan.steps.map((step) => [step.id, step]));
  const retainedRuntimeKeys = new Set(
    runtimes
      .filter((runtime) => {
        const oldStep = currentById.get(runtime.stepKey);
        const newStep = nextById.get(runtime.stepKey);
        return runtime.status !== "pending" || (oldStep && newStep && sameStep(oldStep, newStep));
      })
      .map((runtime) => runtime.stepKey),
  );
  const timers = await ctx.db
    .query("cookingTimers")
    .withIndex("by_room_status", (q) => q.eq("roomId", roomId))
    .take(25);
  const retainedTimers = timers.filter((timer) => retainedRuntimeKeys.has(timer.stepKey)).length;
  const futureTimers = nextPlan.steps
    .filter((step) => !retainedRuntimeKeys.has(step.id))
    .reduce((count, step) => count + step.timers.length, 0);
  if (retainedTimers + futureTimers > 24) throw new ConvexError("У цій сесії вже є 24 таймери.");
  for (const runtime of runtimes) {
    const oldStep = currentById.get(runtime.stepKey);
    const newStep = nextById.get(runtime.stepKey);
    if (runtime.status !== "pending" || (oldStep && newStep && sameStep(oldStep, newStep)))
      continue;
    const timers = await ctx.db
      .query("cookingTimers")
      .withIndex("by_room_step_key", (q) => q.eq("roomId", roomId).eq("stepKey", runtime.stepKey))
      .take(24);
    for (const timer of timers) await ctx.db.delete(timer._id);
    if (runtime.imageStorageId) await ctx.storage.delete(runtime.imageStorageId);
    await ctx.db.delete(runtime._id);
  }
  const remaining = await ctx.db
    .query("cookingSteps")
    .withIndex("by_room_step", (q) => q.eq("roomId", roomId))
    .take(80);
  const existing = new Set(remaining.map((runtime) => runtime.stepKey));
  for (const step of nextPlan.steps) {
    if (existing.has(step.id)) continue;
    await ctx.db.insert("cookingSteps", {
      roomId,
      stepKey: step.id,
      status: "pending",
      slots: step.slots,
      readyMemberIds: [],
      checkedIds: [],
    });
    for (const timer of step.timers)
      await ctx.db.insert("cookingTimers", {
        roomId,
        stepKey: step.id,
        timerKey: timer.id,
        label: timer.label,
        status: "ready",
        durationMs: timer.durationSeconds * 1000,
        version: 1,
      });
  }
  await ctx.db.patch(roomId, {
    plan: nextPlan,
    planVersion: room.planVersion + 1,
    requestedServings: nextPlan.servings,
    checkedIngredientIds: room.checkedIngredientIds.filter((id) =>
      nextPlan.ingredients.some((ingredient) => ingredient.id === id),
    ),
  });
}

async function stale(ctx: MutationCtx, proposal: Doc<"cookingProposals">): Promise<boolean> {
  await ctx.db.patch(proposal._id, { status: "stale", resolvedAt: Date.now() });
  return false;
}
