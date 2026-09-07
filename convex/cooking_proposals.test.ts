import { describe, expect, test } from "bun:test";

import { assessProposal, changedStepKeys } from "./cookingAssistance";
import { validateCookingPlan } from "./lib/cooking_plan";

function plan() {
  return validateCookingPlan(
    {
      servings: 2,
      summary: "Паста",
      ingredients: [{ id: "tomato", name: "Томати", amount: "400 г" }],
      equipment: [],
      steps: [
        {
          id: "prep",
          title: "Підготувати",
          body: "Наріжте томати.",
          kind: "task",
          slots: [1],
          dependsOn: [],
          activeMinutes: 5,
          equipment: [],
          checklist: [],
          timers: [],
        },
        {
          id: "cook",
          title: "Приготувати",
          body: "Тушкуйте томати.",
          kind: "task",
          slots: [2],
          dependsOn: ["prep"],
          activeMinutes: 10,
          equipment: [],
          checklist: [],
          timers: [],
        },
      ],
    },
    2,
  );
}

describe("cooking plan proposals", () => {
  test("identifies changed and added future steps", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [
        current.steps[0],
        { ...current.steps[1], body: "Тушкуйте до густого соусу." },
        {
          ...current.steps[1],
          id: "serve",
          title: "Подати",
          body: "Подайте відразу.",
          dependsOn: ["cook"],
        },
      ],
    };

    expect(changedStepKeys(current, next)).toEqual(["cook", "serve"]);
  });

  test("rejects a proposal that changes started work", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [{ ...current.steps[0], body: "Подрібніть томати." }, current.steps[1]],
    };

    expect(
      assessProposal(current, next, [{ stepKey: "prep", status: "active" }], ["prep"]),
    ).toEqual({ ok: false });
  });

  test("rejects a proposal after a dependent step starts", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [{ ...current.steps[0], body: "Розріжте томати навпіл." }, current.steps[1]],
    };

    expect(
      assessProposal(current, next, [{ stepKey: "cook", status: "active" }], ["prep"]),
    ).toEqual({ ok: false });
  });

  test("accepts a change when all affected work remains pending", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [current.steps[0], { ...current.steps[1], body: "Тушкуйте 12 хвилин." }],
    };

    expect(
      assessProposal(
        current,
        next,
        [
          { stepKey: "prep", status: "done" },
          { stepKey: "cook", status: "pending" },
        ],
        ["cook"],
      ),
    ).toEqual({ ok: true });
  });

  test("rejects changing equipment capacity used by active work", () => {
    const current = validateCookingPlan(
      {
        ...plan(),
        equipment: [{ id: "pan", name: "Сковорода", capacity: 1 }],
        steps: [{ ...plan().steps[0], equipment: ["pan"] }, plan().steps[1]],
      },
      2,
    );
    const next = { ...current, equipment: [{ ...current.equipment[0], capacity: 2 }] };

    expect(assessProposal(current, next, [{ stepKey: "prep", status: "active" }], [])).toEqual({
      ok: false,
    });
  });
});
