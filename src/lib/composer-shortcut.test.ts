import { describe, expect, test } from "bun:test";

import { shouldSubmitComposerShortcut } from "./composer-shortcut";

const enter = {
  key: "Enter",
  altKey: false,
  ctrlKey: false,
  isComposing: false,
  metaKey: false,
  repeat: false,
  shiftKey: false,
};

describe("shouldSubmitComposerShortcut", () => {
  test("sends with Enter on desktop by default", () => {
    expect(shouldSubmitComposerShortcut(enter, "enter", true)).toBe(true);
    expect(shouldSubmitComposerShortcut({ ...enter, shiftKey: true }, "enter", true)).toBe(false);
  });

  test("sends with Shift+Enter when configured", () => {
    expect(shouldSubmitComposerShortcut(enter, "shift-enter", true)).toBe(false);
    expect(shouldSubmitComposerShortcut({ ...enter, shiftKey: true }, "shift-enter", true)).toBe(
      true,
    );
  });

  test("keeps Enter for a new line on mobile and during composition or modifiers", () => {
    expect(shouldSubmitComposerShortcut(enter, "enter", false)).toBe(false);
    expect(shouldSubmitComposerShortcut({ ...enter, isComposing: true }, "enter", true)).toBe(
      false,
    );
    expect(shouldSubmitComposerShortcut({ ...enter, repeat: true }, "enter", true)).toBe(false);
    expect(shouldSubmitComposerShortcut({ ...enter, ctrlKey: true }, "enter", true)).toBe(false);
  });
});
