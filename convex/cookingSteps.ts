import { resetUnstartedReadiness } from "./lib/cooking_readiness";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireActiveMember, ROOM_MEMBER_LIMIT } from "./lib/cooking_access";

const tokenValidator = v.string();

export const wait = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, stepKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (
      !loaded ||
      loaded.room.state !== "cooking" ||
      loaded.runtime.status !== "active" ||
      !loaded.planStep.canWait ||
      loaded.planStep.kind !== "task"
    )
      return false;
    if (!member.slots.some((slot) => loaded.runtime.slots.includes(slot)))
      throw new ConvexError("Цей крок призначено іншому кухарю.");
    await ctx.db.patch(loaded.runtime._id, { status: "waiting" });
    return true;
  },
});

export const start = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, stepKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (
      !loaded ||
      loaded.room.state !== "cooking" ||
      !["pending", "waiting"].includes(loaded.runtime.status)
    )
      return false;
    if (!loaded.planStep.dependsOn.every((key) => loaded.stepsByKey.get(key)?.status === "done"))
      throw new ConvexError("Спершу завершіть залежні кроки.");
    if (!member.slots.some((slot) => loaded.runtime.slots.includes(slot)))
      throw new ConvexError("Цей крок призначено іншому кухарю.");
    if (loaded.planStep.kind === "together") return markReadyForTogether(ctx, loaded, member._id);
    if (loaded.planStep.kind === "handoff" && !member.slots.includes(loaded.runtime.slots[0]!))
      throw new ConvexError("Передачу починає кухар, який виконує першу частину.");
    ensureResources(loaded, member);
    await ctx.db.patch(loaded.runtime._id, { status: "active", startedAt: Date.now() });
    return true;
  },
});

export const markReady = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, stepKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (!loaded) return false;
    if (!member.slots.some((slot) => loaded.runtime.slots.includes(slot)))
      throw new ConvexError("Цей крок призначено іншому кухарю.");
    if (loaded.planStep.kind === "together") return markReadyForTogether(ctx, loaded, member._id);
    if (loaded.planStep.kind !== "handoff" || loaded.runtime.status !== "active") return false;
    if (!member.slots.includes(loaded.runtime.slots[0]!))
      throw new ConvexError("Передачу підтверджує кухар, який її розпочав.");
    await ctx.db.patch(loaded.runtime._id, { status: "waiting", readyMemberIds: [member._id] });
    return true;
  },
});

export const complete = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    confirmed: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (
      !loaded ||
      loaded.room.state !== "cooking" ||
      !loaded.runtime.startedAt ||
      !["active", "waiting"].includes(loaded.runtime.status)
    )
      return false;
    if (!member.slots.some((slot) => loaded.runtime.slots.includes(slot)))
      throw new ConvexError("Цей крок призначено іншому кухарю.");
    if (loaded.planStep.kind === "handoff") {
      if (loaded.runtime.status !== "waiting" || !member.slots.includes(loaded.runtime.slots[1]!))
        throw new ConvexError("Отримувач має підтвердити передачу.");
    }
    if (loaded.planStep.checklist.some((item) => !loaded.runtime.checkedIds.includes(item.id)))
      throw new ConvexError("Позначте всі пункти цього кроку.");
    if (loaded.planStep.confirmation && !args.confirmed)
      throw new ConvexError("Потрібне підтвердження результату.");
    const timers = await ctx.db
      .query("cookingTimers")
      .withIndex("by_room_step_key", (q) => q.eq("roomId", args.roomId).eq("stepKey", args.stepKey))
      .take(24);
    if (timers.some((timer) => ["running", "paused"].includes(timer.status)))
      throw new ConvexError("Спершу завершіть, скасуйте або дочекайтеся таймера.");
    for (const timer of timers) {
      if (timer.status === "fired") {
        await ctx.db.patch(timer._id, {
          status: "acknowledged",
          deadline: undefined,
          remainingMs: undefined,
          version: timer.version + 1,
          jobId: undefined,
        });
      }
    }
    await ctx.db.patch(loaded.runtime._id, {
      status: "done",
      completedAt: Date.now(),
      completedBy: member._id,
    });
    return true;
  },
});

