import { expect, test } from "bun:test";

import { api, internal } from "./_generated/api";
import { cookingFixture } from "../tests/cooking-fixture";

async function saveFutureProposal() {
  const fixture = await cookingFixture();
  const nextPlan = {
    ...fixture.plan,
    servings: 3,
    ingredients: [...fixture.plan.ingredients, { id: "basil", name: "Базилік", amount: "10 г" }],
    steps: [
      fixture.plan.steps[0],
      { ...fixture.plan.steps[1], body: "Тушкуйте до густого соусу." },
    ],
  };
  await fixture.t.run(async (ctx) => {
    await ctx.db.patch(fixture.roomId, {
      helperBusy: true,
      helperPromptMessageId: "prompt",
    });
  });
  const proposalId = await fixture.t.mutation(internal.cookingAssistance.saveProposal, {
    roomId: fixture.roomId,
    authorMemberId: fixture.guestId,
    promptMessageId: "prompt",
    planVersion: 1,
    preview: "Додати базилік і змінити соус.",
    plan: nextPlan,
  });
  if (!proposalId) throw new Error("Expected a proposal");
  return { ...fixture, proposalId };
}

test("any cook approves a future-only proposal while preserving completed runtime work", async () => {
  const { t, host, guest, roomId, proposalId } = await saveFutureProposal();
  await t.mutation(api.cookingSteps.start, { ...host, stepKey: "prep" });
  await t.mutation(api.cookingSteps.complete, { ...host, stepKey: "prep", confirmed: false });

  expect((await t.query(api.cookingAssistance.listProposals, guest))[0]?.affectedStepKeys).toEqual([
    "sauce",
  ]);

  expect(await t.mutation(api.cookingAssistance.approveProposal, { ...guest, proposalId })).toBe(
    true,
  );
  const view = await t.query(api.cookingRooms.read, guest);
  expect(view?.room.requestedServings).toBe(3);
  expect(view?.room.plan?.ingredients.map((ingredient) => ingredient.id)).toContain("basil");
  expect(view?.steps.find((step) => step.stepKey === "prep")?.status).toBe("done");
  expect((await t.query(api.cookingAssistance.listProposals, guest))[0]?.status).toBe("approved");
  expect(roomId).toBeDefined();
});

test("proposal becomes stale when an affected future step starts before approval", async () => {
  const { t, host, guest, roomId, proposalId } = await saveFutureProposal();
  await t.run(async (ctx) => {
    const runtime = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId).eq("stepKey", "sauce"))
      .unique();
    if (!runtime) throw new Error("Missing runtime step");
    await ctx.db.patch(runtime._id, { status: "active", startedAt: Date.now() });
  });

  expect(await t.mutation(api.cookingAssistance.approveProposal, { ...host, proposalId })).toBe(
    false,
  );
  expect((await t.query(api.cookingAssistance.listProposals, guest))[0]?.status).toBe("stale");
});

test("helper timeout cannot overwrite a completed helper response", async () => {
  const { t, roomId } = await cookingFixture();
  await t.run(async (ctx) => {
    await ctx.db.patch(roomId, { helperBusy: true, helperPromptMessageId: "prompt" });
  });
  expect(
    await t.mutation(internal.cookingAssistance.finishHelper, {
      roomId,
      promptMessageId: "prompt",
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.cookingAssistance.finishHelper, {
      roomId,
      promptMessageId: "prompt",
      error: "late",
    }),
  ).toBe(false);
  expect(
    (await t.query(api.cookingRooms.read, { roomId, participantToken: "host-".padEnd(40, "a") }))
      ?.room.helperError,
  ).toBeUndefined();
});

test("notes stay within their room and only their author or host can delete them", async () => {
  const first = await cookingFixture();
  const second = await cookingFixture();
  const noteId = await first.t.mutation(api.cookingAssistance.addNote, {
    ...first.guest,
    text: "Поставити воду.",
  });
  if (!noteId) throw new Error("Expected a note");
  await expect(
    first.t.mutation(api.cookingAssistance.deleteNote, { ...first.host, noteId }),
  ).resolves.toBe(true);
  await expect(
    second.t.mutation(api.cookingAssistance.deleteNote, { ...second.host, noteId }),
  ).resolves.toBe(false);
});

test("notes reject a fifty-first shared entry", async () => {
  const { t, roomId, hostId, host } = await cookingFixture();
  await t.run(async (ctx) => {
    for (let index = 0; index < 50; index += 1) {
      await ctx.db.insert("cookingNotes", {
        roomId,
        authorMemberId: hostId,
        text: `Нотатка ${index}`,
        createdAt: index,
      });
    }
  });
  await expect(
    t.mutation(api.cookingAssistance.addNote, { ...host, text: "Зайва нотатка" }),
  ).rejects.toThrow("50");
});
