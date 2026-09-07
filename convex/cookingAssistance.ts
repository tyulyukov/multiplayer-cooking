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
import { AI_RATE_LIMITS, AI_REQUEST_MAX_CHARACTERS } from "./lib/ai_config";
import { requireActiveMember, ROOM_MEMBER_LIMIT } from "./lib/cooking_access";
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

export const askHelper = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, prompt: v.string() },
  returns: v.union(v.null(), v.object({ threadId: v.string() })),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    const prompt = args.prompt.trim();
    if (
      !room?.plan ||
      room.state === "done" ||
      !prompt ||
      prompt.length > AI_REQUEST_MAX_CHARACTERS
    )
      return null;
    if (room.helperBusy) throw new ConvexError("Помічник уже відповідає.");
    const admitted = await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: room.hostUserId }),
    });
    if (!admitted) throw new ConvexError("Забагато запитів. Спробуйте трохи пізніше.");
    const threadId = room.helperThreadId ?? (await createThread(ctx, components.agent));
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId: member._id,
      prompt,
    });
    await ctx.db.patch(args.roomId, {
      helperThreadId: threadId,
      helperBusy: true,
      helperError: undefined,
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
    return { threadId };
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
    return page.page
      .flatMap((message) => {
        const role = message.message?.role;
        if (role !== "user" && role !== "assistant") return [];
        const text = messageText(message);
        return text ? [{ _id: message._id, role, text, createdAt: message._creationTime }] : [];
      })
      .reverse();
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
    const state = assessProposal(room.plan, nextPlan, runtimes, proposal.affectedStepKeys);
    if (!state.ok) return stale(ctx, proposal);
    await replaceFuturePlan(ctx, args.roomId, room, nextPlan, runtimes);
    await ctx.db.patch(proposal._id, {
      status: "approved",
      approvedBy: member._id,
      resolvedAt: Date.now(),
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
    const [members, steps, timers] = await Promise.all([
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
    ]);
    const member = members.find((candidate) => candidate._id === promptMessage?.userId);
    if (!member) return null;
    return {
      roomId: args.roomId,
      hostUserId: room.hostUserId,
      memberId: member._id,
      threadId: room.helperThreadId,
      promptMessageId: args.promptMessageId,
      promptText,
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
    const [room, member] = await Promise.all([
      ctx.db.get(args.roomId),
      ctx.db.get(args.authorMemberId),
    ]);
    if (
      !room?.plan ||
      !room.helperBusy ||
      !["ready", "cooking"].includes(room.state) ||
      room.helperPromptMessageId !== args.promptMessageId ||
      room.planVersion !== args.planVersion ||
      member?.roomId !== args.roomId ||
      member.status !== "active"
    )
      return null;
    const plan = validateCookingPlan(args.plan, room.cookCount);
    const runtimes = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    const affectedStepKeys = changedStepKeys(room.plan, plan);
    if (
      (!affectedStepKeys.length && stableJson(room.plan) === stableJson(plan)) ||
      !assessProposal(room.plan, plan, runtimes, affectedStepKeys).ok
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
  runtimes: readonly Pick<Doc<"cookingSteps">, "stepKey" | "status">[],
  affectedKeys: readonly string[],
): { ok: boolean } {
  const currentById = new Map(current.steps.map((step) => [step.id, step]));
  const nextById = new Map(next.steps.map((step) => [step.id, step]));
  const runtimeByKey = new Map(runtimes.map((runtime) => [runtime.stepKey, runtime]));
  for (const [stepKey, runtime] of runtimeByKey) {
    if (runtime.status === "pending") continue;
    if (!sameStep(currentById.get(stepKey)!, nextById.get(stepKey))) return { ok: false };
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
  for (const stepKey of blocked)
    if ((runtimeByKey.get(stepKey)?.status ?? "pending") !== "pending") return { ok: false };
  return { ok: true };
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