export const undo = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, stepKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (!loaded || loaded.room.state !== "cooking" || loaded.runtime.status !== "done")
      return false;
    if (loaded.runtime.completedBy !== member._id && member.role !== "host")
      throw new ConvexError("Скасувати може лише виконавець або господар.");
    const descendantsStarted = loaded.plan.steps.some(
      (step) =>
        step.dependsOn.includes(args.stepKey) &&
        ["active", "waiting", "done"].includes(loaded.stepsByKey.get(step.id)?.status ?? "pending"),
    );
    if (descendantsStarted) throw new ConvexError("Залежний крок уже почався.");
    await ctx.db.patch(loaded.runtime._id, {
      status: "pending",
      checkedIds: [],
      readyMemberIds: [],
      startedAt: undefined,
      completedAt: undefined,
      completedBy: undefined,
    });
    return true;
  },
});

export const takeover = mutation({
  args: { roomId: v.id("cookingRooms"), participantToken: tokenValidator, slot: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (!room || !Number.isInteger(args.slot) || args.slot < 1 || args.slot > room.cookCount)
      return false;
    if (member.slots.includes(args.slot)) return true;
    const active = await ctx.db
      .query("cookingMembers")
      .withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .take(ROOM_MEMBER_LIMIT);
    if (active.some((other) => other._id !== member._id && other.slots.includes(args.slot)))
      throw new ConvexError("Це місце ще зайняте іншим кухарем.");
    if (member.slots.includes(args.slot)) return false;
    await ctx.db.patch(member._id, { slots: [...member.slots, args.slot].sort((a, b) => a - b) });
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    await resetUnstartedReadiness(ctx, steps, new Set([args.slot]));
    return true;
  },
});

export const swapRoles = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    memberId: v.id("cookingMembers"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const [other, room] = await Promise.all([ctx.db.get(args.memberId), ctx.db.get(args.roomId)]);
    if (
      !room ||
      room.state === "done" ||
      !other ||
      other.roomId !== args.roomId ||
      other.status !== "active" ||
      other._id === member._id
    )
      return false;
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", args.roomId))
      .take(80);
    const slots = new Set([...member.slots, ...other.slots]);
    if (
      steps.some(
        (step) =>
          step.startedAt && step.status !== "done" && step.slots.some((slot) => slots.has(slot)),
      )
    )
      throw new ConvexError("Завершіть почату роботу перед обміном ролями.");
    await ctx.db.patch(member._id, { slots: other.slots });
    await ctx.db.patch(other._id, { slots: member.slots });
    await resetUnstartedReadiness(ctx, steps, slots);
    return true;
  },
});

export const toggleChecklist = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    stepKey: v.string(),
    itemId: v.string(),
    checked: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.roomId, args.participantToken);
    const loaded = await loadStep(ctx, args.roomId, args.stepKey);
    if (
      !loaded ||
      loaded.room.state !== "cooking" ||
      loaded.runtime.status === "done" ||
      !member.slots.some((slot) => loaded.runtime.slots.includes(slot))
    )
      return false;
    if (!loaded.planStep.checklist.some((item) => item.id === args.itemId)) return false;
    const checkedIds = args.checked
      ? [...new Set([...loaded.runtime.checkedIds, args.itemId])]
      : loaded.runtime.checkedIds.filter((item) => item !== args.itemId);
    await ctx.db.patch(loaded.runtime._id, { checkedIds });
    return true;
  },
});

export const toggleIngredient = mutation({
  args: {
    roomId: v.id("cookingRooms"),
    participantToken: tokenValidator,
    ingredientId: v.string(),
    checked: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.roomId, args.participantToken);
    const room = await ctx.db.get(args.roomId);
    if (room?.state === "done") return false;
    if (!room?.plan?.ingredients.some((ingredient) => ingredient.id === args.ingredientId))
      return false;
    const checkedIngredientIds = args.checked
      ? [...new Set([...room.checkedIngredientIds, args.ingredientId])].slice(0, 200)
      : room.checkedIngredientIds.filter((id) => id !== args.ingredientId);
    await ctx.db.patch(args.roomId, { checkedIngredientIds });
    return true;
  },
});

