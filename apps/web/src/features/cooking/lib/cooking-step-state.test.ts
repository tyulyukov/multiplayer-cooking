import { describe, expect, test } from "bun:test";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { PlanStep, RuntimeStep } from "../model/types";
import { getCookingStepState } from "./cooking-step-state";

const fixture = () => {
  const step: PlanStep = {
    id: "prep",
    title: "Нарізати овочі",
    body: "Наріж овочі.",
    kind: "task",
    slots: [1],
    dependsOn: [],
    activeMinutes: 2,
    equipment: [],
    checklist: [{ id: "wash", label: "Помити" }],
    timers: [],
  };
  const runtime: RuntimeStep = {
    imageUrl: undefined,
    stepKey: step.id,
    status: "pending",
    slots: [1],
    readyMemberIds: [],
    checkedIds: [],
  };
  const me = {
    _id: "host" as Id<"cookingMembers">,
    name: "Оля",
    role: "host" as const,
    status: "active" as const,
    slots: [1],
    lastSeenAt: 0,
  };
  const input: Parameters<typeof getCookingStepState>[0] = {
    step,
    runtime,
    data: { me, members: [me], steps: [runtime], room: { state: "cooking", plan: undefined } },
    timers: [],
    actions: { online: true, busy: false },
  };
  return input;
};

describe("getCookingStepState", () => {
  test("дозволяє власний доступний крок, але зберігає непозначений checklist", () => {
    const state = getCookingStepState(fixture());
    expect(state.canInteract).toBe(true);
    expect(state.canComplete).toBe(true);
    expect(state.checked).toBe(false);
    expect(state.title).toBe("Твоє завдання");
  });

  test("враховує перепризначені runtime-місця", () => {
    const input = fixture();
    input.runtime!.slots = [2];
    expect(getCookingStepState(input).canAct).toBe(false);
  });

  test("блокує взаємодії без мережі, під час запиту та після завершення кімнати", () => {
    const input = fixture();
    input.actions = { online: false, busy: false };
    expect(getCookingStepState(input).canInteract).toBe(false);
    input.actions = { online: true, busy: true };
    expect(getCookingStepState(input).canInteract).toBe(false);
    input.actions = { online: true, busy: false };
    input.data.room.state = "done";
    expect(getCookingStepState(input).canAct).toBe(false);
  });

  test("залежний pending-крок чекає завершення попереднього", () => {
    const input = fixture();
    input.step.dependsOn = ["boil"];
    expect(getCookingStepState(input).blockers).toEqual(["boil"]);
    expect(getCookingStepState(input).canComplete).toBe(false);
    input.data.steps.push({ ...input.runtime!, stepKey: "boil", status: "done" });
    expect(getCookingStepState(input).canComplete).toBe(true);
  });

  test("спільний крок стає інтерактивним тільки в active-стані", () => {
    const input = fixture();
    input.step.kind = "together";
    expect(getCookingStepState(input).canInteract).toBe(false);
    input.runtime!.status = "active";
    expect(getCookingStepState(input).canInteract).toBe(true);
  });

  test("отримувач передачі чекає відправника", () => {
    const input = fixture();
    input.step.kind = "handoff";
    input.runtime!.slots = [2, 1];
    input.runtime!.status = "active";
    expect(getCookingStepState(input).recipient).toBe(true);
    expect(getCookingStepState(input).canInteract).toBe(false);
    expect(getCookingStepState(input).canComplete).toBe(false);
    input.runtime!.status = "waiting";
    expect(getCookingStepState(input).canInteract).toBe(true);
    expect(getCookingStepState(input).canComplete).toBe(true);
  });

  test("завершений крок зберігає позначки та не приймає нових взаємодій", () => {
    const input = fixture();
    input.runtime!.status = "done";
    input.runtime!.checkedIds = ["wash"];
    const state = getCookingStepState(input);
    expect(state.done).toBe(true);
    expect(state.checked).toBe(true);
    expect(state.canInteract).toBe(false);
  });
});
