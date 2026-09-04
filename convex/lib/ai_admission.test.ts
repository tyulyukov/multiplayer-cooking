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
    expect(calls).toEqual(["chatBurst"]);
  });

  test("refunds the burst limit when the daily limit denies", async () => {
    const calls: Array<readonly [AiLimitName, number | undefined]> = [];
    const allowed = await admitAiGeneration({
      limit: async (name, options) => {
        calls.push([name, options?.count]);
        return { ok: name !== "chatDaily" };
      },
    });

    expect(allowed).toBe(false);
    expect(calls).toEqual([
      ["chatBurst", undefined],
      ["chatDaily", undefined],
      ["chatBurst", -1],
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
    expect(calls).toEqual(["chatBurst", "chatDaily"]);
  });

  test("pins the per-user budget constants", () => {
    expect(AI_RATE_LIMITS).toEqual({
      chatBurst: {
        capacity: 5,
        kind: "token bucket",
        period: 60_000,
        rate: 5,
      },
      chatDaily: {
        kind: "fixed window",
        period: 86_400_000,
        rate: 40,
      },
      uploadBurst: {
        capacity: 12,
        kind: "token bucket",
        period: 60_000,
        rate: 12,
      },
    });
    expect(AI_MAX_OUTPUT_TOKENS).toBe(4_000);
  });
});
