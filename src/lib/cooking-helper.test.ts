import { expect, test } from "bun:test";
import { helperContextStep } from "./cooking-helper";

test("helper follows the active step unless the cook selects the whole dish", () => {
  const steps = [{ id: "prep" }, { id: "sauce" }];
  expect(helperContextStep(steps, undefined, "prep")).toBe("prep");
  expect(helperContextStep(steps, "", "prep")).toBeUndefined();
  expect(helperContextStep(steps, "sauce", "prep")).toBe("sauce");
});

test("removed helper context becomes the whole dish for display and sending", () => {
  expect(helperContextStep([{ id: "prep" }], "sauce", "prep")).toBeUndefined();
});
