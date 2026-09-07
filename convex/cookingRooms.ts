import { resetUnstartedReadiness } from "./lib/cooking_readiness";
import { RateLimiter } from "@convex-dev/rate-limiter";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  imageStatusValidator,
  memberRoleValidator,
  memberStatusValidator,
  roomStateValidator,
  stepStatusValidator,
  timerStatusValidator,
} from "./cookingSchema";
import { admitAiGeneration } from "./lib/ai_admission";
import { AI_RATE_LIMITS } from "./lib/ai_config";
import {
  activeMember,
  hashSecret,
  PARTICIPANT_TOKEN_MAX_LENGTH,
  publicMember,
  publicRoom,
  requireActiveMember,
  requireHost,
  ROOM_MEMBER_LIMIT,
} from "./lib/cooking_access";
import { normalizeSoloPlan, validateCookingPlan } from "./lib/cooking_plan";
import { cookingPlanValidator } from "./lib/cooking_validators";
import { findUser } from "./lib/users";

const rateLimiter = new RateLimiter(components.rateLimiter, AI_RATE_LIMITS);
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_COOLDOWN_MS = 30_000;
const tokenValidator = v.string();
const publicMemberValidator = v.object({
  _id: v.id("cookingMembers"),
  name: v.string(),
  role: memberRoleValidator,
  status: memberStatusValidator,
  slots: v.array(v.number()),
  lastSeenAt: v.number(),
});
const publicRoomValidator = v.object({
  _id: v.id("cookingRooms"),
  source: v.object({
    title: v.string(),
    summary: v.string(),
    body: v.string(),
    ingredients: v.array(v.object({ name: v.string(), amount: v.optional(v.string()) })),
    servings: v.number(),
  }),
  cookCount: v.number(),
  requestedServings: v.number(),
  constraints: v.string(),
  state: roomStateValidator,
  plan: v.optional(cookingPlanValidator),
  planVersion: v.number(),
  inviteOpen: v.boolean(),
  inviteExpiresAt: v.number(),
  createdAt: v.number(),
  generationError: v.optional(v.string()),
  helperBusy: v.optional(v.boolean()),
  helperError: v.optional(v.string()),
  checkedIngredientIds: v.array(v.string()),
});
const publicStepValidator = v.object({
  stepKey: v.string(),
  status: stepStatusValidator,
  slots: v.array(v.number()),
  readyMemberIds: v.array(v.id("cookingMembers")),
  checkedIds: v.array(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  completedBy: v.optional(v.id("cookingMembers")),
  imageUrl: v.optional(v.string()),
  imageStatus: v.optional(imageStatusValidator),
  imageError: v.optional(v.string()),
});
const publicTimerValidator = v.object({
  _id: v.id("cookingTimers"),
  stepKey: v.string(),
  timerKey: v.string(),
  label: v.string(),
  status: timerStatusValidator,
  durationMs: v.number(),
  deadline: v.optional(v.number()),
  remainingMs: v.optional(v.number()),
  version: v.number(),
  startedBy: v.optional(v.id("cookingMembers")),
});

export const read = query({
  args: { roomId: v.string(), participantToken: tokenValidator },
  returns: v.union(
    v.null(),
    v.object({
      serverNow: v.number(),
      room: publicRoomValidator,
      me: publicMemberValidator,
      members: v.array(publicMemberValidator),
      steps: v.array(publicStepValidator),
      timers: v.array(publicTimerValidator),
    }),
  ),
  handler: async (ctx, { roomId: requestedRoomId, participantToken }) => {
    const roomId = ctx.db.normalizeId("cookingRooms", requestedRoomId);
    if (!roomId) return null;
    const member = await activeMember(ctx, roomId, participantToken);
    const room = await ctx.db.get(roomId);
    if (!member || !room) return null;
    const [members, steps, timers] = await Promise.all([
      ctx.db
        .query("cookingMembers")
        .withIndex("by_room_status", (q) => q.eq("roomId", roomId).eq("status", "active"))
        .take(ROOM_MEMBER_LIMIT),
      ctx.db
        .query("cookingSteps")
        .withIndex("by_room_step", (q) => q.eq("roomId", roomId))
        .take(80),
      ctx.db
        .query("cookingTimers")
        .withIndex("by_room_status", (q) => q.eq("roomId", roomId))
        .take(24),
    ]);
    return {
      serverNow: Date.now(),
      room: publicRoom(room),
      me: publicMember(member),
      members: members.map(publicMember),
      steps: await Promise.all(
        steps.map(
          async ({
            roomId: _roomId,
            imageAttempt: _imageAttempt,
            imageStorageId,
            _id,
            _creationTime,
            ...step
          }) => ({
            ...step,
            imageUrl: imageStorageId
              ? ((await ctx.storage.getUrl(imageStorageId)) ?? undefined)
              : undefined,
          }),
        ),
      ),
      timers: timers.map(({ roomId: _roomId, jobId: _jobId, _creationTime, ...timer }) => timer),
    };
  },
});

export const listOwned = query({
  args: SessionIdArg,
  returns: v.array(
    v.object({
      _id: v.id("cookingRooms"),
      source: v.object({ title: v.string() }),
      state: roomStateValidator,
      requestedServings: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);
    if (!user) return [];
    const rooms = await ctx.db
      .query("cookingRooms")
      .withIndex("by_host_created", (q) => q.eq("hostUserId", user._id))
      .order("desc")
      .take(20);
    return rooms.map((room) => ({
      _id: room._id,
      source: { title: room.source.title },
      state: room.state,
      requestedServings: room.requestedServings,
      createdAt: room.createdAt,
    }));
  },
});

export const create = mutation({
  args: {
    ...SessionIdArg,
    sourceIdeaId: v.id("ideas"),
    participantToken: tokenValidator,
    inviteToken: tokenValidator,
    name: v.string(),
    cookCount: v.number(),
    servings: v.number(),
    constraints: v.string(),
  },
  returns: v.union(v.null(), v.object({ roomId: v.id("cookingRooms") })),
  handler: async (ctx, args) => {
    validateCreate(args);
    const user = await findUser(ctx, args.sessionId);
    const idea = await ctx.db.get(args.sourceIdeaId);
    if (!user || !idea || idea.userId !== user._id || idea.pending) return null;
    return createRoom(
      ctx,
      user._id,
      idea._id,
      {
        title: idea.title,
        summary: idea.summary,
        body: idea.body,
        ingredients: idea.ingredients,
        servings: idea.servings,
      },
      args,
    );
  },
});

export const join = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    inviteToken: tokenValidator,
    participantToken: tokenValidator,
    name: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({ memberId: v.id("cookingMembers"), slots: v.array(v.number()) }),
  ),
  handler: async (ctx, args) => {
    validateToken(args.participantToken);
    const name = args.name.trim();
    if (!name || name.length > 80) throw new ConvexError("Вкажіть ім’я до 80 символів.");
    const room = await ctx.db.get(args.roomId);
    const now = Date.now();
    if (
      !room ||
      room.state === "done" ||
      !room.inviteOpen ||
      room.inviteExpiresAt <= now ||
      (await hashSecret(args.inviteToken)) !== room.inviteHash
    )
      return null;
    const tokenHash = await hashSecret(args.participantToken);
    const existing = await ctx.db
      .query("cookingMembers")
      .withIndex("by_room_tokenHash", (q) => q.eq("roomId", args.roomId).eq("tokenHash", tokenHash))
      .unique();
    if (existing?.status === "active") return { memberId: existing._id, slots: existing.slots };
    if (existing) return null;
    const active = await ctx.db
      .query("cookingMembers")
      .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .take(ROOM_MEMBER_LIMIT);
    if (active.length >= room.cookCount) throw new ConvexError("У кухні вже всі місця зайняті.");
    const occupied = new Set(active.flatMap((member) => member.slots));
    const slot = Array.from({ length: room.cookCount }, (_, index) => index + 1).find(
      (item) => !occupied.has(item),
    );
    if (!slot) throw new ConvexError("Вільного місця не знайдено.");
    const memberId = await ctx.db.insert("cookingMembers", {
      roomId: args.roomId,
      tokenHash,
      name,
      role: "cook",
      status: "active",
      slots: [slot],
      lastSeenAt: now,
    });
    return { memberId, slots: [slot] };
  },
});

