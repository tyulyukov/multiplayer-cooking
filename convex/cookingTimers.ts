import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { requireActiveMember } from "./lib/cooking_access";

const tokenValidator = v.string();
const MAX_TIMERS = 24;
const MAX_MANUAL_SECONDS = 7 * 24 * 60 * 60;

export const createManual = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
    label: v.string(),
    seconds: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { member, step } = await requireTimerAccess(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
    );
    if (!member || !step || !validManual(args)) return false;
    const timers = await ctx.db
      .query("cookingTimers")
      .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId))
      .take(24);
    if (timers.length >= MAX_TIMERS) throw new ConvexError("У цій сесії вже є 24 активні таймери.");
    const existing = await ctx.db
      .query("cookingTimers")
      .withIndex("by_room_step_key", (q) =>
        q.eq("roomId", args.roomId).eq("stepKey", args.stepKey).eq("timerKey", args.timerKey),
      )
      .unique();
    if (existing) return false;
    await ctx.db.insert("cookingTimers", {
      roomId: args.roomId,
      stepKey: args.stepKey,
      timerKey: args.timerKey,
      label: args.label.trim(),
      status: "ready",
      durationMs: args.seconds * 1000,
      version: 1,
    });
    return true;
  },
});

export const start = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { member, timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!member || !timer || !["ready", "paused"].includes(timer.status)) return false;
    const now = Date.now();
    const remainingMs =
      timer.status === "paused" ? (timer.remainingMs ?? timer.durationMs) : timer.durationMs;
    const version = timer.version + 1;
    const deadline = now + remainingMs;
    const jobId = await ctx.scheduler.runAt(deadline, internal.cookingTimers.expire, {
      timerId: timer._id,
      version,
      deadline,
    });
    await ctx.db.patch(timer._id, {
      status: "running",
      remainingMs: undefined,
      deadline,
      version,
      startedBy: member._id,
      jobId,
    });
    return true;
  },
});

export const pause = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!timer || timer.status !== "running" || !timer.deadline) return false;
    const remainingMs = Math.max(0, timer.deadline - Date.now());
    await ctx.db.patch(timer._id, {
      status: "paused",
      deadline: undefined,
      remainingMs,
      version: timer.version + 1,
      jobId: undefined,
    });
    return true;
  },
});

export const resume = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { member, timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!member || !timer || timer.status !== "paused") return false;
    const remainingMs = timer.remainingMs ?? timer.durationMs;
    const version = timer.version + 1;
    const deadline = Date.now() + remainingMs;
    const jobId = await ctx.scheduler.runAt(deadline, internal.cookingTimers.expire, {
      timerId: timer._id,
      version,
      deadline,
    });
    await ctx.db.patch(timer._id, {
      status: "running",
      remainingMs: undefined,
      deadline,
      version,
      startedBy: member._id,
      jobId,
    });
    return true;
  },
});

export const addTime = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
    seconds: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.seconds) || args.seconds < 1 || args.seconds > MAX_MANUAL_SECONDS)
      return false;
    const { timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!timer || ["cancelled", "acknowledged"].includes(timer.status)) return false;
    const addition = args.seconds * 1000;
    if (timer.durationMs + addition > MAX_MANUAL_SECONDS * 1000)
      throw new ConvexError("Таймер не може тривати понад 7 днів.");
    if (timer.status === "running" && timer.deadline) {
      const deadline = timer.deadline + addition;
      const version = timer.version + 1;
      const jobId = await ctx.scheduler.runAt(deadline, internal.cookingTimers.expire, {
        timerId: timer._id,
        version,
        deadline,
      });
      await ctx.db.patch(timer._id, {
        durationMs: timer.durationMs + addition,
        deadline,
        version,
        jobId,
      });
    } else {
      await ctx.db.patch(timer._id, {
        status: timer.status === "fired" ? "paused" : timer.status,
        durationMs: timer.durationMs + addition,
        remainingMs: (timer.remainingMs ?? timer.durationMs) + addition,
        version: timer.version + 1,
      });
    }
    return true;
  },
});

export const cancel = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!timer || ["cancelled", "acknowledged"].includes(timer.status)) return false;
    await ctx.db.patch(timer._id, {
      status: "cancelled",
      deadline: undefined,
      remainingMs: undefined,
      version: timer.version + 1,
      jobId: undefined,
    });
    return true;
  },
});

export const acknowledge = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    timerKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { timer } = await loadTimer(
      ctx,
      args.roomId,
      args.participantToken,
      args.stepKey,
      args.timerKey,
    );
    if (!timer || timer.status !== "fired") return false;
    await ctx.db.patch(timer._id, {
      status: "acknowledged",
      deadline: undefined,
      remainingMs: undefined,
      version: timer.version + 1,
      jobId: undefined,
    });
    return true;
  },
});

export const expire = internalMutation({
  args: { timerId: v.id("cookingTimers"), version: v.number(), deadline: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (
      !timer ||
      timer.status !== "running" ||
      timer.version !== args.version ||
      timer.deadline !== args.deadline ||
      Date.now() < args.deadline
    )
      return false;
    await ctx.db.patch(timer._id, { status: "fired", remainingMs: 0, jobId: undefined });
    return true;
  },
});

async function requireTimerAccess(
  ctx: MutationCtx,
  roomId: Parameters<typeof requireActiveMember>[1],
  participantToken: string,
  stepKey: string,
) {
  const [member, step, room] = await Promise.all([
    requireActiveMember(ctx, roomId, participantToken),
    ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId).eq("stepKey", stepKey))
      .unique(),
    ctx.db.get(roomId),
  ]);
  if (room?.state !== "cooking" || !step?.startedAt || step.status === "done")
    throw new ConvexError("Спершу почни цей крок.");
  if (!step || (member.role !== "host" && !member.slots.some((slot) => step.slots.includes(slot))))
    throw new ConvexError("Таймер цього кроку недоступний.");
  return { member, step };
}

async function loadTimer(
  ctx: MutationCtx,
  roomId: Parameters<typeof requireActiveMember>[1],
  participantToken: string,
  stepKey: string,
  timerKey: string,
) {
  const { member } = await requireTimerAccess(ctx, roomId, participantToken, stepKey);
  const timer = await ctx.db
    .query("cookingTimers")
    .withIndex("by_room_step_key", (q) =>
      q.eq("roomId", roomId).eq("stepKey", stepKey).eq("timerKey", timerKey),
    )
    .unique();
  return { member, timer };
}

function validManual(args: { timerKey: string; label: string; seconds: number }): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(args.timerKey) &&
    Boolean(args.label.trim()) &&
    args.label.trim().length <= 140 &&
    Number.isInteger(args.seconds) &&
    args.seconds >= 1 &&
    args.seconds <= MAX_MANUAL_SECONDS
  );
}
