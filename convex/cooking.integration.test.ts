import { expect, test } from "bun:test";
import { api, internal } from "./_generated/api";
import { cookingFixture, task, inviteToken, guestToken } from "../tests/cooking-fixture";

test("guest sees only the cooking snapshot and wrong credentials cannot read or mutate it", async () => {
  const { t, guest, roomId } = await cookingFixture();
  const view = await t.query(api.cookingRooms.read, guest);
  expect(view?.room.source.title).toBe("Томатна вечеря");
  expect(JSON.stringify(view)).not.toContain("private-chat");
  expect(JSON.stringify(view)).not.toContain("tokenHash");
  expect(JSON.stringify(view)).not.toContain("hostUserId");
  expect(
    await t.query(api.cookingRooms.read, { roomId, participantToken: inviteToken }),
  ).toBeNull();
  await expect(
    t.mutation(api.cookingSteps.start, { roomId, participantToken: inviteToken, stepKey: "prep" }),
  ).rejects.toThrow("доступу");
});

test("completion unlocks a dependent cook and guarded undo preserves started work", async () => {
  const { t, host, guest } = await cookingFixture();
  await expect(t.mutation(api.cookingSteps.start, { ...guest, stepKey: "sauce" })).rejects.toThrow(
    "залежні",
  );
  await expect(t.mutation(api.cookingSteps.start, { ...guest, stepKey: "prep" })).rejects.toThrow(
    "іншому",
  );
  expect(await t.mutation(api.cookingSteps.start, { ...host, stepKey: "prep" })).toBe(true);
  expect(
    await t.mutation(api.cookingSteps.complete, { ...host, stepKey: "prep", confirmed: false }),
  ).toBe(true);
  expect(
    (await t.query(api.cookingRooms.read, guest))?.steps.find((step) => step.stepKey === "prep")
      ?.status,
  ).toBe("done");
  expect(await t.mutation(api.cookingSteps.undo, { ...host, stepKey: "prep" })).toBe(true);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "prep" });
  await t.mutation(api.cookingSteps.complete, { ...host, stepKey: "prep", confirmed: false });
  await t.mutation(api.cookingSteps.start, { ...guest, stepKey: "sauce" });
  await expect(t.mutation(api.cookingSteps.undo, { ...host, stepKey: "prep" })).rejects.toThrow(
    "уже почався",
  );
});

test("shared work requires both ready and cannot be completed while waiting for a cook", async () => {
  const { t, host, guest } = await cookingFixture([
    task("lift", 1, { kind: "together", slots: [1, 2], equipment: ["pan"] }),
  ]);
  await t.mutation(api.cookingSteps.markReady, { ...host, stepKey: "lift" });
  expect(
    await t.mutation(api.cookingSteps.complete, { ...host, stepKey: "lift", confirmed: true }),
  ).toBe(false);
  await t.mutation(api.cookingSteps.markReady, { ...guest, stepKey: "lift" });
  expect((await t.query(api.cookingRooms.read, host))?.steps[0].status).toBe("active");
  expect(
    await t.mutation(api.cookingSteps.complete, { ...guest, stepKey: "lift", confirmed: true }),
  ).toBe(true);
});

test("handoff finishes only when recipient confirms receipt", async () => {
  const { t, host, guest } = await cookingFixture([
    task("pass", 1, { kind: "handoff", slots: [1, 2] }),
  ]);
  await expect(t.mutation(api.cookingSteps.start, { ...guest, stepKey: "pass" })).rejects.toThrow(
    "Передачу",
  );
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "pass" });
  await expect(
    t.mutation(api.cookingSteps.complete, { ...guest, stepKey: "pass", confirmed: true }),
  ).rejects.toThrow("Отримувач");
  await t.mutation(api.cookingSteps.markReady, { ...host, stepKey: "pass" });
  await expect(
    t.mutation(api.cookingSteps.complete, { ...host, stepKey: "pass", confirmed: true }),
  ).rejects.toThrow("Отримувач");
  expect(
    await t.mutation(api.cookingSteps.complete, { ...guest, stepKey: "pass", confirmed: true }),
  ).toBe(true);
});

test("waiting releases attention while retaining equipment occupancy", async () => {
  const { t, host, guest } = await cookingFixture([
    task("simmer", 1, { canWait: true, equipment: ["pan"] }),
    task("cut", 1),
    task("fry", 2, { equipment: ["pan"] }),
  ]);
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "simmer" });
  await expect(t.mutation(api.cookingSteps.start, { ...host, stepKey: "cut" })).rejects.toThrow(
    "уваги",
  );
  await t.mutation(api.cookingSteps.wait, { ...host, stepKey: "simmer" });
  await expect(t.mutation(api.cookingSteps.start, { ...guest, stepKey: "fry" })).rejects.toThrow(
    "обладнання",
  );
  expect(await t.mutation(api.cookingSteps.start, { ...host, stepKey: "cut" })).toBe(true);
});

test("removed member loses access and invite rotation blocks reuse", async () => {
  const { t, host, guest, guestId, roomId } = await cookingFixture();
  await expect(
    t.mutation(api.cookingRooms.removeMember, { ...guest, memberId: guestId }),
  ).rejects.toThrow("господар");
  await t.mutation(api.cookingRooms.removeMember, { ...host, memberId: guestId });
  expect(await t.query(api.cookingRooms.read, guest)).toBeNull();
  await expect(t.mutation(api.cookingSteps.start, { ...guest, stepKey: "sauce" })).rejects.toThrow(
    "доступу",
  );
  await t.mutation(api.cookingRooms.rotateInvite, {
    ...host,
    inviteToken: "new-invite".padEnd(40, "x"),
  });
  expect(
    await t.mutation(api.cookingRooms.join, {
      roomId,
      inviteToken,
      participantToken: guestToken,
      name: "Аня",
    }),
  ).toBeNull();
});

test("stale timer callbacks cannot override a paused timer or finish its step", async () => {
  const { t, host } = await cookingFixture([
    task("boil", 1, { timers: [{ id: "pasta", label: "Паста", durationSeconds: 3600 }] }),
  ]);
  const args = { ...host, stepKey: "boil", timerKey: "pasta" };
  await expect(t.mutation(api.cookingTimers.start, args)).rejects.toThrow("почни");
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "boil" });
  await t.mutation(api.cookingTimers.start, args);
  const running = (await t.query(api.cookingRooms.read, host))!.timers[0];
  await expect(
    t.mutation(api.cookingSteps.complete, { ...host, stepKey: "boil", confirmed: true }),
  ).rejects.toThrow("таймера");
  await t.mutation(api.cookingTimers.pause, args);
  expect(
    await t.mutation(internal.cookingTimers.expire, {
      timerId: running._id,
      version: running.version,
      deadline: running.deadline!,
    }),
  ).toBe(false);
  expect((await t.query(api.cookingRooms.read, host))?.steps[0].status).toBe("active");
  await t.mutation(api.cookingTimers.cancel, args);
});