export const heartbeat = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await activeMember(ctx, args.roomId, args.participantToken);
    if (!member) return false;
    await ctx.db.patch(member._id, { lastSeenAt: Date.now() });
    return true;
  },
});

export const recoverHost = mutation({
  args: { ...SessionIdArg, roomId: v.id("cookingRooms"), newParticipantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    validateToken(args.newParticipantToken);
    const [user, room] = await Promise.all([
      findUser(ctx, args.sessionId),
      ctx.db.get(args.roomId),
    ]);
    if (!user || !room || room.hostUserId !== user._id) return false;
    if (!room.ownerMemberId) return false;
    const host = await ctx.db.get(room.ownerMemberId);
    if (!host || host.roomId !== room._id || host.status !== "active" || host.role !== "host")
      return false;
    const tokenHash = await hashSecret(args.newParticipantToken);
    const existing = await ctx.db
      .query("cookingMembers")
      .withIndex("by_room_tokenHash", (q) => q.eq("roomId", room._id).eq("tokenHash", tokenHash))
      .unique();
    if (existing && existing._id !== host._id) return false;
    await ctx.db.patch(host._id, {
      tokenHash,
      lastSeenAt: Date.now(),
    });
    return true;
  },
});

export const rotateInvite = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    inviteToken: tokenValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    validateToken(args.inviteToken);
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    requireHost(member);
    const room = await ctx.db.get(args.roomId);
    if (!room || room.state === "done") return false;
    await ctx.db.patch(args.roomId, {
      inviteHash: await hashSecret(args.inviteToken),
      inviteOpen: true,
      inviteExpiresAt: Date.now() + INVITE_LIFETIME_MS,
    });
    return true;
  },
});

