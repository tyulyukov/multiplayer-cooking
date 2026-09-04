import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import type { Doc, Id } from "../_generated/dataModel";
import { isReauthRequired, withSilpoClient } from "./silpo_client";
import { shapeProductCandidates } from "./silpo_shapes";

type CartContext = NonNullable<Doc<"silpoConnections">["cart"]>;

export const needsAddressNote =
  "Адреса доставки ще не вказана. Скажи людині, що для цін потрібна адреса, і попроси ввести її у формі під твоїм повідомленням.";

// The cart context is injected here so the model never sees branch or timeslot ids.
export function createSilpoTools(userId: Id<"users">, cart: CartContext | undefined) {
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
      if (!cart) {
        return { needsAddress: true, note: needsAddressNote, ingredients: [] };
      }

      try {
        const raw = await withSilpoClient(ctx, userId, (client) =>
          client.callTool("silpo_find_products_batch", {
            products: items.map((item) => item.query),
            branchId: cart.branchId,
            deliveryType: cart.deliveryType,
            timeslotStart: cart.timeslot.start,
            timeslotEnd: cart.timeslot.end,
            limit: 5,
          }),
        );

        return { needsAddress: false, ingredients: shapeProductCandidates(items, raw) };
      } catch (error) {
        console.error("silpo_find_products failed", error);

        return {
          needsAddress: false,
          ingredients: [],
          note: isReauthRequired(error)
            ? "Сесія Сільпо закінчилась. Попроси людину натиснути «Перепідключити» в меню."
            : "Сільпо не відповіло. Скажи, що ціни зараз недоступні, і запропонуй спробувати пізніше.",
        };
      }
    },
  });

  return { silpo_find_products };
}
