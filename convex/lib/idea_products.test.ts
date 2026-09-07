import { expect, test } from "bun:test";
import { buildIdeaProducts, productsStatus } from "./idea_products";
import {
  createProductRegistry,
  recordProductFailure,
  recordProductCandidates,
  type ProductRegistry,
} from "./silpo_tools";

const registry: ProductRegistry = {
  attempted: true,
  candidates: new Map([
    ["рис", [{ productId: "rice-1", title: "Рис Сільпо", price: 70, oldPrice: 90 }]],
    ["шафран", []],
  ]),
};

test("preserves an unmatched ingredient even if the model omits it from products", () => {
  const products = buildIdeaProducts(
    [{ name: "Рис" }, { name: "Шафран" }],
    [{ ingredient: " рис ", quantity: 2, productId: "rice-1" }],
    registry,
  );
  expect(products[0]).toMatchObject({
    ingredient: "Рис",
    productId: "rice-1",
    price: 70,
    oldPrice: 90,
    quantity: 2,
  });
  expect(products[1]).toEqual({ ingredient: "Шафран", quantity: 1 });
  expect(
    products.filter((p) => p.productId).reduce((sum, p) => sum + (p.price ?? 0) * p.quantity, 0),
  ).toBe(140);
});

test("unverified IDs and omitted selections remain on the separate shopping list", () => {
  expect(
    buildIdeaProducts(
      [{ name: "Рис" }],
      [{ ingredient: "Рис", quantity: 2, productId: "invented" }],
      registry,
    ),
  ).toEqual([{ ingredient: "Рис", quantity: 1 }]);
  expect(buildIdeaProducts([{ name: "Рис" }, { name: "Шафран" }], [], registry)).toEqual([
    { ingredient: "Рис", quantity: 1 },
    { ingredient: "Шафран", quantity: 1 },
  ]);
});

test("only final ingredients become products, with normalized duplicates removed", () => {
  const result = buildIdeaProducts(
    [{ name: "Рис" }, { name: " рис " }],
    [
      { ingredient: "Рис", quantity: 1, productId: "rice-1" },
      { ingredient: "Креветки", quantity: 1, productId: "shrimp" },
    ],
    registry,
  );
  expect(result).toHaveLength(1);
  expect(result[0]?.ingredient).toBe("Рис");
});

test("marks unavailable and empty product searches without dropping ingredients", () => {
  expect(productsStatus({ attempted: true, status: "unavailable", candidates: new Map() })).toBe(
    "unavailable",
  );
  expect(productsStatus({ attempted: true, candidates: new Map([["рис", []]]) })).toBe("empty");
  expect(productsStatus(registry)).toBeUndefined();
});

test("a successful retry clears a previous unavailable status", () => {
  const retry = createProductRegistry();
  retry.status = "unavailable";
  recordProductCandidates(retry, [
    { ingredient: "Рис", quantity: 1, candidates: registry.candidates.get("рис") ?? [] },
  ]);
  expect(productsStatus(retry)).toBeUndefined();
});

test("a failure after verified matches keeps products available", () => {
  const retry = createProductRegistry();
  recordProductCandidates(retry, [
    { ingredient: "Рис", quantity: 1, candidates: registry.candidates.get("рис") ?? [] },
  ]);
  recordProductFailure(retry);
  expect(productsStatus(retry)).toBeUndefined();
});

test("reports connection and address prerequisites separately", () => {
  expect(productsStatus({ attempted: true, status: "not_connected", candidates: new Map() })).toBe(
    "not_connected",
  );
  expect(productsStatus({ attempted: true, status: "needs_address", candidates: new Map() })).toBe(
    "needs_address",
  );
});
