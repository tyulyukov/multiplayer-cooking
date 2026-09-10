import { expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";

import { api } from "./_generated/api";
import { cookingFixture, task } from "../tests/cooking-fixture";

function checklistArgs(roomId: Id<"cookingRooms">, participantToken: string, itemId: string) {
  return { roomId, participantToken, stepKey: "boil", itemId, checked: true };
}

test("checking an assigned pending task starts it and keeps earlier checks", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, {
      checklist: [
        { id: "heat", label: "Нагріти воду" },
        { id: "salt", label: "Посолити воду" },
      ],
    }),
  ]);

  expect(
    await t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(roomId, host.participantToken, "heat"),
    ),
  ).toBe(true);
  const first = (await t.query(api.cookingRooms.read, host))!.steps[0]!;
  expect(first).toMatchObject({ status: "active", checkedIds: ["heat"] });
  expect(first.startedAt).toEqual(expect.any(Number));

  expect(
    await t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(roomId, host.participantToken, "salt"),
    ),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.steps[0]).toMatchObject({
    status: "active",
    startedAt: first.startedAt,
    checkedIds: ["heat", "salt"],
  });
});

test("a blocked dependency leaves a pending task unchecked", async () => {
  const { t, guest, roomId } = await cookingFixture([
    task("prep", 1),
    task("boil", 2, { dependsOn: ["prep"], checklist: [{ id: "heat", label: "Нагріти воду" }] }),
  ]);

  await expect(
    t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(roomId, guest.participantToken, "heat"),
    ),
  ).rejects.toThrow("залежні кроки");
  const step = (await t.query(api.cookingRooms.read, guest))!.steps.find(
    (item) => item.stepKey === "boil",
  )!;
  expect(step).toMatchObject({
    status: "pending",
    checkedIds: [],
  });
  expect(step.startedAt).toBeUndefined();
});

test("another cook cannot check an assigned task", async () => {
  const { t, host, guest, roomId } = await cookingFixture([
    task("boil", 1, { checklist: [{ id: "heat", label: "Нагріти воду" }] }),
  ]);

  expect(
    await t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(roomId, guest.participantToken, "heat"),
    ),
  ).toBe(false);
  expect((await t.query(api.cookingRooms.read, host))!.steps[0]).toMatchObject({
    status: "pending",
    checkedIds: [],
  });
});

test("checking a pending task keeps attention and equipment locks", async () => {
  const attention = await cookingFixture([
    task("chop", 1),
    task("boil", 1, { checklist: [{ id: "heat", label: "Нагріти воду" }] }),
  ]);
  await attention.t.mutation(api.cookingSteps.start, { ...attention.host, stepKey: "chop" });
  await expect(
    attention.t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(attention.roomId, attention.host.participantToken, "heat"),
    ),
  ).rejects.toThrow("потребує вашої уваги");
  expect(
    (await attention.t.query(api.cookingRooms.read, attention.host))!.steps.find(
      (item) => item.stepKey === "boil",
    ),
  ).toMatchObject({ status: "pending", checkedIds: [] });

  const equipment = await cookingFixture([
    task("chop", 1, { equipment: ["pan"] }),
    task("boil", 2, { equipment: ["pan"], checklist: [{ id: "heat", label: "Нагріти воду" }] }),
  ]);
  await equipment.t.mutation(api.cookingSteps.start, { ...equipment.host, stepKey: "chop" });
  await expect(
    equipment.t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(equipment.roomId, equipment.guest.participantToken, "heat"),
    ),
  ).rejects.toThrow("обладнання зараз зайняте");
  expect(
    (await equipment.t.query(api.cookingRooms.read, equipment.guest))!.steps.find(
      (item) => item.stepKey === "boil",
    ),
  ).toMatchObject({ status: "pending", checkedIds: [] });
});

