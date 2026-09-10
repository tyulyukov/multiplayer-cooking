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

  test("accepts text changes for a started step without changing its work state", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [{ ...current.steps[0], body: "Подрібніть томати." }, current.steps[1]],
    };

    expect(
      assessProposal(
        current,
        next,
        [{ stepKey: "prep", status: "active", checkedIds: [] }],
        ["prep"],
        "prep",
      ),
    ).toEqual({ ok: true });
  });

  test("rejects a started-step proposal that loses checklist progress", () => {
    const current = validateCookingPlan(
      {
        ...plan(),
        steps: [
          {
            ...plan().steps[0],
            checklist: [{ id: "cut", label: "Наріжте томати." }],
          },
          plan().steps[1],
        ],
      },
      2,
    );
    const next = { ...current, steps: [{ ...current.steps[0], checklist: [] }, current.steps[1]] };

    expect(
      assessProposal(
        current,
        next,
        [{ stepKey: "prep", status: "active", checkedIds: ["cut"] }],
        ["prep"],
        "prep",
      ),
    ).toEqual({ ok: false });
  });

  test("accepts a selected-step change while another cook works on an unchanged step", () => {
    const current = plan();
    current.steps[1].dependsOn = [];
    const next = {
      ...current,
      steps: [{ ...current.steps[0], body: "Готуй без чилі." }, current.steps[1]],
    };
    expect(
      assessProposal(
        current,
        next,
        [
          { stepKey: "prep", status: "active" },
          { stepKey: "cook", status: "active" },
        ],
        ["prep"],
        "prep",
      ),
    ).toEqual({ ok: true });
  });

  test("rejects relabeling an already checked action", () => {
    const current = plan();
    current.steps[0].checklist = [{ id: "cut", label: "Наріж томати." }];
    const next = {
      ...current,
      steps: [
        { ...current.steps[0], checklist: [{ id: "cut", label: "Додай часник." }] },
        current.steps[1],
      ],
    };
    expect(
      assessProposal(
        current,
        next,
        [{ stepKey: "prep", status: "active", checkedIds: ["cut"] }],
        ["prep"],
        "prep",
      ),
    ).toEqual({ ok: false });
  });

  test("rejects a started-step change outside the selected step", () => {
    const current = plan();
    const next = {
      ...current,
      steps: [{ ...current.steps[0], body: "Подрібніть томати." }, current.steps[1]],
    };

    expect(
      assessProposal(
        current,
        next,
        [{ stepKey: "prep", status: "active", checkedIds: [] }],
        ["prep"],
        "sauce",
      ),
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
