import { describe, expect, test } from "bun:test";

import {
  cartTotal,
  chooseDelivery,
  chooseTimeslot,
  findObjectArray,
  readCartId,
  readCartSummary,
  readCheckoutLink,
  shapeAddress,
  shapeProductCandidates,
} from "./silpo_shapes";

describe("findObjectArray", () => {
  test("finds the first array of objects at the top or one level down", () => {
    expect(findObjectArray([{ a: 1 }, "x"])).toEqual([{ a: 1 }]);
    expect(findObjectArray({ success: true, data: { items: [{ a: 1 }] } })).toEqual([{ a: 1 }]);
    expect(findObjectArray({ count: 0 })).toEqual([]);
    expect(findObjectArray("text")).toEqual([]);
  });
});

describe("shapeAddress", () => {
  test("reads coordinates and address parts from the first result", () => {
    const payload = {
      results: [
        {
          latitude: "46.48",
          longitude: 30.72,
          city: "Одеса",
          street: "пров. Семафорний",
          houseNumber: "4",
        },
      ],
    };

    expect(shapeAddress(payload)).toEqual({
      latitude: 46.48,
      longitude: 30.72,
      city: "Одеса",
      street: "пров. Семафорний",
      house: "4",
      district: undefined,
    });
  });

  test("returns null without coordinates", () => {
    expect(shapeAddress({ results: [{ city: "Одеса" }] })).toBeNull();
    expect(shapeAddress(null)).toBeNull();
  });
});

describe("chooseDelivery", () => {
  test("prefers home delivery and skips options without a branch", () => {
    const payload = {
      deliveryTypes: [
        { deliveryType: "SelfPickup", branchId: "b1" },
        { deliveryType: "DeliveryHome", branchId: null },
        { deliveryType: "WideAssortDelivery", branchId: "b2" },
      ],
    };

    expect(chooseDelivery(payload)).toEqual({ deliveryType: "WideAssortDelivery", branchId: "b2" });
  });

  test("returns null when nothing usable is offered", () => {
    expect(chooseDelivery({ deliveryTypes: [] })).toBeNull();
  });
});

describe("chooseTimeslot", () => {
  test("takes the first available future slot", () => {
    const now = Date.parse("2026-09-04T10:00:00Z");
    const payload = [
      { start: "2026-09-04T08:00:00Z", end: "2026-09-04T09:00:00Z" },
      { start: "2026-09-04T12:00:00Z", end: "2026-09-04T13:00:00Z", available: false },
      { start: "2026-09-04T14:00:00Z", end: "2026-09-04T15:00:00Z", available: true },
    ];

    expect(chooseTimeslot(payload, now)).toEqual({
      start: "2026-09-04T14:00:00Z",
      end: "2026-09-04T15:00:00Z",
    });
  });
});

describe("cart readers", () => {
  test("reads the total and keeps only warning or error validations", () => {
    const payload = {
      cart: {
        calculation: {
          total: 826.32,
          productsTotal: 727.32,
          validations: [
            { level: "info", type: "order", message: "order.payment_types.disabled" },
            { level: "error", type: "product", message: "product.offer.stock.max" },
            { level: "error", type: "product", message: "product.offer.stock.max" },
          ],
        },
      },
    };

    expect(readCartSummary(payload)).toEqual({
      total: 826.32,
      warnings: ["Деяких товарів на складі менше, ніж додано; кількість зменшено."],
    });
    expect(readCartSummary({})).toEqual({ total: undefined, warnings: [] });
  });

  test("reads the cart id and the checkout link", () => {
    expect(readCartId({ success: true, shoppingCartId: "cart-1" })).toBe("cart-1");
    expect(readCheckoutLink({ cart: { checkoutWebLink: "https://silpo.ua/checkout/1" } })).toBe(
      "https://silpo.ua/checkout/1",
    );
    expect(readCheckoutLink("nope")).toBeUndefined();
  });
});

describe("shapeProductCandidates", () => {
  const requests = [
    { ingredient: "Кабачки", query: "кабачок", quantity: 2 },
    { ingredient: "Пармезан", query: "пармезан", quantity: 1 },
  ];

  test("maps candidates back by query, skips unavailable, keeps unmatched ingredients", () => {
    const payload = {
      success: true,
      queries: [
        {
          query: "пармезан",
          totalFound: 2,
          products: [
            {
              id: "p2",
              name: "Пармезан 200 г",
              price: 189.9,
              companyId: "c",
              branchId: "b",
              displayRatio: "200г",
              stock: 5,
            },
            { id: "p3", name: "Пармезан тертий", price: 99, available: false },
          ],
        },
        { query: "кабачок", totalFound: 0, products: [] },
      ],
    };

    expect(shapeProductCandidates(requests, payload)).toEqual([
      { ingredient: "Кабачки", quantity: 2, candidates: [] },
      {
        ingredient: "Пармезан",
        quantity: 1,
        candidates: [
          {
            productId: "p2",
            companyId: "c",
            branchId: "b",
            title: "Пармезан 200 г",
            price: 189.9,
            unit: "200г",
            stock: 5,
          },
        ],
      },
    ]);
  });

  test("falls back to positional groups and caps the candidates", () => {
    const payload = [
      [
        { id: "p1", name: "Кабачок", price: "45" },
        { id: "p4", name: "Кабачок міні", price: 60 },
        { id: "p5", name: "Кабачок жовтий", price: 70 },
        { id: "p6", name: "Кабачок біо", price: 80 },
      ],
      [],
    ];
    const [first] = shapeProductCandidates(requests, payload);

    expect(first.candidates).toHaveLength(3);
    expect(first.candidates[0]).toMatchObject({ productId: "p1", title: "Кабачок", price: 45 });
  });

  test("sums the total over matched products", () => {
    expect(
      cartTotal([
        { ingredient: "a", quantity: 2, price: 10 },
        { ingredient: "b", quantity: 1 },
      ]),
    ).toBe(20);
  });
});
