import { describe, expect, test } from "bun:test";

import type { SilpoClient } from "./silpo_client";
import { findSilpoProducts } from "./silpo_products";

type Cart = Parameters<typeof findSilpoProducts>[1];
type Call = Readonly<{ name: string; args: Record<string, unknown> }>;

const now = Date.parse("2026-09-08T10:00:00Z");
const items = [
  { ingredient: "Кабачки", query: "кабачок", quantity: 2 },
  { ingredient: "Пармезан", query: "пармезан", quantity: 1 },
] as const;

function cart(start: string): Cart {
  return {
    shoppingCartId: "cart-1",
    branchId: "branch-1",
    deliveryType: "WideAssortDelivery",
    timeslot: { start, end: "2026-09-08T11:00:00Z" },
  };
}

function client(
  callTool: SilpoClient["callTool"],
): Readonly<{ client: SilpoClient; calls: Call[] }> {
  const calls: Call[] = [];

  return {
    client: {
      callTool: async (name, args) => {
        calls.push({ name, args });
        return callTool(name, args);
      },
      listTools: async () => [],
    },
    calls,
  };
}

describe("findSilpoProducts", () => {
  test("refreshes an expired slot before searching with the refreshed slot", async () => {
    const products = { queries: [{ query: "кабачок", products: [{ id: "p1", name: "Кабачок" }] }] };
    const fixture = client(async (name, args) => {
      if (name === "silpo_get_time_slots") {
        return [{ start: "2026-09-08T12:00:00Z", end: "2026-09-08T13:00:00Z", available: true }];
      }

      return args.timeslotStart === "2026-09-08T12:00:00Z" ? products : { queries: [] };
    });

    await expect(
      findSilpoProducts(fixture.client, cart("2026-09-08T09:00:00Z"), items, now),
    ).resolves.toEqual(products);

    expect(fixture.calls).toEqual([
      {
        name: "silpo_get_time_slots",
        args: {
          branchId: "branch-1",
          deliveryTypes: ["WideAssortDelivery"],
          start: "2026-09-08T10:00:00Z",
          limit: 20,
        },
      },
      {
        name: "silpo_find_products_batch",
        args: {
          products: ["кабачок", "пармезан"],
          branchId: "branch-1",
          deliveryType: "WideAssortDelivery",
          timeslotStart: "2026-09-08T12:00:00Z",
          timeslotEnd: "2026-09-08T13:00:00Z",
          limit: 5,
        },
      },
    ]);
  });

  test("searches with a current slot without refreshing it", async () => {
    const fixture = client(async () => ({ products: [] }));

    await findSilpoProducts(fixture.client, cart("2026-09-08T10:00:01Z"), items, now);

    expect(fixture.calls).toEqual([
      {
        name: "silpo_find_products_batch",
        args: {
          products: ["кабачок", "пармезан"],
          branchId: "branch-1",
          deliveryType: "WideAssortDelivery",
          timeslotStart: "2026-09-08T10:00:01Z",
          timeslotEnd: "2026-09-08T11:00:00Z",
          limit: 5,
        },
      },
    ]);
  });

  test.each([
    ["a malformed", "not-a-date"],
    ["a boundary", "2026-09-08T10:00:00Z"],
  ])("refreshes %s stored start", async (_, start) => {
    const fixture = client(async (name) => {
      if (name === "silpo_get_time_slots") {
        return [{ start: "2026-09-08T12:00:00Z", end: "2026-09-08T13:00:00Z", available: true }];
      }

      return { products: [] };
    });

    await findSilpoProducts(fixture.client, cart(start), items, now);

    expect(fixture.calls.map((call) => call.name)).toEqual([
      "silpo_get_time_slots",
      "silpo_find_products_batch",
    ]);
  });

  test("rejects unavailable refreshed slots without searching", async () => {
    const fixture = client(async () => [
      { start: "2026-09-08T12:00:00Z", end: "2026-09-08T13:00:00Z", available: false },
    ]);

    await expect(
      findSilpoProducts(fixture.client, cart("2026-09-08T09:00:00Z"), items, now),
    ).rejects.toThrow("Немає вільних слотів доставки. Спробуй пізніше.");

    expect(fixture.calls.map((call) => call.name)).toEqual(["silpo_get_time_slots"]);
  });

  test("propagates a failed slot refresh without searching", async () => {
    const failure = new Error("slot service failed");
    const fixture = client(async () => Promise.reject(failure));

    await expect(
      findSilpoProducts(fixture.client, cart("2026-09-08T09:00:00Z"), items, now),
    ).rejects.toBe(failure);

    expect(fixture.calls.map((call) => call.name)).toEqual(["silpo_get_time_slots"]);
  });
});
