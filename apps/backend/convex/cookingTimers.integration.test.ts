import { expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";

import { api, internal } from "./_generated/api";
import { cookingFixture, task } from "../tests/cooking-fixture";

const weekSeconds = 7 * 24 * 60 * 60;

function timerArgs(roomId: Id<"cookingRooms">, participantToken: string) {
  return { roomId, participantToken, stepKey: "boil", timerKey: "pasta" };
}

test("starting a timer starts its assigned pending step", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  expect(await t.mutation(api.cookingTimers.start, timerArgs(roomId, host.participantToken))).toBe(
    true,
  );
  expect((await t.query(api.cookingRooms.read, host))?.steps[0]).toMatchObject({
    stepKey: "boil",
    status: "active",
  });
});

test("creating a manual timer starts its assigned pending step", async () => {
  const { t, host, roomId } = await cookingFixture([task("boil", 1)]);
  expect(
    await t.mutation(api.cookingTimers.createManual, {
      ...timerArgs(roomId, host.participantToken),
      label: "Паста",
      seconds: 60,
    }),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))?.steps[0]).toMatchObject({
    stepKey: "boil",
    status: "active",
  });
});

test("adding time to a ready timer and cancelling it both start its pending step", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  const args = timerArgs(roomId, host.participantToken);

  expect(await t.mutation(api.cookingTimers.addTime, { ...args, seconds: 1 })).toBe(true);
  expect(await t.mutation(api.cookingTimers.cancel, args)).toBe(true);
  const room = (await t.query(api.cookingRooms.read, host))!;
  expect(room.steps[0]).toMatchObject({ status: "active" });
  expect(room.timers[0]).toMatchObject({
    status: "cancelled",
    durationMs: 61_000,
    remainingMs: 61_000,
  });
});

test("unknown, disallowed, invalid, and duplicate timer actions leave pending steps unchanged", async () => {
  const unknown = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  expect(
    await unknown.t.mutation(api.cookingTimers.start, {
      ...timerArgs(unknown.roomId, unknown.host.participantToken),
      timerKey: "missing",
    }),
  ).toBe(false);
  expect(
    await unknown.t.mutation(
      api.cookingTimers.restart,
      timerArgs(unknown.roomId, unknown.host.participantToken),
    ),
  ).toBe(false);
  expect((await unknown.t.query(api.cookingRooms.read, unknown.host))!.steps[0]).toMatchObject({
    status: "pending",
    checkedIds: [],
  });

  const invalid = await cookingFixture([task("boil", 1)]);
  expect(
    await invalid.t.mutation(api.cookingTimers.createManual, {
      ...timerArgs(invalid.roomId, invalid.host.participantToken),
      label: "Паста",
      seconds: 0,
    }),
  ).toBe(false);
  expect((await invalid.t.query(api.cookingRooms.read, invalid.host))!.steps[0]).toMatchObject({
    status: "pending",
  });

  const duplicate = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  expect(
    await duplicate.t.mutation(api.cookingTimers.createManual, {
      ...timerArgs(duplicate.roomId, duplicate.host.participantToken),
      label: "Ще паста",
      seconds: 60,
    }),
  ).toBe(false);
  expect((await duplicate.t.query(api.cookingRooms.read, duplicate.host))!.steps[0]).toMatchObject({
    status: "pending",
  });
});

