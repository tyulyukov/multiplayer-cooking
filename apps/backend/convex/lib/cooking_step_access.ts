import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function loadStep(
  ctx: MutationCtx,
  roomId: Doc<"cookingRooms">["_id"],
  stepKey: string,
) {
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

export function ensureResources(
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

export async function ensureStepStarted(
  ctx: MutationCtx,
  member: Doc<"cookingMembers">,
  roomId: Doc<"cookingRooms">["_id"],
  stepKey: string,
) {
  const loaded = await loadStep(ctx, roomId, stepKey);
  if (!loaded || loaded.room.state !== "cooking" || loaded.runtime.status === "done")
    throw new ConvexError("Цей крок зараз недоступний.");
  if (!member.slots.some((slot) => loaded.runtime.slots.includes(slot)))
    throw new ConvexError("Цей крок призначено іншому кухарю.");
  if (loaded.runtime.startedAt) return loaded;
  if (!loaded.planStep.dependsOn.every((key) => loaded.stepsByKey.get(key)?.status === "done"))
    throw new ConvexError("Спершу завершіть залежні кроки.");
  if (loaded.planStep.kind === "together")
    throw new ConvexError("Спершу всі кухарі мають підтвердити готовність.");
  if (loaded.planStep.kind === "handoff" && !member.slots.includes(loaded.runtime.slots[0]!))
    throw new ConvexError("Передачу починає кухар, який виконує першу частину.");
  ensureResources(loaded, member);
  const startedAt = Date.now();
  await ctx.db.patch(loaded.runtime._id, { status: "active", startedAt });
  return { ...loaded, runtime: { ...loaded.runtime, status: "active" as const, startedAt } };
}
