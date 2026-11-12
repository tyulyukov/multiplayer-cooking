import { expect, test } from "bun:test";
import { isMemoryEvent } from "./memory-event";

test("only persisted memory changes become chat events", () => {
  expect(isMemoryEvent({ changed: true, action: "added", text: "Без арахісу" })).toBe(true);
  expect(isMemoryEvent({ changed: true, action: "removed", text: "Гриби" })).toBe(true);

  for (const output of [
    null,
    {},
    { changed: false, action: "removed", text: "Гриби" },
    { changed: true, action: "failed", text: "Гриби" },
    { changed: true, action: "added", text: 42 },
  ]) {
    expect(isMemoryEvent(output)).toBe(false);
  }
});
