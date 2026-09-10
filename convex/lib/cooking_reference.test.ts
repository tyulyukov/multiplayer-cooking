import { expect, test } from "bun:test";
import { cookingReferencePrompt } from "./cooking_reference";
import { dishImagePrompt } from "./dish_image";
import { foodImageStyle } from "./food_image_style";
import { task } from "../../tests/cooking-fixture";

test("every cooking reference reuses the idea photo art direction", () => {
  expect(
    dishImagePrompt({ title: "Суп", summary: "Суп", body: "Зварити", ingredients: [] }),
  ).toContain(foodImageStyle);
  for (const style of ["photo", "illustration"] as const) {
    const prompt = cookingReferencePrompt(
      "Суп",
      task("cut", 1, {
        reference: { style, prompt: "Нарізана морква", alt: "Кубики моркви" },
      }),
    );
    expect(prompt).toContain(foodImageStyle);
    expect(prompt).toContain("Нарізана морква");
    expect(prompt).toContain("at this exact stage");
    expect(prompt).not.toContain("3D instructional illustration");
  }
});
