import { expect, test } from "bun:test";
import { formatPrice, formatQuantity, itemsLabel, servingsLabel } from "./idea-format";

test("назви кількості товарів враховують 11–14", () => {
  for (const [count, label] of [
    [1, "1 товар"],
    [2, "2 товари"],
    [5, "5 товарів"],
    [11, "11 товарів"],
    [12, "12 товарів"],
    [21, "21 товар"],
    [24, "24 товари"],
  ] as const) {
    expect(itemsLabel(count)).toBe(label);
  }
});

test("формат цін, кількості та порцій залишається українським", () => {
  expect(formatPrice(25.5)).toBe(
    new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      maximumFractionDigits: 2,
    }).format(25.5),
  );
  expect(formatQuantity(1.25)).toBe("1,25");
  expect(servingsLabel(1)).toBe("1 порція");
  expect(servingsLabel(3)).toBe("3 порції");
  expect(servingsLabel(6)).toBe("6 порцій");
});
