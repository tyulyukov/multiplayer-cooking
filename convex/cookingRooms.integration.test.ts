import { expect, test } from "bun:test";
import type { SessionId } from "convex-helpers/server/sessions";

import { api } from "./_generated/api";
import { cookingFixture, guestToken, inviteToken, task } from "../tests/cooking-fixture";

const extraToken = "extra-".padEnd(40, "d");
const replacementToken = "replacement-".padEnd(40, "e");

test("join is idempotent, rejects a full room, and leaves active guests readable after invite closure", async () => {
  const { t, roomId, guest, guestId } = await cookingFixture();

  expect(
    await t.mutation(api.cookingRooms.join, {
      roomId,
      inviteToken,
      participantToken: guestToken,
      name: "Інше ім'я",
    }),
  ).toEqual({ memberId: guestId, slots: [2] });
  await expect(
    t.mutation(api.cookingRooms.join, {
      roomId,
      inviteToken,
      participantToken: extraToken,
      name: "Марко",
    }),
  ).rejects.toThrow("всі місця зайняті");

  await t.mutation(api.cookingRooms.closeInvite, {
    roomId,
    participantToken: "host-".padEnd(40, "a"),
  });
  expect(
    await t.mutation(api.cookingRooms.join, {
      roomId,
      inviteToken,
      participantToken: replacementToken,
      name: "Марко",
    }),
  ).toBeNull();
  expect((await t.query(api.cookingRooms.read, guest))?.me._id).toBe(guestId);
});

test("expired invites reject new guests", async () => {
  const { t, roomId } = await cookingFixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(roomId, { cookCount: 3, inviteExpiresAt: Date.now() - 1 });
  });

  expect(
    await t.mutation(api.cookingRooms.join, {
      roomId,
      inviteToken,
      participantToken: extraToken,
      name: "Марко",
    }),
  ).toBeNull();
});

test("transferring host control prevents the original account from replacing the new host token", async () => {
  const { t, host, guest, roomId, userId, guestId } = await cookingFixture();
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", { sessionId: "host-session", userId, authVersion: 0 });
  });

  expect(await t.mutation(api.cookingRooms.transferHost, { ...host, memberId: guestId })).toBe(
    true,
  );
  expect(
    await t.mutation(api.cookingRooms.recoverHost, {
      roomId,
      sessionId: "host-session" as SessionId,
      newParticipantToken: replacementToken,
    }),
  ).toBe(false);
  expect((await t.query(api.cookingRooms.read, guest))?.me.role).toBe("host");
  expect(
    await t.query(api.cookingRooms.read, { roomId, participantToken: replacementToken }),
  ).toBeNull();
});

test("continuing alone keeps other cooks active and preserves their roles and ongoing work", async () => {
  const { t, host, guest, guestId } = await cookingFixture([task("prep", 1), task("ongoing", 2)]);
  await t.mutation(api.cookingSteps.start, { ...guest, stepKey: "ongoing" });

  expect(await t.mutation(api.cookingRooms.continueAlone, host)).toBe(true);
  const view = await t.query(api.cookingRooms.read, host);
  expect(view?.me.slots).toEqual([1, 2]);
  expect(view?.members.find((member) => member._id === guestId)).toMatchObject({
    status: "active",
    role: "cook",
    slots: [],
  });
  expect(view?.steps.find((step) => step.stepKey === "ongoing")?.status).toBe("active");
  expect(view?.room.inviteOpen).toBe(false);
});

test("role swaps reject active work and exchange free slots", async () => {
  const active = await cookingFixture();
  await active.t.mutation(api.cookingSteps.start, { ...active.host, stepKey: "prep" });
  await expect(
    active.t.mutation(api.cookingSteps.swapRoles, {
      ...active.host,
      memberId: active.guestId,
    }),
  ).rejects.toThrow("почату роботу");

  const free = await cookingFixture([task("first", 1), task("second", 2)]);
  expect(
    await free.t.mutation(api.cookingSteps.swapRoles, {
      ...free.host,
      memberId: free.guestId,
    }),
  ).toBe(true);
  const view = await free.t.query(api.cookingRooms.read, free.host);
  expect(view?.me.slots).toEqual([2]);
  expect(view?.members.find((member) => member._id === free.guestId)?.slots).toEqual([1]);
  expect(view?.steps.map((step) => step.status)).toEqual(["pending", "pending"]);
});

for (const recovery of ["continueAlone", "takeover"] as const) {
  test(`${recovery} resets an unstarted shared step after another cook leaves`, async () => {
    const { t, host, guest } = await cookingFixture([
      task("together", 1, { kind: "together", slots: [1, 2] }),
    ]);
    await t.mutation(api.cookingSteps.markReady, { ...host, stepKey: "together" });
    await t.mutation(api.cookingRooms.leave, guest);
    if (recovery === "continueAlone") await t.mutation(api.cookingRooms.continueAlone, host);
    else await t.mutation(api.cookingSteps.takeover, { ...host, slot: 2 });
    const recovered = await t.query(api.cookingRooms.read, host);
    expect(recovered?.me.slots).toEqual([1, 2]);
    expect(recovered?.steps[0]).toMatchObject({ status: "pending", readyMemberIds: [] });
    await t.mutation(api.cookingSteps.markReady, { ...host, stepKey: "together" });
    expect((await t.query(api.cookingRooms.read, host))?.steps[0]).toMatchObject({
      status: "active",
    });
    expect(
      await t.mutation(api.cookingSteps.complete, {
        ...host,
        stepKey: "together",
        confirmed: true,
      }),
    ).toBe(true);
  });
}
