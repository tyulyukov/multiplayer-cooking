import { expect, test } from "bun:test";
import { convertCookingQuantity, isCookingUnit, parseCookingQuantity } from "./cooking-units";

test("converts mass using exact international ounce and pound values", () => {
  expect(convertCookingQuantity(1, "lb", "g")).toBe(453.59237);
  expect(convertCookingQuantity(16, "oz", "lb")).toBe(1);
  expect(convertCookingQuantity(250, "g", "kg")).toBe(0.25);
});

test("distinguishes a 250 ml glass from a US cup", () => {
  expect(convertCookingQuantity(1, "cup", "ml")).toBe(250);
  expect(convertCookingQuantity(1, "usCup", "ml")).toBe(236.5882365);
  expect(convertCookingQuantity(1, "tbsp", "tsp")).toBe(3);
});

test("never assumes density to convert volume to mass", () => {
  expect(convertCookingQuantity(250, "ml", "g")).toBeNull();
  expect(convertCookingQuantity(1, "kg", "l")).toBeNull();
  expect(convertCookingQuantity(180, "C", "g")).toBeNull();
});

test("converts oven and freezer temperatures in both directions", () => {
  expect(convertCookingQuantity(180, "C", "F")).toBe(356);
  expect(convertCookingQuantity(32, "F", "C")).toBe(0);
  expect(convertCookingQuantity(-18, "C", "F")).toBeCloseTo(-0.4);
});

test("rejects invalid quantities without displaying an invented result", () => {
  expect(convertCookingQuantity(-1, "g", "kg")).toBeNull();
  expect(convertCookingQuantity(-300, "C", "F")).toBeNull();
  expect(convertCookingQuantity(NaN, "g", "g")).toBeNull();
  expect(convertCookingQuantity(Infinity, "C", "F")).toBeNull();
  expect(convertCookingQuantity(Number.MAX_VALUE, "C", "F")).toBeNull();
  expect(convertCookingQuantity(Number.MAX_VALUE, "kg", "g")).toBeNull();
  expect(convertCookingQuantity(0, "g", "kg")).toBe(0);
});

test("accepts Ukrainian decimal input and rejects empty or malformed input", () => {
  expect(parseCookingQuantity(" 1,5 ")).toBe(1.5);
  expect(parseCookingQuantity("-18")).toBe(-18);
  expect(parseCookingQuantity(".25")).toBe(0.25);
  for (const input of ["", " ", "1,2,3", "100г", "Infinity", "1e10", "0x10"]) {
    expect(parseCookingQuantity(input)).toBeNull();
  }
  expect(isCookingUnit("g")).toBe(true);
  expect(isCookingUnit("toString")).toBe(false);
});