test("together and handoff checks retain their start rules", async () => {
  const together = await cookingFixture([
    task("boil", 1, {
      kind: "together",
      slots: [1, 2],
      checklist: [{ id: "heat", label: "Нагріти воду" }],
    }),
  ]);
  await expect(
    together.t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(together.roomId, together.host.participantToken, "heat"),
    ),
  ).rejects.toThrow("всі кухарі мають підтвердити готовність");
  await together.t.mutation(api.cookingSteps.start, { ...together.host, stepKey: "boil" });
  await together.t.mutation(api.cookingSteps.start, { ...together.guest, stepKey: "boil" });
  expect(
    await together.t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(together.roomId, together.host.participantToken, "heat"),
    ),
  ).toBe(true);

  const handoff = await cookingFixture([
    task("boil", 1, {
      kind: "handoff",
      slots: [1, 2],
      checklist: [{ id: "pass", label: "Передати каструлю" }],
    }),
  ]);
  await expect(
    handoff.t.mutation(
      api.cookingSteps.toggleChecklist,
      checklistArgs(handoff.roomId, handoff.guest.participantToken, "pass"),
    ),
  ).rejects.toThrow("Передачу починає");

  const directHandoff = await cookingFixture([
    task("boil", 1, {
      kind: "handoff",
      slots: [1, 2],
      checklist: [{ id: "pass", label: "Передати каструлю" }],
    }),
  ]);
  await expect(
    directHandoff.t.mutation(api.cookingSteps.markReady, {
      ...directHandoff.guest,
      stepKey: "boil",
    }),
  ).rejects.toThrow("Передачу починає");
  expect(
    (await directHandoff.t.query(api.cookingRooms.read, directHandoff.host))!.steps[0],
  ).toMatchObject({
    status: "pending",
    readyMemberIds: [],
  });
  expect(
    await directHandoff.t.mutation(api.cookingSteps.markReady, {
      ...directHandoff.host,
      stepKey: "boil",
    }),
  ).toBe(true);
  expect(
    (await directHandoff.t.query(api.cookingRooms.read, directHandoff.host))!.steps[0],
  ).toMatchObject({
    status: "waiting",
  });
});

test("an empty pending task completes directly", async () => {
  const { t, host, roomId } = await cookingFixture([task("boil", 1)]);

  expect(
    await t.mutation(api.cookingSteps.complete, {
      ...host,
      roomId,
      stepKey: "boil",
      confirmed: false,
    }),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))!.steps[0]).toMatchObject({ status: "done" });
});

test("invalid pending completion rolls back its automatic start", async () => {
  const { t, host, roomId } = await cookingFixture([
    task("boil", 1, { checklist: [{ id: "heat", label: "Нагріти воду" }] }),
  ]);

  await expect(
    t.mutation(api.cookingSteps.complete, {
      ...host,
      roomId,
      stepKey: "boil",
      confirmed: false,
    }),
  ).rejects.toThrow("Позначте всі пункти");
  const step = (await t.query(api.cookingRooms.read, host))!.steps[0]!;
  expect(step).toMatchObject({
    status: "pending",
    checkedIds: [],
  });
  expect(step.startedAt).toBeUndefined();
});

test("unchecked items require an explicit skip and stay unchecked after completion", async () => {
  const { t, host } = await cookingFixture([
    task("prep", 1, { checklist: [{ id: "cut", label: "Нарізати" }] }),
  ]);
  await expect(
    t.mutation(api.cookingSteps.complete, {
      ...host,
      stepKey: "prep",
      confirmed: false,
    }),
  ).rejects.toThrow("Позначте всі пункти");
  expect(
    await t.mutation(api.cookingSteps.complete, {
      ...host,
      stepKey: "prep",
      confirmed: false,
      skipChecklist: true,
    }),
  ).toBe(true);
  expect((await t.query(api.cookingRooms.read, host))?.steps[0]).toMatchObject({
    status: "done",
    checkedIds: [],
  });
});

test("skipping checklist items preserves assignment, confirmation, and timer gates", async () => {
  const { t, host, guest } = await cookingFixture([
    task("prep", 1, {
      checklist: [{ id: "check", label: "Перевірити" }],
      confirmation: "Перевірив результат",
      timers: [{ id: "cook", label: "Готування", durationSeconds: 60 }],
    }),
  ]);
  await expect(
    t.mutation(api.cookingSteps.complete, {
      ...guest,
      stepKey: "prep",
      confirmed: true,
      skipChecklist: true,
    }),
  ).rejects.toThrow("іншому кухарю");
  await expect(
    t.mutation(api.cookingSteps.complete, {
      ...host,
      stepKey: "prep",
      confirmed: false,
      skipChecklist: true,
    }),
  ).rejects.toThrow("Потрібне підтвердження");
  await t.mutation(api.cookingTimers.start, {
    ...host,
    stepKey: "prep",
    timerKey: "cook",
  });
  await expect(
    t.mutation(api.cookingSteps.complete, {
      ...host,
      stepKey: "prep",
      confirmed: true,
      skipChecklist: true,
    }),
  ).rejects.toThrow("таймера");
});
