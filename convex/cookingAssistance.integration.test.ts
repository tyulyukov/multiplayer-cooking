import { expect, test } from "bun:test";
import { helperContextStep } from "../src/lib/cooking-helper";

import { api, components, internal } from "./_generated/api";
import { hashSecret } from "./lib/cooking_access";
import {
  cookingHelperFixture,
  storeHelperImage,
  withoutScheduledHelper,
} from "../tests/cooking-helper-fixture";
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

async function saveSelectedActiveProposal() {
  const fixture = await cookingFixture();
  await fixture.t.mutation(api.cookingSteps.start, { ...fixture.host, stepKey: "prep" });
  await fixture.t.mutation(api.cookingTimers.createManual, {
    ...fixture.host,
    stepKey: "prep",
    timerKey: "check",
    label: "Перевірити",
    seconds: 60,
  });
  await fixture.t.run(async (ctx) => {
    await ctx.db.patch(fixture.roomId, { helperBusy: true, helperPromptMessageId: "prompt" });
    await ctx.db.insert("cookingHelperMessages", {
      roomId: fixture.roomId,
      messageId: "prompt",
      authorMemberId: fixture.hostId,
      authorName: "Оля",
      stepKey: "prep",
      attachmentStorageIds: [],
    });
  });
  const proposalId = await fixture.t.mutation(internal.cookingAssistance.saveProposal, {
    roomId: fixture.roomId,
    authorMemberId: fixture.hostId,
    promptMessageId: "prompt",
    planVersion: 1,
    preview: "Готувати томати до м'якості та замінити майбутню зелень.",
    plan: {
      ...fixture.plan,
      ingredients: [{ id: "basil", name: "Базилік", amount: "10 г" }],
      steps: [{ ...fixture.plan.steps[0], body: "Готуй до м'якості." }, fixture.plan.steps[1]],
    },
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

test("proposal can update a started step's guidance while preserving its timer and assignment", async () => {
  const fixture = await saveSelectedActiveProposal();
  const { proposalId } = fixture;
  await fixture.t.mutation(api.cookingTimers.start, {
    ...fixture.host,
    stepKey: "prep",
    timerKey: "check",
  });
  const before = await fixture.t.query(api.cookingRooms.read, fixture.host);

  expect(
    await fixture.t.mutation(api.cookingAssistance.approveProposal, {
      ...fixture.host,
      proposalId,
    }),
  ).toBe(true);
  const view = await fixture.t.query(api.cookingRooms.read, fixture.host);
  expect(view?.steps.find((step) => step.stepKey === "prep")?.status).toBe("active");
  expect(view?.steps.find((step) => step.stepKey === "prep")?.slots).toEqual([1]);
  expect(view?.timers.find((timer) => timer.timerKey === "check")?.status).toBe("running");
  expect(view?.timers).toEqual(before?.timers);
  expect(view?.steps).toEqual(before?.steps);
  expect(view?.room.plan?.ingredients[0]?.id).toBe("basil");
});

test("selected-step proposal becomes stale when the step completes during review", async () => {
  const fixture = await saveSelectedActiveProposal();
  await fixture.t.run(async (ctx) => {
    const runtime = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", fixture.roomId).eq("stepKey", "prep"))
      .unique();
    if (!runtime) throw new Error("Missing runtime step");
    await ctx.db.patch(runtime._id, { status: "done", completedAt: Date.now() });
  });

  expect(
    await fixture.t.mutation(api.cookingAssistance.approveProposal, {
      ...fixture.host,
      proposalId: fixture.proposalId,
    }),
  ).toBe(false);
  expect(
    (await fixture.t.query(api.cookingAssistance.listProposals, fixture.host))[0]?.status,
  ).toBe("stale");
});

test("selected-step proposal becomes stale when checklist progress changes during review", async () => {
  const fixture = await saveSelectedActiveProposal();
  await fixture.t.run(async (ctx) => {
    const runtime = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", fixture.roomId).eq("stepKey", "prep"))
      .unique();
    if (!runtime) throw new Error("Missing runtime step");
    await ctx.db.patch(runtime._id, { checkedIds: ["new-progress"] });
  });

  expect(
    await fixture.t.mutation(api.cookingAssistance.approveProposal, {
      ...fixture.host,
      proposalId: fixture.proposalId,
    }),
  ).toBe(false);
  expect(
    (await fixture.t.query(api.cookingAssistance.listProposals, fixture.host))[0]?.status,
  ).toBe("stale");
});

test("helper uploads reject other members and files without an allowed image type", async () => {
  const fixture = await cookingFixture();
  const storageId = await fixture.t.run((ctx) =>
    ctx.storage.store(new Blob(["image"], { type: "image/png" })),
  );
  const ticket = "helper-upload-ticket";
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("cookingHelperUploadGrants", {
      roomId: fixture.roomId,
      memberId: fixture.hostId,
      ticketHash: await hashSecret(ticket),
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
  });

  expect(
    await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, {
      ...fixture.guest,
      uploadTicket: ticket,
      storageId,
    }),
  ).toBe(false);
  expect(
    await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, {
      ...fixture.host,
      uploadTicket: ticket,
      storageId,
    }),
  ).toBe(false);
  expect(
    await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, {
      ...fixture.host,
      uploadTicket: ticket,
      storageId,
    }),
  ).toBe(false);
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

test("helper photo messages retain their author, image and selected context for the room", async () => {
  const fixture = await cookingHelperFixture();
  const grant = await fixture.t.mutation(
    api.cookingAssistance.generateHelperUploadUrl,
    fixture.host,
  );
  if (!grant) throw new Error("Expected an upload grant");
  const storageId = await storeHelperImage(fixture);
  const upload = { ...fixture.host, uploadTicket: grant.uploadTicket, storageId };
  expect(
    await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, {
      ...upload,
      ...fixture.guest,
    }),
  ).toBe(false);
  expect(await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, upload)).toBe(true);
  expect(await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, upload)).toBe(false);

  await withoutScheduledHelper(async () => {
    const result = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.host,
      prompt: "",
      stepKey: "prep",
      attachmentStorageIds: [storageId],
    });
    if (!result) throw new Error("Expected an image-only question");
    const messages = await fixture.t.query(api.cookingAssistance.listMessages, fixture.guest);
    expect(messages[0]).toMatchObject({
      _id: result.promptMessageId,
      authorName: "Оля",
      stepKey: "prep",
    });
    expect(messages[0]?.attachmentUrls).toHaveLength(1);
    const imageUrl = await fixture.t.run((ctx) => ctx.storage.getUrl(storageId));
    if (!imageUrl) throw new Error("Expected an image URL");
    expect(messages[0]?.attachmentUrls?.[0]).toEqual(imageUrl);
    const saved = await fixture.t.query(components.agent.messages.getMessagesByIds, {
      messageIds: [result.promptMessageId],
    });
    expect(saved[0]?.message?.content).toContainEqual({
      type: "image",
      image: imageUrl,
      mediaType: "image/png",
    });
    const data = await fixture.t.query(internal.cookingAssistance.helperData, {
      roomId: fixture.roomId,
      promptMessageId: result.promptMessageId,
    });
    expect(data?.currentStep).toEqual({ id: "prep", title: "prep" });
    await fixture.t.mutation(internal.cookingAssistance.finishHelper, {
      roomId: fixture.roomId,
      promptMessageId: result.promptMessageId,
    });
    expect(
      await fixture.t.mutation(api.cookingAssistance.askHelper, {
        ...fixture.guest,
        prompt: "Чуже фото",
        attachmentStorageIds: [storageId],
      }),
    ).toBeNull();
  });
});

