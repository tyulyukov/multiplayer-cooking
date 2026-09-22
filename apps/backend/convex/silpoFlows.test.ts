import { expect, mock, test } from "bun:test";
import type { DefaultFunctionArgs, FunctionVisibility, RegisteredAction } from "convex/server";
import type { SessionId } from "convex-helpers/server/sessions";

import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const authCalls: Array<Record<string, unknown>> = [];
const profileCalls: Array<Record<string, unknown>> = [];
const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
const { parseVerifiedSilpoProfile } = await import("./lib/silpo_client");

mock.module("@modelcontextprotocol/sdk/client/auth.js", () => ({
  auth: async (provider: { saveTokens: (tokens: Record<string, unknown>) => Promise<void> }) => {
    authCalls.push({});
    await provider.saveTokens({
      access_token: "access",
      token_type: "Bearer",
      refresh_token: "refresh",
    });
    return "AUTHORIZED";
  },
}));

mock.module("./lib/silpo_oauth", () => ({
  SILPO_ISSUER: "https://mcp.silpo.ua",
  SILPO_MCP_URL: "https://mcp.silpo.ua/mcp",
  createSilpoAuthProvider: (
    _ctx: unknown,
    options: { saveStagedTokens?: (tokens: Record<string, unknown>) => Promise<void> },
  ) => ({
    saveTokens: async (tokens: Record<string, unknown>) => options.saveStagedTokens?.(tokens),
  }),
}));

mock.module("./lib/silpo_client", () => ({
  withSilpoClient: async (
    _ctx: unknown,
    _userId: unknown,
    run: (client: {
      callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    }) => Promise<unknown>,
  ) =>
    run({
      callTool: async (name, args) => {
        if (name === "silpo_get_my_profile") {
          profileCalls.push({});
          return { success: true, profile: { id: "customer-42", firstName: "Оля" } };
        }
        toolCalls.push({ name, args });
        if (name === "silpo_get_shopping_cart_by_id") {
          return {
            cart: {
              checkoutWebLink: "https://silpo.ua/checkout/cart-1",
              calculation: {
                productsTotal: 120,
                subTotal: 140,
                subDiscount: 20,
                totalAfterDiscounts: 150,
                delivery: { total: 10 },
              },
            },
          };
        }
        return {};
      },
    }),
  describeSilpoError: (error: unknown) => (error instanceof Error ? error.message : "unknown"),
  parseVerifiedSilpoProfile,
}));

const { finishConnect } = await import("./silpoAuth");
const { addIdeaToCart, setupCart } = await import("./silpoCart");

function handler<V extends FunctionVisibility, A extends DefaultFunctionArgs, R>(
  fn: RegisteredAction<V, A, R>,
): (ctx: ActionCtx, args: A) => R {
  const value: unknown = Reflect.get(fn, "_handler");
  if (typeof value !== "function") throw new Error("Missing registered Convex handler");
  return value as (ctx: ActionCtx, args: A) => R;
}

const userId = "user" as Id<"users">;
const ideaId = "idea" as Id<"ideas">;
const sessionId = "session" as SessionId;

test("rejects an OAuth callback whose state was already consumed without contacting Silpo", async () => {
  authCalls.length = 0;
  profileCalls.length = 0;
  const mutations: unknown[] = [];
  const ctx = {
    runMutation: async (reference: unknown, args: unknown) => {
      mutations.push({ reference, args });
      return null;
    },
  } as ActionCtx;

  await expect(
    handler(finishConnect)(ctx, { sessionId, state: "used", code: "code" }),
  ).resolves.toBe(false);

  expect(mutations).toHaveLength(1);
  expect(authCalls).toHaveLength(0);
  expect(profileCalls).toHaveLength(0);
});

test("links tokens only after Silpo returns a verified account profile", async () => {
  authCalls.length = 0;
  profileCalls.length = 0;
  const mutations: Array<{ reference: unknown; args: unknown }> = [];
  const ctx = {
    runMutation: async (reference: unknown, args: unknown) => {
      mutations.push({ reference, args });
      return mutations.length === 1
        ? { userId, sessionId: "session", authVersion: 3, codeVerifier: "verifier" }
        : userId;
    },
  } as ActionCtx;

  await expect(
    handler(finishConnect)(ctx, { sessionId, state: "fresh", code: "code" }),
  ).resolves.toBe(true);

  expect(authCalls).toHaveLength(1);
  expect(profileCalls).toHaveLength(1);
  expect(mutations).toHaveLength(2);
  expect(mutations[1]?.args).toEqual({
    sessionId: "session",
    authVersion: 3,
    sourceUserId: userId,
    accountId: "https://mcp.silpo.ua:customer-42",
    profile: { name: "Оля" },
    tokens: { access_token: "access", token_type: "Bearer", refresh_token: "refresh" },
  });
});