async function markReadyForTogether(
  ctx: MutationCtx,
  loaded: NonNullable<Awaited<ReturnType<typeof loadStep>>>,
  memberId: Doc<"cookingMembers">["_id"],
): Promise<boolean> {
  const { runtime } = loaded;
  if (loaded.room.state !== "cooking") return false;
  if (!["pending", "waiting"].includes(runtime.status)) return runtime.status === "active";
  if (!loaded.planStep.dependsOn.every((key) => loaded.stepsByKey.get(key)?.status === "done"))
    throw new ConvexError("Спершу завершіть залежні кроки.");
  const readyMemberIds = [...new Set([...runtime.readyMemberIds, memberId])];
  const members = await ctx.db
    .query("cookingMembers")
    .withIndex("by_room_status", (q) => q.eq("roomId", runtime.roomId).eq("status", "active"))
    .take(ROOM_MEMBER_LIMIT);
  const assigned = members.filter((member) =>
    member.slots.some((slot) => runtime.slots.includes(slot)),
  );
  if (!runtime.slots.every((slot) => assigned.some((member) => member.slots.includes(slot))))
    throw new ConvexError("Для спільного кроку потрібні всі призначені кухарі.");
  if (assigned.every((assignedMember) => readyMemberIds.includes(assignedMember._id))) {
    for (const assignedMember of assigned) ensureResources(loaded, assignedMember);
    await ctx.db.patch(runtime._id, { status: "active", readyMemberIds, startedAt: Date.now() });
  } else {
    await ctx.db.patch(runtime._id, { status: "waiting", readyMemberIds });
  }
  return true;
}

async function loadStep(ctx: MutationCtx, roomId: Doc<"cookingRooms">["_id"], stepKey: string) {
  const [room, runtime, runtimes] = await Promise.all([
    ctx.db.get(roomId),
    ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId).eq("stepKey", stepKey))
      .unique(),
    ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId))
      .take(80),
  ]);
  if (!room?.plan || !runtime) return null;
  const planStep = room.plan.steps.find((step) => step.id === stepKey);
  if (!planStep) return null;
  return {
    room,
    runtime,
    plan: room.plan,
    planStep,
    stepsByKey: new Map(runtimes.map((step) => [step.stepKey, step])),
  };
}

function ensureResources(
  loaded: NonNullable<Awaited<ReturnType<typeof loadStep>>>,
  member: Doc<"cookingMembers">,
): void {
  if (loaded.planStep.activeMinutes > 0) {
    for (const runtime of loaded.stepsByKey.values()) {
      const other = loaded.plan.steps.find((step) => step.id === runtime.stepKey);
      if (
        runtime._id !== loaded.runtime._id &&
        runtime.status === "active" &&
        other &&
        other.activeMinutes > 0 &&
        other.slots.some((slot) => member.slots.includes(slot))
      )
        throw new ConvexError("Спершу завершіть активний крок, що потребує вашої уваги.");
    }
  }
  for (const equipmentId of loaded.planStep.equipment) {
    const capacity = loaded.plan.equipment.find((item) => item.id === equipmentId)?.capacity ?? 0;
    const inUse = [...loaded.stepsByKey.values()].filter((runtime) => {
      const other = loaded.plan.steps.find((step) => step.id === runtime.stepKey);
      return (
        runtime._id !== loaded.runtime._id &&
        Boolean(runtime.startedAt) &&
        ["active", "waiting"].includes(runtime.status) &&
        other?.equipment.includes(equipmentId)
      );
    }).length;
    if (inUse >= capacity) throw new ConvexError("Потрібне обладнання зараз зайняте.");
  }
}