export const closeInvite = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireHost(await requireActiveMember(ctx, args.roomId, args.participantToken));
    await ctx.db.patch(args.roomId, { inviteOpen: false });
    return true;
  },
});

export const removeMember = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    memberId: v.id("cookingMembers"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireHost(await requireActiveMember(ctx, args.roomId, args.participantToken));
    const target = await ctx.db.get(args.memberId);
    if (
      !target ||
      target.roomId !== args.roomId ||
      target.role === "host" ||
      target.status !== "active"
    )
      return false;
    await ctx.db.patch(target._id, { status: "removed", slots: [] });
    await ctx.db.patch(args.roomId, { inviteOpen: false });
    return true;
  },
});

export const transferHost = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    memberId: v.id("cookingMembers"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const host = await requireActiveMember(ctx, args.roomId, args.participantToken);
    requireHost(host);
    const target = await ctx.db.get(args.memberId);
    if (
      !target ||
      target.roomId !== args.roomId ||
      target.status !== "active" ||
      target.role === "host"
    )
      return false;
    await ctx.db.patch(host._id, { role: "cook" });
    await ctx.db.patch(target._id, { role: "host" });
    return true;
  },
});

export const leave = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    if (member.role === "host")
      throw new ConvexError("Перед виходом передай керування іншому кухарю.");
    await ctx.db.patch(member._id, { status: "left", slots: [] });
    return true;
  },
});

export const continueAlone = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room) return false;
    const others = await ctx.db
      .query("cookingMembers")
      .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .take(ROOM_MEMBER_LIMIT);
    for (const other of others)
      if (other._id !== member._id) await ctx.db.patch(other._id, { slots: [] });
    const slots = Array.from({ length: room.cookCount }, (_, index) => index + 1);
    await ctx.db.patch(member._id, { slots });
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    await resetUnstartedReadiness(ctx, steps, new Set(slots));
    await ctx.db.patch(args.roomId, { inviteOpen: false });
    return true;
  },
});

export const startSession = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireHost(await requireActiveMember(ctx, args.roomId, args.participantToken));
    const room = await ctx.db.get(args.roomId);
    if (!room || room.state !== "ready") return false;
    await ctx.db.patch(args.roomId, { state: "cooking" });
    return true;
  },
});

export const finish = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room?.plan || room.state !== "cooking") return false;
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    if (steps.length !== room.plan.steps.length || steps.some((step) => step.status !== "done"))
      throw new ConvexError("Спершу завершіть усі кроки.");
    await ctx.db.patch(args.roomId, { state: "done", inviteOpen: false });
    return true;
  },
});

