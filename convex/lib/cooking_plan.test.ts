import { describe, expect, test } from "bun:test";

import {
  availableSteps,
  normalizeSoloPlan,
  topologicalOrder,
  validateCookingPlan,
  type CookingPlan,
} from "./cooking_plan";

function validPlan(): CookingPlan {
  return {
    servings: 2,
    summary: "Паста з томатним соусом",
    ingredients: [{ id: "tomatoes", name: "Томати", amount: "400 г", quantity: 400, unit: "г" }],
    equipment: [{ id: "pan", name: "Сковорода", capacity: 1 }],
    steps: [
      {
        id: "chop",
        title: "Наріжте томати",
        body: "Наріжте томати кубиками.",
        kind: "task",
        slots: [1],
        dependsOn: [],
        activeMinutes: 10,
        equipment: [],
        checklist: [{ id: "wash", label: "Помити томати" }],
        timers: [],
      },
      {
        id: "cook",
        title: "Приготуйте соус",
        body: "Тушкуйте томати до м'якості.",
        kind: "task",
        slots: [2],
        dependsOn: ["chop"],
        activeMinutes: 15,
        equipment: ["pan"],
        checklist: [],
        timers: [{ id: "simmer", label: "Тушкування", durationSeconds: 900 }],
      },
    ],
  };
}

describe("validateCookingPlan", () => {
  test("accepts a bounded plan and derives its typed contract", () => {
    const plan = validateCookingPlan(validPlan(), 2);

    expect(plan.steps).toHaveLength(2);
  });

  test("validates optional timer placement within its own checklist", () => {
    const anchored = validPlan();
    anchored.steps[0].timers = [
      { id: "rest", label: "Відпочинок", durationSeconds: 300, afterChecklistItemId: "wash" },
    ];
    expect(() => validateCookingPlan(anchored, 2)).not.toThrow();

    const unknown = validPlan();
    unknown.steps[0].timers = [
      { id: "rest", label: "Відпочинок", durationSeconds: 300, afterChecklistItemId: "unknown" },
    ];
    expect(() => validateCookingPlan(unknown, 2)).toThrow("same step");

    const crossStep = validPlan();
    crossStep.steps[1].timers = [
      { id: "rest", label: "Відпочинок", durationSeconds: 300, afterChecklistItemId: "wash" },
    ];
    expect(() => validateCookingPlan(crossStep, 2)).toThrow("same step");

    expect(() => validateCookingPlan(validPlan(), 2)).not.toThrow();
  });

  test("rejects cyclic, missing, self, and duplicate dependencies", () => {
    const cyclic = validPlan();
    cyclic.steps[0].dependsOn = ["cook"];
    expect(() => validateCookingPlan(cyclic, 2)).toThrow("cycle");

    const missing = validPlan();
    missing.steps[1].dependsOn = ["missing"];
    expect(() => validateCookingPlan(missing, 2)).toThrow("Unknown dependency");

    const self = validPlan();
    self.steps[0].dependsOn = ["chop"];
    expect(() => validateCookingPlan(self, 2)).toThrow("cannot depend on itself");

    const duplicate = validPlan();
    duplicate.steps[1].dependsOn = ["chop", "chop"];
    expect(() => validateCookingPlan(duplicate, 2)).toThrow("dependencies must be distinct");
  });

  test("rejects invalid cook slots and handoffs", () => {
    const outOfRange = validPlan();
    outOfRange.steps[1].slots = [3];
    expect(() => validateCookingPlan(outOfRange, 2)).toThrow("outside 1..2");

    const invalidHandoff = validPlan();
    invalidHandoff.steps[1].kind = "handoff";
    invalidHandoff.steps[1].slots = [2];
    expect(() => validateCookingPlan(invalidHandoff, 2)).toThrow("sender and recipient");

    const repeatedHandoff = validPlan();
    repeatedHandoff.steps[1].kind = "handoff";
    repeatedHandoff.steps[1].slots = [1, 1];
    expect(() => validateCookingPlan(repeatedHandoff, 2)).toThrow("slots must be distinct");
  });

  test("rejects shared work in a solo plan", () => {
    const shared = validPlan();
    shared.steps[1].kind = "together";
    shared.steps[1].slots = [1, 2];

    expect(() => validateCookingPlan(shared, 1)).toThrow("outside 1..1");
  });

  test("rejects unknown keys, unresolved resources, and malicious values", () => {
    const unknown = { ...validPlan(), unexpected: true };
    expect(() => validateCookingPlan(unknown, 2)).toThrow("Unrecognized key");

    const unresolved = validPlan();
    unresolved.steps[1].equipment = ["oven"];
    expect(() => validateCookingPlan(unresolved, 2)).toThrow("Unknown equipment");

    const nonFinite = validPlan();
    nonFinite.ingredients[0].quantity = Number.POSITIVE_INFINITY;
    expect(() => validateCookingPlan(nonFinite, 2)).toThrow("Invalid input");

    const oversized = validPlan();
    oversized.steps[0].body = "x".repeat(6_001);
    expect(() => validateCookingPlan(oversized, 2)).toThrow("6000");
  });
});

describe("plan ordering", () => {
  test("keeps source order among available steps and releases dependencies", () => {
    const source = validPlan();
    source.steps[1].dependsOn = [];
    const plan = validateCookingPlan(source, 2);

    expect(topologicalOrder(plan).map((step) => step.id)).toEqual(["chop", "cook"]);
    expect(availableSteps(plan, new Set()).map((step) => step.id)).toEqual(["chop", "cook"]);
    expect(availableSteps(plan, new Set(["chop"])).map((step) => step.id)).toEqual(["cook"]);
  });

  test("serializes a plan for solo cooking", () => {
    const source = validPlan();
    source.steps = [source.steps[1], source.steps[0]];
    const plan = validateCookingPlan(source, 2);
    const solo = normalizeSoloPlan(plan);

    expect(solo.steps.map((step) => [step.id, step.kind, step.slots, step.dependsOn])).toEqual([
      ["chop", "task", [1], []],
      ["cook", "task", [1], ["chop"]],
    ]);
    expect(() => validateCookingPlan(solo, 1)).not.toThrow();
  });
});
