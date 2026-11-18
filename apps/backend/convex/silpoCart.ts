"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { describeSilpoError, type SilpoClient, withSilpoClient } from "./lib/silpo_client";
import {
  chooseDelivery,
  chooseTimeslot,
  readCartId,
  readCartLines,
  readCartSummary,
  type CartLine,
  readCheckoutLink,
  readAddress,
} from "./lib/silpo_shapes";

const cartFollowUp = "Адресу доставки збережено. Підбери продукти в Сільпо для цієї страви.";

// Builds the Сільпо cart that product tools need: address, delivery type, timeslot, cart.
export const setupCart = internalAction({
  args: { userId: v.id("users"), threadId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { userId: requestedUserId, threadId }) => {
    const userId = await ctx.runQuery(internal.accounts.resolveUserId, { userId: requestedUserId });
    const connection = await ctx.runQuery(internal.silpo.connectionByUser, { userId });

    if (!connection?.address) {
      return null;
    }

    const address = connection.address;

    try {
      const cart = await withSilpoClient(ctx, userId, async (client) => {
        const found = readAddress(await client.callTool("silpo_find_address", { address }));

        if (!found) {
          throw new Error("Сільпо не знайшло цю адресу. Перевір місто, вулицю і будинок.");
        }

        const delivery = chooseDelivery(
          await client.callTool("silpo_get_available_delivery_types", {
            latitude: found.latitude,
            longitude: found.longitude,
          }),
        );

        if (!delivery) {
          throw new Error("За цією адресою Сільпо поки не доставляє.");
        }

        const timeslot = chooseTimeslot(
          await client.callTool("silpo_get_time_slots", {
            branchId: delivery.branchId,
            deliveryTypes: [delivery.deliveryType],
            // The API rejects fractional seconds in ISO timestamps.
            start: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
            limit: 20,
          }),
        );

        if (!timeslot) {
          throw new Error("Немає вільних слотів доставки. Спробуй пізніше.");
        }

        const created = await client.callTool("silpo_create_shopping_cart", {
          addressType: "flat",
          latitude: found.latitude,
          longitude: found.longitude,
          city: found.city,
          street: found.street,
          house: found.house,
          district: found.district,
          deliveryType: delivery.deliveryType,
          timeslot,
          branchId: delivery.branchId,
        });

        const shoppingCartId = readCartId(created);

        if (!shoppingCartId) {
          throw new Error("Сільпо не повернуло кошик.");
        }

        return {
          shoppingCartId,
          branchId: delivery.branchId,
          deliveryType: delivery.deliveryType,
          timeslot,
        };
      });

      const saved = await ctx.runMutation(internal.silpo.saveCartContext, {
        userId,
        expectedAddress: address,
        cart,
      });

      if (saved && threadId) {
        await ctx.runMutation(internal.chat.followUp, { userId, threadId, text: cartFollowUp });
      }
    } catch (error) {
      console.error("Silpo cart setup failed", error);
      await ctx.runMutation(internal.silpo.saveCartError, {
        userId,
        expectedAddress: address,
        message: describeSilpoError(error),
      });
    }

    return null;
  },
});

type CartContext = NonNullable<Doc<"silpoConnections">["cart"]>;

type CartProduct = NonNullable<Doc<"ideas">["products"]>[number] & { productId: string };

// Сільпо split its cart write: new products go through silpo_add_cart_products, products
// already in the cart get an absolute quantity by line id through silpo_update_cart_products.
async function writeProducts(
  client: Pick<SilpoClient, "callTool">,
  context: CartContext,
  products: readonly CartProduct[],
  lines: readonly CartLine[],
) {
  const quantities = new Map<string, CartProduct>();

  for (const product of products) {
    const previous = quantities.get(product.productId);

    quantities.set(
      product.productId,
      previous ? { ...previous, quantity: previous.quantity + product.quantity } : product,
    );
  }

  const lineIds = new Map(lines.map((line) => [line.productId, line.id]));
  const merged = [...quantities.values()];
  const added = merged.filter((product) => !lineIds.has(product.productId));

  const updated = merged.flatMap((product) => {
    const id = lineIds.get(product.productId);

    return id ? [{ id, quantity: product.quantity }] : [];
  });

  if (added.length > 0) {
    await client.callTool("silpo_add_cart_products", {
      shoppingCartId: context.shoppingCartId,
      products: added.map((product) => ({
        productId: product.productId,
        companyId: product.companyId,
        branchId: product.branchId ?? context.branchId,
        quantity: product.quantity,
      })),
    });
  }

  if (updated.length > 0) {
    await client.callTool("silpo_update_cart_products", {
      shoppingCartId: context.shoppingCartId,
      products: updated,
    });
  }
}

const missingWarning = "Частини товарів Сільпо не додало до кошика. Перевір його перед оплатою.";

function withMissingWarning(warnings: readonly string[], missing: number) {
  const all = missing > 0 ? [missingWarning, ...warnings] : [...warnings];

  return all.length > 0 ? all : undefined;
}

export const addIdeaToCart = internalAction({
  args: { ideaId: v.id("ideas"), userId: v.id("users"), refreshOnly: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { ideaId, userId: requestedUserId, refreshOnly }) => {
    const userId = await ctx.runQuery(internal.accounts.resolveUserId, { userId: requestedUserId });

    const [idea, connection] = await Promise.all([
      ctx.runQuery(internal.ideas.get, { ideaId }),
      ctx.runQuery(internal.silpo.connectionByUser, { userId }),
    ]);

    const context = connection?.cart;

    const products =
      idea?.products?.filter((product): product is CartProduct => Boolean(product.productId)) ?? [];

    if (!idea || idea.userId !== connection?.userId || !context || products.length === 0) {
      await ctx.runMutation(internal.ideas.saveCartError, {
        ideaId,
        message: "Кошик Сільпо ще не готовий. Вкажи адресу доставки.",
      });

      return null;
    }

    try {
      const cart = await withSilpoClient(ctx, userId, async (client) => {
        const readCart = () =>
          client.callTool("silpo_get_shopping_cart_by_id", {
            shoppingCartId: context.shoppingCartId,
          });

        if (!refreshOnly) {
          await writeProducts(client, context, products, readCartLines(await readCart()));
        }

        const details = await readCart();
        const inCart = new Set(readCartLines(details).map((line) => line.productId));

        const missing = refreshOnly
          ? 0
          : products.filter((product) => !inCart.has(product.productId)).length;

        const summary = readCartSummary(details);

        return {
          checkoutWebLink: readCheckoutLink(details),
          itemCount: products.length,
          productsTotal: summary.productsTotal,
          subtotal: summary.subtotal,
          discount: summary.discount,
          deliveryTotal: summary.deliveryTotal,
          total: summary.total,
          warnings: withMissingWarning(summary.warnings, missing),
          addedAt: Date.now(),
        };
      });

      await ctx.runMutation(internal.ideas.saveCart, { ideaId, cart });
    } catch (error) {
      console.error("Silpo add to cart failed", error);
      await ctx.runMutation(internal.ideas.saveCartError, {
        ideaId,
        message: describeSilpoError(error),
      });
    }

    return null;
  },
});
