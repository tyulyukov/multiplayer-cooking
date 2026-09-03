import { describe, expect, test } from "bun:test";

import { AI_MAX_OUTPUT_TOKENS, AI_RATE_LIMITS } from "./ai_config";
import { admitAiGeneration, type AiLimitName } from "./ai_admission";

describe("admitAiGeneration", () => {
  test("stops before the daily limit when the burst limit denies", async () => {
    const calls: AiLimitName[] = [];
    const allowed = await admitAiGeneration({
      limit: async (name) => {
        calls.push(name);
        return { ok: false };
      },
    });

    expect(allowed).toBe(false);
    expect(calls).toEqual(["aiBurst"]);
  });

  test("refunds the burst limit when the daily limit denies", async () => {
    const calls: Array<readonly [AiLimitName, number | undefined]> = [];
    const allowed = await admitAiGeneration({
      limit: async (name, options) => {
        calls.push([name, options?.count]);
        return { ok: name !== "aiDaily" };
      },
    });

    expect(allowed).toBe(false);
    expect(calls).toEqual([
      ["aiBurst", undefined],
      ["aiDaily", undefined],
      ["aiBurst", -1],
    ]);
  });

  test("allows generation when both limits allow it", async () => {
    const calls: AiLimitName[] = [];
    const allowed = await admitAiGeneration({
      limit: async (name) => {
        calls.push(name);
        return { ok: true };
      },
    });

    expect(allowed).toBe(true);
    expect(calls).toEqual(["aiBurst", "aiDaily"]);
  });

  test("pins the contest budget constants", () => {
    expect(AI_RATE_LIMITS).toEqual({
      aiBurst: {
        capacity: 3,
        kind: "token bucket",
        period: 60_000,
        rate: 3,
      },
      aiDaily: {
        kind: "fixed window",
        period: 86_400_000,
        rate: 100,
      },
    });
    expect(AI_MAX_OUTPUT_TOKENS).toBe(600);
  });
});