test("expired helper upload grants reject an otherwise valid image", async () => {
  const fixture = await cookingHelperFixture();
  const grant = await fixture.t.mutation(
    api.cookingAssistance.generateHelperUploadUrl,
    fixture.host,
  );
  if (!grant) throw new Error("Expected an upload grant");
  const storageId = await storeHelperImage(fixture);
  await fixture.t.run(async (ctx) => {
    const stored = await ctx.db.query("cookingHelperUploadGrants").first();
    if (!stored) throw new Error("Expected a stored grant");
    await ctx.db.patch(stored._id, { expiresAt: Date.now() - 1 });
  });
  expect(
    await fixture.t.mutation(api.cookingAssistance.registerHelperUpload, {
      ...fixture.host,
      uploadTicket: grant.uploadTicket,
      storageId,
    }),
  ).toBe(false);
});

test("shared helper failures identify the failed question rather than another cook's previous request", async () => {
  const fixture = await cookingHelperFixture();
  await withoutScheduledHelper(async () => {
    const first = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.host,
      prompt: "Без чилі",
    });
    if (!first) throw new Error("Expected a question");
    await fixture.t.mutation(internal.cookingAssistance.finishHelper, {
      roomId: fixture.roomId,
      promptMessageId: first.promptMessageId,
    });
    const second = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.guest,
      prompt: "Як перевірити соус?",
    });
    if (!second) throw new Error("Expected another question");
    await fixture.t.mutation(internal.cookingAssistance.finishHelper, {
      roomId: fixture.roomId,
      promptMessageId: second.promptMessageId,
      error: "Спробуйте ще раз.",
    });
    const shared = await fixture.t.query(api.cookingRooms.read, fixture.host);
    expect(shared?.room.helperFailedPromptMessageId).toBe(second.promptMessageId);
    expect(shared?.room.helperFailedPromptMessageId).not.toBe(first.promptMessageId);
    const retried = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.guest,
      prompt: "Як перевірити соус?",
    });
    expect(retried?.promptMessageId).not.toBe(second.promptMessageId);
    expect(
      (await fixture.t.query(api.cookingRooms.read, fixture.host))?.room
        .helperFailedPromptMessageId,
    ).toBeUndefined();
  });
});

