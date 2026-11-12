import { listMessages, saveMessages } from "@convex-dev/agent";
import { expect, test } from "bun:test";

import { api, components } from "./_generated/api";
import { testSessionId } from "../tests/convex-doubles";
import { cookingHelperFixture, withoutScheduledHelper } from "../tests/cooking-helper-fixture";

test("retry reruns a failed reply for the same prompt and removes the failed reply", async () => {
  const { t } = await cookingHelperFixture();
  const sessionId = testSessionId("retry-session");

  await withoutScheduledHelper(async () => {
    const sent = await t.mutation(api.chat.sendMessage, { sessionId, text: "Паста на двох" });

    if (!sent.ok) throw new Error(sent.message);
    const { threadId } = sent;
    expect(await t.mutation(api.chat.retry, { sessionId, threadId })).toMatchObject({ ok: false });

    const prompt = await t.run(async (ctx) => {
      const { page } = await listMessages(ctx, components.agent, {
        threadId,
        paginationOpts: { cursor: null, numItems: 5 },
      });

      const promptId = page[0]?._id;

      if (!promptId) throw new Error("Expected the prompt");
      await saveMessages(ctx, components.agent, {
        threadId,
        promptMessageId: promptId,
        messages: [{ role: "assistant", content: "Не вдалося" }],
        metadata: [{ status: "failed", error: "402" }],
      });

      return promptId;
    });

    expect(await t.query(api.chat.history, { sessionId })).toMatchObject([
      { threadId, prompt: "Паста на двох", failed: true },
    ]);
    expect(await t.mutation(api.chat.retry, { sessionId, threadId })).toEqual({ ok: true });

    const remaining = await t.run(async (ctx) =>
      listMessages(ctx, components.agent, {
        threadId,
        paginationOpts: { cursor: null, numItems: 5 },
      }),
    );

    expect(remaining.page.map((doc) => doc._id)).toEqual([prompt]);
    expect(
      await t.mutation(api.chat.retry, { sessionId: testSessionId("someone-else"), threadId }),
    ).toMatchObject({ ok: false });
  });
});
