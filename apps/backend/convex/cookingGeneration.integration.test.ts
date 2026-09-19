import { expect, test } from "bun:test";

import { api, internal } from "./_generated/api";
import { cookingFixture } from "../tests/cooking-fixture";

test("generates and saves a cooking plan through the agent without reading the original chat", async () => {
  const { t, plan, roomId, host, userId } = await cookingFixture();
  await t.run(async (ctx) => {
    await ctx.db.insert("personalizations", {
      userId,
      settings: {
        tone: "concise",
        about: "Я новачок на кухні",
        customInstructions: "Пояснюй простими кроками",
      },
    });
    const steps = await ctx.db
      .query("cookingSteps")
      .withIndex("by_room_step", (q) => q.eq("roomId", roomId))
      .take(80);
    for (const step of steps) await ctx.db.delete(step._id);
    await ctx.db.patch(roomId, { state: "generating", plan: undefined, planVersion: 0 });
  });
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL = "test-model";
  const requests: Request[] = [];
  const providerFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.url !== "https://openrouter.ai/api/v1/chat/completions") {
      throw new Error("Unexpected network request");
    }
    requests.push(request);
    return Response.json({
      id: "plan-response",
      created: 1,
      model: "test-model",
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "save-plan",
                type: "function",
                function: {
                  name: "save_plan",
                  arguments: JSON.stringify(plan),
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    });
  };
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: providerFetch });
  try {
    await t.action(internal.cookingGeneration.generate, { roomId, attempt: "fixture" });
    const room = await t.query(api.cookingRooms.read, host);
    expect(room?.room.state).toBe("ready");
    expect(room?.room.plan).toEqual(plan);
    expect(room?.steps).toHaveLength(plan.steps.length);
    expect(requests).toHaveLength(1);
    const body: unknown = await requests[0]!.json();
    expect(body).toMatchObject({ model: "test-model" });
    expect(JSON.stringify(body)).toContain("Я новачок на кухні");
    expect(JSON.stringify(body)).toContain("Пояснюй простими кроками");
    expect(JSON.stringify(body)).not.toContain("private-chat");
    expect(JSON.stringify(body)).not.toContain("private-prompt");
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = originalModel;
  }
});
