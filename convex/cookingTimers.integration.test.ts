import { expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";

import { api, internal } from "./_generated/api";
import { cookingFixture, task } from "../tests/cooking-fixture";

const weekSeconds = 7 * 24 * 60 * 60;

function timerArgs(roomId: Id<"cookingRooms">, participantToken: string) {
  return { roomId, participantToken, stepKey: "boil", timerKey: "pasta" };
}

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
