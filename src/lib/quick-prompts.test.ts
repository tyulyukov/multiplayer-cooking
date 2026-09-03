import { describe, expect, test } from "bun:test";

import {
  pickQuickPrompts,
  quickPromptCount,
  quickPromptPool,
  sampleQuickPrompts,
  surprisePrompt,
} from "./quick-prompts";

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length]!;
}

describe("sampleQuickPrompts", () => {
  test("returns distinct prompts from the pool", () => {
    const picked = sampleQuickPrompts(quickPromptPool, quickPromptCount);

    expect(picked).toHaveLength(quickPromptCount);
    expect(new Set(picked.map((prompt) => prompt.id)).size).toBe(quickPromptCount);
    for (const prompt of picked) {
      expect(quickPromptPool).toContain(prompt);
    }
  });

  test("is deterministic for a given random source", () => {
    const first = sampleQuickPrompts(quickPromptPool, 3, sequence([0.1, 0.5, 0.9]));
    const second = sampleQuickPrompts(quickPromptPool, 3, sequence([0.1, 0.5, 0.9]));

    expect(first).toEqual(second);
  });

  test("never returns more than the pool holds", () => {
    expect(sampleQuickPrompts(quickPromptPool.slice(0, 2), 5)).toHaveLength(2);
  });

  test("does not mutate the pool", () => {
    const snapshot = [...quickPromptPool];
    sampleQuickPrompts(quickPromptPool, quickPromptCount, sequence([0.99]));

    expect(quickPromptPool).toEqual(snapshot);
  });
});

describe("pickQuickPrompts", () => {
  test("keeps the surprise prompt last and never in the sampled set", () => {
    const picked = pickQuickPrompts(sequence([0.3, 0.6, 0.2]));

    expect(picked.at(-1)).toBe(surprisePrompt);
    expect(picked.slice(0, -1)).not.toContain(surprisePrompt);
    expect(quickPromptPool).not.toContain(surprisePrompt);
  });

  test("pool ids are unique", () => {
    const ids = [...quickPromptPool, surprisePrompt].map((prompt) => prompt.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
