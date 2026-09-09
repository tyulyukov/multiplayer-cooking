import { productRegistryKey } from "./ingredient";
export { productRegistryKey } from "./ingredient";
import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import type { Doc, Id } from "../_generated/dataModel";
import { isReauthRequired, withSilpoClient } from "./silpo_client";
import { findSilpoProducts } from "./silpo_products";
import {
  shapeProductCandidates,
  type IngredientCandidates,
  type ProductCandidate,
} from "./silpo_shapes";

type CartContext = NonNullable<Doc<"silpoConnections">["cart"]>;

export type ProductRegistry = {
  attempted: boolean;
  status?: "not_connected" | "needs_address" | "unavailable";
  candidates: Map<string, readonly ProductCandidate[]>;
};

export function createProductRegistry(): ProductRegistry {
  return { attempted: false, candidates: new Map() };
}

export function recordProductCandidates(
  registry: ProductRegistry,
  ingredients: readonly IngredientCandidates[],
) {
  registry.status = undefined;
  for (const item of ingredients) {
    registry.candidates.set(productRegistryKey(item.ingredient), item.candidates);
  }
}

export function recordProductFailure(registry: ProductRegistry) {
  if (![...registry.candidates.values()].some((candidates) => candidates.length > 0)) {
    registry.status = "unavailable";
  }
}

export const needsAddressNote =
  "Адреса доставки ще не вказана. Скажи людині, що для цін потрібна адреса, і попроси ввести її у формі під твоїм повідомленням.";

// The cart context is injected here so the model never sees branch or timeslot ids.
export function createSilpoTools(
  userId: Id<"users">,
  cart: CartContext | undefined,
  registry: ProductRegistry,
  connected: boolean,
) {
  const silpo_find_products = createTool({
    description:
      "Шукає продукти Сільпо для інгредієнтів. Один запит на інгредієнт. Для кожного повертає до 3 кандидатів з productId, companyId, branchId, назвою, ціною, фасуванням і залишком; вибери один доречний або жодного.",
    inputSchema: z.object({
      items: z
        .array(
          z.object({
            ingredient: z.string().min(1).max(80).describe("Назва інгредієнта з ідеї"),
            query: z.string().min(2).max(60).describe("Пошуковий запит українською, 1–3 слова"),
            quantity: z.number().int().min(1).max(20).default(1).describe("Кількість упаковок"),
          }),
        )
        .min(1)
        .max(30),
    }),
    execute: async (ctx, { items }) => {
      registry.attempted = true;

      if (!connected) {
        registry.status = "not_connected";
        return {
          needsAddress: false,
          ingredients: [],
          note: "Сільпо не підключено. Попроси людину підключити його в меню.",
        };
      }

      if (!cart) {
        registry.status = "needs_address";
        return { needsAddress: true, note: needsAddressNote, ingredients: [] };
      }

      try {
        const raw = await withSilpoClient(ctx, userId, (client) =>
          findSilpoProducts(client, cart, items),
        );

        const ingredients = shapeProductCandidates(items, raw);

        recordProductCandidates(registry, ingredients);

        return { needsAddress: false, ingredients };
      } catch (error) {
        console.error("silpo_find_products failed", error);

        const note = isReauthRequired(error)
          ? "Сесія Сільпо закінчилась. Попроси людину натиснути «Перепідключити» в меню."
          : "Сільпо не відповіло. Скажи, що ціни зараз недоступні, і запропонуй спробувати пізніше.";
        recordProductFailure(registry);
        return {
          needsAddress: false,
          ingredients: [],
          note,
        };
      }
    },
  });

  return { silpo_find_products };
}
