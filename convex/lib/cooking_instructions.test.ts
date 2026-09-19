import { expect, test } from "bun:test";

import { cookingSessionInstructions } from "./cooking_instructions";

test("requires cooking waits to become timers without restoring duplicate checklists", () => {
  expect(cookingSessionInstructions).toContain(
    "Обов’язково створи таймер для кожного окремого варіння, випікання, тушкування, відпочинку, охолодження",
  );
  expect(cookingSessionInstructions).toContain("Не залишай таку тривалість лише в body");
  expect(cookingSessionInstructions).toContain("Зазвичай 0–2 пункти, не більш як 3");
  expect(cookingSessionInstructions).toContain("afterChecklistItemId цього таймера");
});
