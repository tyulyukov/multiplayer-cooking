import { expect, test } from "bun:test";

import { normalizeCookName } from "./cook-name";

test("normalizes a valid cook name before it is stored", () => {
  expect(normalizeCookName("  Оля  ")).toBe("Оля");
});

test("rejects empty and oversized cook names", () => {
  expect(normalizeCookName("  ")).toBe("");
  expect(normalizeCookName("а".repeat(81))).toBe("");
});
