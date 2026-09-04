"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { describeSilpoError, withSilpoClient } from "./lib/silpo_client";
import {
  chooseDelivery,
  chooseTimeslot,
  readCartId,
  readCartSummary,
  readCheckoutLink,
  shapeAddress,
} from "./lib/silpo_shapes";

const cartFollowUp = "Адресу доставки збережено. Підбери продукти в Сільпо для цієї страви.";

// Builds the Сільпо cart that product tools need: address, delivery type, timeslot, cart.
export const setupCart = internalAction({
  args: { userId: v.id("users"), threadId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { userId, threadId }) => {
    const connection = await ctx.runQuery(internal.silpo.connectionByUser, { userId });

    if (!connection?.address) {
      await ctx.runMutation(internal.silpo.saveCartError, {
        userId,
        message: "Адреса доставки не збережена.",
      });
      return null;
    }

    const address = connection.address;

    try {
      const cart = await withSilpoClient(ctx, userId, async (client) => {
        const found = shapeAddress(await client.callTool("silpo_find_address", { address }));

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

      await ctx.runMutation(internal.silpo.saveCartContext, { userId, cart });

      if (threadId) {
        await ctx.runMutation(internal.chat.followUp, { userId, threadId, text: cartFollowUp });
      }
    } catch (error) {
      console.error("Silpo cart setup failed", error);
      await ctx.runMutation(internal.silpo.saveCartError, {
        userId,
        message: describeSilpoError(error),
      });
    }

    return null;
  },
});

export const addIdeaToCart = internalAction({
  args: { ideaId: v.id("ideas"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { ideaId, userId }) => {
    const [idea, connection] = await Promise.all([
      ctx.runQuery(internal.ideas.get, { ideaId }),
      ctx.runQuery(internal.silpo.connectionByUser, { userId }),
    ]);
    const context = connection?.cart;
    const products = idea?.products?.filter((product) => product.productId) ?? [];

    if (!idea || idea.userId !== userId || !context || products.length === 0) {
      await ctx.runMutation(internal.ideas.saveCartError, {
        ideaId,
        message: "Кошик Сільпо ще не готовий. Вкажи адресу доставки.",
      });
      return null;
    }

    try {
      const cart = await withSilpoClient(ctx, userId, async (client) => {
        await client.callTool("silpo_add_or_update_cart_products", {
          shoppingCartId: context.shoppingCartId,
          products: products.map((product) => ({
            productId: product.productId,
            companyId: product.companyId,
            branchId: product.branchId ?? context.branchId,
            quantity: product.quantity,
            addQuantity: false,
          })),
        });

        const details = await client.callTool("silpo_get_shopping_cart_by_id", {
          shoppingCartId: context.shoppingCartId,
        });

        const summary = readCartSummary(details);

        return {
          checkoutWebLink: readCheckoutLink(details),
          itemCount: products.length,
          total: summary.total,
          warnings: summary.warnings.length > 0 ? summary.warnings : undefined,
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