test("a preserved helper draft can be sent after a shared proposal removes its selected step", async () => {
  const fixture = await cookingHelperFixture();
  const selectedStepKey = "sauce";
  const draft = "Чим замінити перець?";
  await withoutScheduledHelper(async () => {
    const question = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.guest,
      prompt: "Прибрати соус",
      stepKey: selectedStepKey,
    });
    if (!question) throw new Error("Expected a question");
    const proposalId = await fixture.t.mutation(internal.cookingAssistance.saveProposal, {
      roomId: fixture.roomId,
      authorMemberId: fixture.guestId,
      promptMessageId: question.promptMessageId,
      planVersion: 1,
      preview: "Готуємо без соусу.",
      plan: { ...fixture.plan, steps: [fixture.plan.steps[0]] },
    });
    if (!proposalId) throw new Error("Expected a proposal");
    expect(
      await fixture.t.mutation(api.cookingAssistance.approveProposal, {
        ...fixture.host,
        proposalId,
      }),
    ).toBe(true);
    await fixture.t.mutation(internal.cookingAssistance.finishHelper, {
      roomId: fixture.roomId,
      promptMessageId: question.promptMessageId,
    });
    const view = await fixture.t.query(api.cookingRooms.read, fixture.guest);
    const context = helperContextStep(view?.room.plan?.steps ?? [], selectedStepKey);
    expect(context).toBeUndefined();
    const sent = await fixture.t.mutation(api.cookingAssistance.askHelper, {
      ...fixture.guest,
      prompt: draft,
      stepKey: context,
    });
    expect(sent).not.toBeNull();
    expect(
      (await fixture.t.query(api.cookingAssistance.listMessages, fixture.guest)).at(-1)?.text,
    ).toBe(draft);
  });
});