function idea(overrides: Partial<Doc<"ideas">> = {}): Doc<"ideas"> {
  return {
    _id: ideaId,
    _creationTime: 1,
    userId,
    threadId: "thread",
    promptMessageId: "prompt",
    title: "Вечеря",
    summary: "Швидка вечеря",
    body: "Опис",
    ingredients: [{ name: "Помідор" }],
    timeMinutes: 20,
    servings: 2,
    products: [
      { ingredient: "Помідор", quantity: 2, productId: "tomato", companyId: "silpo" },
      { ingredient: "Зелень", quantity: 1 },
    ],
    ...overrides,
  };
}

function cartContext(sourceIdea: Doc<"ideas"> | null, connection: Record<string, unknown> | null) {
  const mutations: Array<{ reference: unknown; args: unknown }> = [];
  let queryCount = 0;
  const ctx = {
    runQuery: async () => {
      queryCount += 1;
      if (queryCount === 1) return userId;
      if (queryCount === 2) return sourceIdea;
      return connection;
    },
    runMutation: async (reference: unknown, args: unknown) => {
      mutations.push({ reference, args });
      return null;
    },
  } as unknown as ActionCtx;
  return { ctx, mutations };
}

const connectedCart = {
  userId,
  cart: {
    shoppingCartId: "cart-1",
    branchId: "branch-1",
    deliveryType: "courier",
    timeslot: { start: "2026-09-22T10:00:00Z", end: "2026-09-22T11:00:00Z" },
  },
};

test("does not create a cart before an address has been saved", async () => {
  toolCalls.length = 0;
  const mutations: unknown[] = [];
  let queryCount = 0;
  const ctx = {
    runQuery: async () => {
      queryCount += 1;
      return queryCount === 1
        ? userId
        : { userId, tokens: { access_token: "token", token_type: "Bearer" } };
    },
    runMutation: async (reference: unknown, args: unknown) => {
      mutations.push({ reference, args });
      return null;
    },
  } as unknown as ActionCtx;

  await handler(setupCart)(ctx, { userId, threadId: "thread" });

  expect(toolCalls).toHaveLength(0);
  expect(mutations).toHaveLength(0);
});

test("adds matched products to the saved cart and persists its returned totals", async () => {
  toolCalls.length = 0;
  const { ctx, mutations } = cartContext(idea(), connectedCart);

  await handler(addIdeaToCart)(ctx, { ideaId, userId, refreshOnly: false });

  expect(toolCalls).toEqual([
    {
      name: "silpo_add_or_update_cart_products",
      args: {
        shoppingCartId: "cart-1",
        products: [
          {
            productId: "tomato",
            companyId: "silpo",
            branchId: "branch-1",
            quantity: 2,
            addQuantity: false,
          },
        ],
      },
    },
    { name: "silpo_get_shopping_cart_by_id", args: { shoppingCartId: "cart-1" } },
  ]);
  expect(mutations).toHaveLength(1);
  expect(mutations[0]?.args).toEqual({
    ideaId,
    cart: {
      checkoutWebLink: "https://silpo.ua/checkout/cart-1",
      itemCount: 1,
      productsTotal: 120,
      subtotal: 140,
      discount: 20,
      deliveryTotal: 10,
      total: 150,
      warnings: undefined,
      addedAt: expect.any(Number),
    },
  });
});

test("does not call Silpo when the idea belongs to another account", async () => {
  toolCalls.length = 0;
  const { ctx, mutations } = cartContext(
    idea({ userId: "another-user" as Id<"users"> }),
    connectedCart,
  );

  await handler(addIdeaToCart)(ctx, { ideaId, userId, refreshOnly: false });

  expect(toolCalls).toHaveLength(0);
  expect(mutations).toHaveLength(1);
  expect(mutations[0]?.args).toEqual({
    ideaId,
    message: "Кошик Сільпо ще не готовий. Вкажи адресу доставки.",
  });
});
