import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { hashSecret } from "../convex/lib/cooking_access";
import { validateCookingPlan, type CookingStep } from "../convex/lib/cooking_plan";

export const hostToken = "host-".padEnd(40, "a");
export const guestToken = "guest-".padEnd(40, "b");
export const inviteToken = "invite-".padEnd(40, "c");

export function task(id: string, slot: number, patch: Partial<CookingStep> = {}): CookingStep {
  return {
    id,
    title: id,
    body: `Виконай ${id}.`,
    kind: "task",
    slots: [slot],
    dependsOn: [],
    activeMinutes: 2,
    equipment: [],
    checklist: [],
    timers: [],
    ...patch,
  };
}

export async function cookingFixture(
  steps: CookingStep[] = [task("prep", 1), task("sauce", 2, { dependsOn: ["prep"] })],
) {
  const t = convexTest(schema, {
    "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
    "../convex/cookingRooms.ts": () => import("../convex/cookingRooms"),
    "../convex/cookingSteps.ts": () => import("../convex/cookingSteps"),
    "../convex/cookingTimers.ts": () => import("../convex/cookingTimers"),
    "../convex/cookingAssistance.ts": () => import("../convex/cookingAssistance"),
  });
  const plan = validateCookingPlan(
    {
      servings: 2,
      summary: "Спільна вечеря",
      ingredients: [{ id: "tomato", name: "Помідор", amount: "2 шт." }],
      equipment: [{ id: "pan", name: "Сковорода", capacity: 1 }],
      steps,
    },
    2,
  );
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    const source = {
      title: "Томатна вечеря",
      summary: "Спільна вечеря",
      body: "Томати з соусом",
      ingredients: [{ name: "Помідор", amount: "2 шт." }],
      servings: 2,
    };
    const sourceIdeaId = await ctx.db.insert("ideas", {
      ...source,
      userId,
      threadId: "private-chat",
      promptMessageId: "private-prompt",
      timeMinutes: 20,
    });
    const roomId = await ctx.db.insert("cookingRooms", {
      hostUserId: userId,
      sourceIdeaId,
      source,
      cookCount: 2,
      requestedServings: 2,
      constraints: "",
      state: "cooking",
      plan,
      planVersion: 1,
      checkedIngredientIds: [],
      inviteHash: await hashSecret(inviteToken),
      inviteOpen: true,
      inviteExpiresAt: Date.now() + 100_000,
      createdAt: Date.now(),
      generationAttempt: "fixture",
    });
    const hostId = await ctx.db.insert("cookingMembers", {
      roomId,
      tokenHash: await hashSecret(hostToken),
      name: "Оля",
      role: "host",
      status: "active",
      slots: [1],
      lastSeenAt: Date.now(),
    });
    const guestId = await ctx.db.insert("cookingMembers", {
      roomId,
      tokenHash: await hashSecret(guestToken),
      name: "Аня",
      role: "cook",
      status: "active",
      slots: [2],
      lastSeenAt: Date.now(),
    });
    await ctx.db.patch(roomId, { ownerMemberId: hostId });
    for (const step of plan.steps) {
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
          durationMs: timer.durationSeconds * 1000,
          status: "ready",
          version: 1,
        });
    }
    return { roomId, hostId, guestId, userId };
  });
  return {
    t,
    plan,
    ...ids,
    host: { roomId: ids.roomId, participantToken: hostToken },
    guest: { roomId: ids.roomId, participantToken: guestToken },
  };
}