export const retryGeneration = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireHost(await requireActiveMember(ctx, args.roomId, args.participantToken));
    const room = await ctx.db.get(args.roomId);
    if (!room || room.state !== "error" || Date.now() - room.createdAt < RETRY_COOLDOWN_MS)
      return false;
    if (
      !(await admitAiGeneration({
        limit: (name, options) =>
          rateLimiter.limit(ctx, name, { ...options, key: room.hostUserId }),
      }))
    ) {
      throw new ConvexError("Ліміт створення планів на сьогодні вичерпано.");
    }
    const attempt = crypto.randomUUID();
    await ctx.db.patch(args.roomId, {
      state: "generating",
      generationAttempt: attempt,
      generationError: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.cookingGeneration.generate, {
      roomId: args.roomId,
      attempt,
    });
    await ctx.scheduler.runAfter(9 * 60_000, internal.cookingRooms.failGeneration, {
      roomId: args.roomId,
      attempt,
      message: "Не вдалося вчасно створити план. Спробуйте ще раз.",
    });
    return true;
  },
});

export const generationData = internalQuery({
  args: { roomId: v.id("cookingRooms") },
  returns: v.union(
    v.null(),
    v.object({
      hostUserId: v.id("users"),
      source: v.object({
        title: v.string(),
        summary: v.string(),
        body: v.string(),
        ingredients: v.array(v.object({ name: v.string(), amount: v.optional(v.string()) })),
        servings: v.number(),
      }),
      cookCount: v.number(),
      requestedServings: v.number(),
      constraints: v.string(),
      attempt: v.string(),
    }),
  ),
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    return room?.state === "generating"
      ? {
          hostUserId: room.hostUserId,
          source: room.source,
          cookCount: room.cookCount,
          requestedServings: room.requestedServings,
          constraints: room.constraints,
          attempt: room.generationAttempt,
        }
      : null;
  },
});

export const savePlan = internalMutation({
  args: { roomId: v.id("cookingRooms"), attempt: v.string(), plan: cookingPlanValidator },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.generationAttempt !== args.attempt || room.state !== "generating")
      return false;
    let plan = validateCookingPlan(args.plan, room.cookCount);
    if (plan.servings !== room.requestedServings)
      throw new ConvexError("Кількість порцій у плані не відповідає вибраній.");
    if (room.cookCount === 1) plan = normalizeSoloPlan(plan);
    if (plan.steps.reduce((count, step) => count + step.timers.length, 0) > 24)
      throw new ConvexError("План містить забагато таймерів.");
    const existing = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    if (existing.length > 0) return false;
    await ctx.db.patch(args.roomId, {
      plan,
      planVersion: room.planVersion + 1,
      state: "ready",
      generationError: undefined,
    });
    let referenceCount = 0;
    for (const step of plan.steps) {
      const shouldGenerateReference = Boolean(step.reference && referenceCount < 6);
      if (shouldGenerateReference) referenceCount += 1;
      await ctx.db.insert("cookingSteps", {
        roomId: args.roomId,
        stepKey: step.id,
        status: "pending",
        slots: step.slots,
        readyMemberIds: [],
        checkedIds: [],
        imageStatus: shouldGenerateReference ? "pending" : undefined,
        imageAttempt: shouldGenerateReference ? args.attempt : undefined,
      });
      if (shouldGenerateReference) {
        await ctx.scheduler.runAfter(0, internal.cookingGeneration.generateReference, {
          roomId: args.roomId,
          stepKey: step.id,
          attempt: args.attempt,
        });
        await ctx.scheduler.runAfter(45_000, internal.cookingRooms.imageResult, {
          roomId: args.roomId,
          stepKey: step.id,
          attempt: args.attempt,
          message: "Не вдалося вчасно створити зображення.",
        });
      }
      for (const timer of step.timers) {
        await ctx.db.insert("cookingTimers", {
          roomId: args.roomId,
          stepKey: step.id,
          timerKey: timer.id,
          label: timer.label,
          status: "ready",
          durationMs: timer.durationSeconds * 1000,
          version: 1,
        });
      }
    }
    return true;
  },
});

export const failGeneration = internalMutation({
  args: { roomId: v.id("cookingRooms"), attempt: v.string(), message: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.generationAttempt !== args.attempt || room.state !== "generating")
      return false;
    await ctx.db.patch(args.roomId, {
      state: "error",
      generationError: args.message.slice(0, 500),
    });
    return true;
  },
});

