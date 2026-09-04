import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { ADDRESS_MAX_CHARACTERS } from "./lib/ai_config";
import { findUser, getOrCreateUser } from "./lib/users";
import { silpoCartContextValidator, silpoProfileValidator, silpoTokensValidator } from "./schema";

export const AUTH_STATE_TTL_MS = 10 * 60_000;

export async function findConnection(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"silpoConnections"> | null> {
  return ctx.db
    .query("silpoConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const connectionDocValidator = v.object({
  _id: v.id("silpoConnections"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tokens: silpoTokensValidator,
  tokensSavedAt: v.number(),
  profile: v.optional(silpoProfileValidator),
  address: v.optional(v.string()),
  cart: v.optional(silpoCartContextValidator),
  cartError: v.optional(v.string()),
  cartPending: v.optional(v.boolean()),
});

// Public projection: tokens and the address never leave the server.
export const connection = query({
  args: SessionIdArg,
  returns: v.union(
    v.null(),
    v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      hasAddress: v.boolean(),
      hasCart: v.boolean(),
      cartPending: v.boolean(),
      cartError: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);
    const found = user ? await findConnection(ctx, user._id) : null;

    if (!found) {
      return null;
    }

    return {
      name: found.profile?.name,
      phone: found.profile?.phone,
      hasAddress: found.address !== undefined,
      hasCart: found.cart !== undefined,
      cartPending: found.cartPending === true,
      cartError: found.cartError,
    };
  },
});

export const disconnect = mutation({
  args: SessionIdArg,
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);
    const found = user ? await findConnection(ctx, user._id) : null;

    if (found) {
      await ctx.db.delete(found._id);
    }

    return null;
  },
});

export const forgetAddress = mutation({
  args: SessionIdArg,
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);
    const found = user ? await findConnection(ctx, user._id) : null;

    if (found) {
      await ctx.db.patch(found._id, {
        address: undefined,
        cart: undefined,
        cartError: undefined,
        cartPending: undefined,
      });
    }

    return null;
  },
});

// The address is stored server side only; the cart is set up by a scheduled action.
export const saveAddress = mutation({
  args: { ...SessionIdArg, address: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, address }) => {
    const text = address.trim().replace(/\s+/g, " ");

    if (text.length < 5 || text.length > ADDRESS_MAX_CHARACTERS) {
      return { ok: false as const, message: "Вкажи місто, вулицю і будинок." };
    }

    const user = await findUser(ctx, sessionId);
    const found = user ? await findConnection(ctx, user._id) : null;

    if (!user || !found) {
      return { ok: false as const, message: "Спочатку підключи Сільпо." };
    }

    if (found.cartPending) {
      return { ok: false as const, message: "Кошик уже готується. Зачекай кілька секунд." };
    }

    await ctx.db.patch(found._id, {
      address: text,
      cart: undefined,
      cartError: undefined,
      cartPending: true,
    });
    await ctx.scheduler.runAfter(0, internal.silpoCart.setupCart, {
      userId: user._id,
      threadId: user.activeThreadId,
    });

    return { ok: true as const };
  },
});

export const saveCartContext = internalMutation({
  args: { userId: v.id("users"), cart: silpoCartContextValidator },
  returns: v.null(),
  handler: async (ctx, { userId, cart }) => {
    const found = await findConnection(ctx, userId);

    if (found) {
      await ctx.db.patch(found._id, { cart, cartError: undefined, cartPending: false });
    }

    return null;
  },
});

export const saveCartError = internalMutation({
  args: { userId: v.id("users"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, message }) => {
    const found = await findConnection(ctx, userId);

    if (found) {
      await ctx.db.patch(found._id, { cartError: message, cartPending: false });
    }

    return null;
  },
});

export const ensureUser = internalMutation({
  args: SessionIdArg,
  returns: v.id("users"),
  handler: async (ctx, { sessionId }) => (await getOrCreateUser(ctx, sessionId))._id,
});

export const oauthClient = internalQuery({
  args: { issuer: v.string(), redirectUri: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { issuer, redirectUri }) => {
    const found = await ctx.db
      .query("silpoOAuthClients")
      .withIndex("by_redirect", (q) => q.eq("issuer", issuer).eq("redirectUri", redirectUri))
      .first();

    return found?.clientInformation ?? null;
  },
});

export const saveOAuthClient = internalMutation({
  args: { issuer: v.string(), redirectUri: v.string(), clientInformation: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("silpoOAuthClients")
      .withIndex("by_redirect", (q) =>
        q.eq("issuer", args.issuer).eq("redirectUri", args.redirectUri),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("silpoOAuthClients", args);
    }

    return null;
  },
});

export const clearOAuthClient = internalMutation({
  args: { issuer: v.string(), redirectUri: v.string() },
  returns: v.null(),
  handler: async (ctx, { issuer, redirectUri }) => {
    const rows = await ctx.db
      .query("silpoOAuthClients")
      .withIndex("by_redirect", (q) => q.eq("issuer", issuer).eq("redirectUri", redirectUri))
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return null;
  },
});

export const createAuthState = internalMutation({
  args: { state: v.string(), userId: v.id("users"), codeVerifier: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("silpoAuthStates", { ...args, expiresAt: Date.now() + AUTH_STATE_TTL_MS });

    return null;
  },
});

// Single use: the row is deleted in the same transaction that reads it.
export const consumeAuthState = internalMutation({
  args: { state: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.id("users"), codeVerifier: v.string() })),
  handler: async (ctx, { state }) => {
    const found = await ctx.db
      .query("silpoAuthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .unique();

    if (!found) {
      return null;
    }

    await ctx.db.delete(found._id);

    return found.expiresAt > Date.now()
      ? { userId: found.userId, codeVerifier: found.codeVerifier }
      : null;
  },
});

export const connectionByUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), connectionDocValidator),
  handler: async (ctx, { userId }) => findConnection(ctx, userId),
});

export const saveTokens = internalMutation({
  args: { userId: v.id("users"), tokens: silpoTokensValidator },
  returns: v.null(),
  handler: async (ctx, { userId, tokens }) => {
    const existing = await findConnection(ctx, userId);
    const tokensSavedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { tokens, tokensSavedAt });
    } else {
      await ctx.db.insert("silpoConnections", { userId, tokens, tokensSavedAt });
    }

    return null;
  },
});

export const saveProfile = internalMutation({
  args: { userId: v.id("users"), profile: silpoProfileValidator },
  returns: v.null(),
  handler: async (ctx, { userId, profile }) => {
    const existing = await findConnection(ctx, userId);

    if (existing) {
      await ctx.db.patch(existing._id, { profile });
    }

    return null;
  },
});

export const deleteConnection = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const existing = await findConnection(ctx, userId);

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});