test("timers start, pause, resume, add time, and only the current expired callback fires", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  const args = timerArgs(roomId, host.participantToken);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  expect(await t.mutation(api.cookingTimers.start, args)).toBe(true);
  const started = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  expect(started.status).toBe("running");

  expect(await t.mutation(api.cookingTimers.pause, args)).toBe(true);
  expect(
    await t.mutation(internal.cookingTimers.expire, {
      timerId: started._id,
      version: started.version,
      deadline: started.deadline!,
    }),
  ).toBe(false);
  expect(await t.mutation(api.cookingTimers.resume, args)).toBe(true);
  expect(await t.mutation(api.cookingTimers.addTime, { ...args, seconds: 30 })).toBe(true);

  await t.run(async (ctx) => {
    const timer = await ctx.db.get(started._id);
    if (!timer) throw new Error("Missing timer");
    await ctx.db.patch(timer._id, { deadline: Date.now() - 1 });
  });
  const current = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  expect(
    await t.mutation(internal.cookingTimers.expire, {
      timerId: current._id,
      version: current.version,
      deadline: current.deadline!,
    }),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.timers[0]!.status).toBe("fired");
  expect(await t.mutation(api.cookingTimers.acknowledge, args)).toBe(true);
  expect(await t.mutation(api.cookingTimers.cancel, args)).toBe(false);
});

test("manual timers enforce duration bounds and the twenty-four timer cap", async () => {
  const { t, host, roomId } = await cookingFixture([task("boil", 1)]);
  const args = timerArgs(roomId, host.participantToken);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  expect(
    await t.mutation(api.cookingTimers.createManual, {
      ...args,
      label: "Занадто коротко",
      seconds: 0,
    }),
  ).toBe(false);
  expect(
    await t.mutation(api.cookingTimers.createManual, {
      ...args,
      label: "Тиждень",
      seconds: weekSeconds,
    }),
  ).toBe(true);
  await expect(t.mutation(api.cookingTimers.addTime, { ...args, seconds: 1 })).rejects.toThrow(
    "7 днів",
  );

  await t.run(async (ctx) => {
    for (let index = 0; index < 23; index += 1) {
      await ctx.db.insert("cookingTimers", {
        roomId,
        stepKey: "boil",
        timerKey: `extra-${index}`,
        label: `Додатковий ${index}`,
        status: "ready",
        durationMs: 1_000,
        version: 1,
      });
    }
  });
  await expect(
    t.mutation(api.cookingTimers.createManual, {
      ...args,
      timerKey: "overflow",
      label: "Зайвий",
      seconds: 1,
    }),
  ).rejects.toThrow("24 активні таймери");
});

test("completing a step acknowledges its fired reminder and prevents stale expiry", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  await t.mutation(api.cookingTimers.start, timerArgs(roomId, host.participantToken));
  const timer = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  const deadline = Date.now() - 1;
  await t.run((ctx) => ctx.db.patch(timer._id, { deadline }));
  const expiry = { timerId: timer._id, version: timer.version, deadline };
  expect(await t.mutation(internal.cookingTimers.expire, expiry)).toBe(true);
  expect(
    await t.mutation(api.cookingSteps.complete, { ...host, stepKey: "boil", confirmed: true }),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))?.timers[0]).toMatchObject({
    status: "acknowledged",
    version: timer.version + 1,
  });
  expect(await t.mutation(internal.cookingTimers.expire, expiry)).toBe(false);
});

test("restoring a cancelled timer keeps its remaining duration paused", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  const args = timerArgs(roomId, host.participantToken);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  await t.mutation(api.cookingTimers.start, args);
  const running = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  const remainingMs = 12_000;
  await t.run((ctx) => ctx.db.patch(running._id, { deadline: Date.now() + remainingMs }));

  expect(await t.mutation(api.cookingTimers.cancel, args)).toBe(true);
  const cancelled = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  expect(cancelled.status).toBe("cancelled");
  expect(cancelled.remainingMs).toBeGreaterThan(0);
  expect(cancelled.remainingMs).toBeLessThanOrEqual(remainingMs);
  expect(await t.mutation(api.cookingTimers.restore, args)).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.timers[0]).toMatchObject({
    status: "paused",
    remainingMs: cancelled.remainingMs,
    version: cancelled.version + 1,
  });
  expect(await t.mutation(api.cookingTimers.cancel, args)).toBe(true);
  expect(await t.mutation(api.cookingTimers.restart, args)).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.timers[0]).toMatchObject({
    status: "running",
    durationMs: 60_000,
  });
});

