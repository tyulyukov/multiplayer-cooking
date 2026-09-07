import { expect, spyOn, test } from "bun:test";
import rateLimiterSchema from "../node_modules/@convex-dev/rate-limiter/dist/component/schema.js";
import type { SessionId } from "convex-helpers/server/sessions";

import { api, internal } from "./_generated/api";
import { cookingFixture, task } from "../tests/cooking-fixture";
import { validateCookingPlan } from "./lib/cooking_plan";

const newHostToken = "next-host-".padEnd(40, "d");
const newInviteToken = "next-invite-".padEnd(40, "e");

function registerRateLimiter(t: Awaited<ReturnType<typeof cookingFixture>>["t"]) {
  t.registerComponent("rateLimiter", rateLimiterSchema, {
    "./component/_generated/server.ts": () =>
      import("../node_modules/@convex-dev/rate-limiter/dist/component/_generated/server.js"),
    "./component/lib.ts": () =>
      import("../node_modules/@convex-dev/rate-limiter/dist/component/lib.js"),
  });
}

async function withoutScheduledCallbacks<T>(run: () => Promise<T>): Promise<T> {
  const setTimeoutBefore = globalThis.setTimeout;
  const suppressedTimeout = Object.assign((...args: Parameters<typeof setTimeout>) => {
    const timer = setTimeoutBefore(...args);
    clearTimeout(timer);
    return timer;
  }, setTimeoutBefore);
  const timerSpy = spyOn(globalThis, "setTimeout").mockImplementation(suppressedTimeout);
  try {
    return await run();
  } finally {
    timerSpy.mockRestore();
  }
}

async function prepareGeneration(
  fixture: Awaited<ReturnType<typeof cookingFixture>>,
  attempt = "attempt",
) {
  await fixture.t.run(async (ctx) => {
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", fixture.roomId))
      .collect();
    const timers = await ctx.db
      .query("cookingTimers")
      .withIndex("by_room_status", (q) => q.eq("roomId", fixture.roomId))
      .collect();
    for (const step of steps) await ctx.db.delete(step._id);
    for (const timer of timers) await ctx.db.delete(timer._id);
    await ctx.db.patch(fixture.roomId, {
      state: "generating",
      plan: undefined,
      planVersion: 0,
      generationAttempt: attempt,
    });
  });
}

test("savePlan persists one generated plan, normalizes solo work, and limits references to six", async () => {
  const fixture = await cookingFixture();
  await prepareGeneration(fixture);
  const referencePlan = validateCookingPlan(
    {
      ...fixture.plan,
      steps: Array.from({ length: 7 }, (_, index) =>
        task(`step-${index + 1}`, index % 2 === 0 ? 1 : 2, {
          reference: { prompt: `Покажи крок ${index + 1}.`, alt: `Крок ${index + 1}` },
        }),
      ),
    },
    2,
  );

  expect(
    await withoutScheduledCallbacks(() =>
      fixture.t.mutation(internal.cookingRooms.savePlan, {
        roomId: fixture.roomId,
        attempt: "attempt",
        plan: referencePlan,
      }),
    ),
  ).toBe(true);
  expect(
    await fixture.t.mutation(internal.cookingRooms.savePlan, {
      roomId: fixture.roomId,
      attempt: "attempt",
      plan: referencePlan,
    }),
  ).toBe(false);
  const saved = await fixture.t.query(api.cookingRooms.read, fixture.host);
  expect(saved?.room).toMatchObject({ state: "ready", planVersion: 1 });
  expect(saved?.steps).toHaveLength(7);
  expect(saved?.steps.filter((step) => step.imageStatus === "pending")).toHaveLength(6);
  expect(saved?.steps[6]?.imageStatus).toBeUndefined();

  const solo = await cookingFixture();
  await prepareGeneration(solo, "solo-attempt");
  await solo.t.run(async (ctx) => {
    await ctx.db.patch(solo.roomId, { cookCount: 1 });
  });
  const soloPlan = validateCookingPlan(
    { ...solo.plan, steps: [task("first", 1), task("second", 1)] },
    1,
  );
  expect(
    await solo.t.mutation(internal.cookingRooms.savePlan, {
      roomId: solo.roomId,
      attempt: "solo-attempt",
      plan: soloPlan,
    }),
  ).toBe(true);
  expect((await solo.t.query(api.cookingRooms.read, solo.host))?.room.plan?.steps).toMatchObject([
    { id: "first", slots: [1], dependsOn: [] },
    { id: "second", slots: [1], dependsOn: ["first"] },
  ]);
});