export const imageResult = internalMutation({
  args: {
    roomId: v.id("cookingRooms"),
    stepKey: v.string(),
    attempt: v.string(),
    storageId: v.optional(v.id("_storage")),
    message: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const step = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId).eq("stepKey", args.stepKey))
      .unique();
    if (!step || step.imageAttempt !== args.attempt || step.imageStatus !== "pending") {
      if (args.storageId && args.storageId !== step?.imageStorageId)
        await ctx.storage.delete(args.storageId);
      return false;
    }
    await ctx.db.patch(
      step._id,
      args.storageId
        ? { imageStorageId: args.storageId, imageStatus: "ready", imageError: undefined }
        : {
            imageStatus: "error",
            imageError: (args.message ?? "Не вдалося створити зображення.").slice(0, 500),
          },
    );
    return true;
  },
});

function validateToken(token: string): void {
  if (token.length < 32 || token.length > PARTICIPANT_TOKEN_MAX_LENGTH)
    throw new ConvexError("Недійсний ключ учасника.");
}
function validateCreate(args: {
  participantToken: string;
  inviteToken: string;
  name: string;
  cookCount: number;
  servings: number;
  constraints: string;
}): void {
  validateToken(args.participantToken);
  validateToken(args.inviteToken);
  if (!args.name.trim() || args.name.trim().length > 80)
    throw new ConvexError("Вкажіть ім’я до 80 символів.");
  if (!Number.isInteger(args.cookCount) || args.cookCount < 1 || args.cookCount > ROOM_MEMBER_LIMIT)
    throw new ConvexError("Кількість кухарів має бути від 1 до 12.");
  if (!Number.isInteger(args.servings) || args.servings < 1 || args.servings > 24)
    throw new ConvexError("Кількість порцій має бути від 1 до 24.");
  if (args.constraints.length > 1_200) throw new ConvexError("Обмеження задовгі.");
}

async function createRoom(
  ctx: MutationCtx,
  hostUserId: Id<"users">,
  sourceIdeaId: Id<"ideas">,
  source: Doc<"cookingRooms">["source"],
  args: {
    participantToken: string;
    inviteToken: string;
    name: string;
    cookCount: number;
    servings: number;
    constraints: string;
  },
): Promise<{ roomId: Id<"cookingRooms"> }> {
  if (
    !(await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: hostUserId }),
    }))
  ) {
    throw new ConvexError("Ліміт створення планів на сьогодні вичерпано.");
  }
  const now = Date.now();
  const attempt = crypto.randomUUID();
  const roomId = await ctx.db.insert("cookingRooms", {
    hostUserId,
    sourceIdeaId,
    source,
    cookCount: args.cookCount,
    requestedServings: args.servings,
    constraints: args.constraints.trim(),
    state: "generating",
    planVersion: 0,
    checkedIngredientIds: [],
    inviteHash: await hashSecret(args.inviteToken),
    inviteOpen: true,
    inviteExpiresAt: now + INVITE_LIFETIME_MS,
    createdAt: now,
    generationAttempt: attempt,
  });
  const ownerMemberId = await ctx.db.insert("cookingMembers", {
    roomId,
    tokenHash: await hashSecret(args.participantToken),
    name: args.name.trim(),
    role: "host",
    status: "active",
    slots: [1],
    lastSeenAt: now,
  });
  await ctx.db.patch(roomId, { ownerMemberId });
  await ctx.scheduler.runAfter(0, internal.cookingGeneration.generate, { roomId, attempt });
  await ctx.scheduler.runAfter(9 * 60_000, internal.cookingRooms.failGeneration, {
    roomId,
    attempt,
    message: "Не вдалося вчасно створити план. Спробуйте ще раз.",
  });
  return { roomId };
}

export const cookAgain = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    newParticipantToken: tokenValidator,
    inviteToken: tokenValidator,
    name: v.string(),
    cookCount: v.number(),
    servings: v.number(),
    constraints: v.string(),
  },
  returns: v.union(v.null(), v.object({ roomId: v.id("cookingRooms") })),
  handler: async (ctx, args): Promise<{ roomId: Id<"cookingRooms"> } | null> => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const setup = { ...args, participantToken: args.newParticipantToken };
    validateCreate(setup);
    return createRoom(ctx, room.hostUserId, room.sourceIdeaId, room.source, setup);
  },
});