test("restore and restart recover a cancelled timer after the step is undone", async () => {
  const createCancelledTimer = async () => {
    const fixture = await cookingFixture([
      task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
    ]);
    const args = timerArgs(fixture.roomId, fixture.host.participantToken);
    await fixture.t.mutation(api.cookingTimers.start, args);
    await fixture.t.mutation(api.cookingTimers.cancel, args);
    const cancelled = (await fixture.t.query(api.cookingRooms.read, fixture.host))!.timers[0]!;
    expect(
      await fixture.t.mutation(api.cookingSteps.complete, {
        ...fixture.host,
        stepKey: "boil",
        confirmed: false,
      }),
    ).toBe(true);
    expect(
      await fixture.t.mutation(api.cookingSteps.undo, { ...fixture.host, stepKey: "boil" }),
    ).toBe(true);
    return { ...fixture, args, cancelled };
  };

  const restored = await createCancelledTimer();
  expect(await restored.t.mutation(api.cookingTimers.restore, restored.args)).toBe(true);
  const restoredRoom = (await restored.t.query(api.cookingRooms.read, restored.host))!;
  expect(restoredRoom.steps[0]).toMatchObject({ status: "active" });
  expect(restoredRoom.timers[0]).toMatchObject({
    status: "paused",
    remainingMs: restored.cancelled.remainingMs,
  });

  const restarted = await createCancelledTimer();
  expect(await restarted.t.mutation(api.cookingTimers.restart, restarted.args)).toBe(true);
  const restartedRoom = (await restarted.t.query(api.cookingRooms.read, restarted.host))!;
  expect(restartedRoom.steps[0]).toMatchObject({ status: "active" });
  expect(restartedRoom.timers[0]).toMatchObject({
    status: "running",
    durationMs: 60_000,
  });
  expect(restartedRoom.timers[0]!.remainingMs).toBeUndefined();
});

test("restore acknowledges undo and restart invalidate stale expiry callbacks", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  const args = timerArgs(roomId, host.participantToken);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  await t.mutation(api.cookingTimers.start, args);
  const running = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  const deadline = Date.now() - 1;
  await t.run((ctx) => ctx.db.patch(running._id, { deadline }));
  expect(
    await t.mutation(internal.cookingTimers.expire, {
      timerId: running._id,
      version: running.version,
      deadline,
    }),
  ).toBe(true);
  expect(await t.mutation(api.cookingTimers.acknowledge, args)).toBe(true);
  expect(await t.mutation(api.cookingTimers.restore, args)).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.timers[0]).toMatchObject({
    status: "fired",
    remainingMs: 0,
  });
  expect(await t.mutation(api.cookingTimers.restart, args)).toBe(true);
  const restarted = (await t.query(api.cookingRooms.read, host))!.timers[0]!;
  expect(restarted).toMatchObject({ status: "running", durationMs: 60_000 });
  expect(restarted.remainingMs).toBeUndefined();
  expect(
    await t.mutation(internal.cookingTimers.expire, {
      timerId: running._id,
      version: running.version,
      deadline,
    }),
  ).toBe(false);
});

test("timer recovery retains step and participant access guards", async () => {
  const { t, host, guest, roomId } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 60 }] }),
  ]);
  const hostArgs = timerArgs(roomId, host.participantToken);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  await t.mutation(api.cookingTimers.cancel, hostArgs);
  await expect(
    t.mutation(api.cookingTimers.restore, timerArgs(roomId, guest.participantToken)),
  ).rejects.toThrow("недоступний");
  await t.run(async (ctx) => {
    const step = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId).eq("stepKey", "boil"))
      .unique();
    if (!step) throw new Error("Missing step");
    await ctx.db.patch(step._id, { status: "done" });
  });
  await expect(t.mutation(api.cookingTimers.restart, hostArgs)).rejects.toThrow("почни");
});
