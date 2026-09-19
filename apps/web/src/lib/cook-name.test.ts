import { expect, test } from "bun:test";

import { normalizeCookName, resolveCookName } from "./cook-name";

test("normalizes a valid cook name before it is stored", () => {
  expect(normalizeCookName("  Оля  ")).toBe("Оля");
});

test("rejects empty and oversized cook names", () => {
  expect(normalizeCookName("  ")).toBe("");
  expect(normalizeCookName("а".repeat(81))).toBe("");
});

test("uses the edited saved name when cooking again or opening a new setup", () => {
  expect(resolveCookName("Іра", "Оля", "Марко")).toBe("Оля");
  expect(resolveCookName("", "Оля", "Марко")).toBe("Оля");
  expect(resolveCookName("", "", "Марко")).toBe("Марко");
});
