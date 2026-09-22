import { expect, test } from "bun:test";
import { readMemoryEvent } from "./memory-event";

test("only persisted memory changes become chat events", () => {
  expect(readMemoryEvent({ changed: true, action: "added", text: "Без арахісу" })).toEqual({
    action: "added",
    text: "Без арахісу",
  });
  expect(readMemoryEvent({ changed: true, action: "removed", text: "Гриби" })?.action).toBe(
    "removed",
  );
  for (const output of [
    null,
    {},
    { changed: false, action: "removed", text: "Гриби" },
    { changed: true, action: "failed", text: "Гриби" },
    { changed: true, action: "added", text: 42 },
  ]) {
    expect(readMemoryEvent(output)).toBeNull();
  }
});