test("generation failures and image results only affect their current attempt", async () => {
  const fixture = await cookingFixture([
    task("reference", 1, {
      reference: { prompt: "Покажи консистенцію.", alt: "Консистенція" },
    }),
  ]);
  await prepareGeneration(fixture, "current");
  expect(
    await fixture.t.mutation(internal.cookingRooms.failGeneration, {
      roomId: fixture.roomId,
      attempt: "stale",
      message: "Пізня помилка",
    }),
  ).toBe(false);
  expect(
    await withoutScheduledCallbacks(() =>
      fixture.t.mutation(internal.cookingRooms.savePlan, {
        roomId: fixture.roomId,
        attempt: "current",
        plan: fixture.plan,
      }),
    ),
  ).toBe(true);
  const staleStorageId = await fixture.t.run((ctx) =>
    ctx.storage.store(new Blob(["stale cooking reference"])),
  );
  expect(
    await fixture.t.mutation(internal.cookingRooms.imageResult, {
      roomId: fixture.roomId,
      stepKey: "reference",
      attempt: "stale",
      storageId: staleStorageId,
      message: "Пізня помилка",
    }),
  ).toBe(false);
  expect(await fixture.t.run((ctx) => ctx.storage.get(staleStorageId))).toBeNull();
  expect(
    await fixture.t.mutation(internal.cookingRooms.imageResult, {
      roomId: fixture.roomId,
      stepKey: "reference",
      attempt: "current",
      message: "Не вдалося створити зображення.",
    }),
  ).toBe(true);
  expect((await fixture.t.query(api.cookingRooms.read, fixture.host))?.steps[0]).toMatchObject({
    imageStatus: "error",
    imageError: "Не вдалося створити зображення.",
  });
});

test("only an idea owner can create a room, and cook again starts fresh progress from authorized history", async () => {
  const fixture = await cookingFixture();
  registerRateLimiter(fixture.t);
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      sessionId: "owner-session",
      userId: fixture.userId,
      authVersion: 0,
    });
    const otherUserId = await ctx.db.insert("users", {});
    await ctx.db.insert("sessions", {
      sessionId: "other-session",
      userId: otherUserId,
      authVersion: 0,
    });
  });
  const sourceIdeaId = await fixture.t.run(async (ctx) => {
    const room = await ctx.db.get(fixture.roomId);
    if (!room) throw new Error("Missing fixture room");
    return room.sourceIdeaId;
  });
  expect(
    await withoutScheduledCallbacks(() =>
      fixture.t.mutation(api.cookingRooms.create, {
        sessionId: "other-session" as SessionId,
        sourceIdeaId,
        participantToken: newHostToken,
        inviteToken: newInviteToken,
        name: "Іван",
        cookCount: 1,
        servings: 2,
        constraints: "",
      }),
    ),
  ).toBeNull();
  const created = await withoutScheduledCallbacks(() =>
    fixture.t.mutation(api.cookingRooms.create, {
      sessionId: "owner-session" as SessionId,
      sourceIdeaId,
      participantToken: newHostToken,
      inviteToken: newInviteToken,
      name: "Іван",
      cookCount: 2,
      servings: 2,
      constraints: "  без перцю  ",
    }),
  );
  expect(created).not.toBeNull();
  const createdView = await fixture.t.query(api.cookingRooms.read, {
    roomId: created!.roomId,
    participantToken: newHostToken,
  });
  expect(createdView?.room).toMatchObject({
    state: "generating",
    planVersion: 0,
    constraints: "без перцю",
  });

  await fixture.t.mutation(api.cookingRooms.continueAlone, {
    roomId: created!.roomId,
    participantToken: newHostToken,
  });
  expect(
    (
      await fixture.t.query(api.cookingRooms.read, {
        roomId: created!.roomId,
        participantToken: newHostToken,
      })
    )?.me.slots,
  ).toEqual([1, 2]);

  await expect(
    withoutScheduledCallbacks(() =>
      fixture.t.mutation(api.cookingRooms.cookAgain, {
        ...fixture.guest,
        newParticipantToken: newHostToken,
        inviteToken: newInviteToken,
        name: "Іван",
        cookCount: 1,
        servings: 2,
        constraints: "",
      }),
    ),
  ).resolves.not.toBeNull();
  const again = await withoutScheduledCallbacks(() =>
    fixture.t.mutation(api.cookingRooms.cookAgain, {
      ...fixture.host,
      newParticipantToken: "again-".padEnd(40, "f"),
      inviteToken: "again-invite-".padEnd(40, "g"),
      name: "Оля",
      cookCount: 1,
      servings: 2,
      constraints: "",
    }),
  );
  expect(again).not.toBeNull();
  expect(
    (
      await fixture.t.query(api.cookingRooms.read, {
        roomId: again!.roomId,
        participantToken: "again-".padEnd(40, "f"),
      })
    )?.steps,
  ).toEqual([]);
});

test("session lifecycle guards starting, finishing, and retrying generation", async () => {
  const { t, host, guest, roomId } = await cookingFixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(roomId, { state: "ready" });
  });
  await expect(t.mutation(api.cookingRooms.startSession, guest)).rejects.toThrow("господар");
  expect(await t.mutation(api.cookingRooms.startSession, host)).toBe(true);
  await expect(t.mutation(api.cookingRooms.finish, host)).rejects.toThrow("завершіть усі кроки");
  await t.run(async (ctx) => {
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId))
      .collect();
    for (const step of steps) await ctx.db.patch(step._id, { status: "done" });
  });
  expect(await t.mutation(api.cookingRooms.finish, guest)).toBe(true);
  await expect(t.mutation(api.cookingRooms.retryGeneration, guest)).rejects.toThrow("господар");
  expect(await t.mutation(api.cookingRooms.retryGeneration, host)).toBe(false);
});
