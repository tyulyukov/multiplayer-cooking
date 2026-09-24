import { expect, mock, test } from "bun:test";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import type { SilpoClient } from "./lib/silpo_client";
import type { JsonInputRecord, JsonValue } from "./lib/silpo_shapes";
import { actionHandler, testId, testSessionId } from "../tests/convex-doubles";

const authCalls: unknown[] = [];

const profileCalls: unknown[] = [];

const toolCalls: Array<{ name: string; args: JsonInputRecord }> = [];

const { parseVerifiedSilpoProfile } = await import("./lib/silpo_client");

mock.module("@modelcontextprotocol/sdk/client/auth.js", () => ({
  auth: async (provider: { saveTokens: (tokens: OAuthTokens) => Promise<void> }) => {
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
    _ctx: ActionCtx,
    options: { saveStagedTokens?: (tokens: OAuthTokens) => Promise<void> },
  ) => ({
    saveTokens: async (tokens: OAuthTokens) => options.saveStagedTokens?.(tokens),
  }),
}));

mock.module("./lib/silpo_client", () => ({
  withSilpoClient: async (
    _ctx: ActionCtx,
    _userId: Id<"users">,
    run: (client: Pick<SilpoClient, "callTool">) => Promise<JsonValue>,
  ) =>
    run({
      callTool: async (name, args): Promise<JsonValue> => {
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
  describeSilpoError: (cause: unknown) => (cause instanceof Error ? cause.message : "unknown"),
  parseVerifiedSilpoProfile,
}));

const { finishConnect } = await import("./silpoAuth");

const { addIdeaToCart, setupCart } = await import("./silpoCart");

type QueryReference = FunctionReference<"query", "public" | "internal">;

type MutationReference = FunctionReference<"mutation", "public" | "internal">;

const userId = testId<"users">("user");

const ideaId = testId<"ideas">("idea");

const sessionId = testSessionId("session");

test("rejects an OAuth callback whose state was already consumed without contacting Silpo", async () => {
  authCalls.length = 0;
  profileCalls.length = 0;
  const mutations: unknown[] = [];

  // SAFETY: this harness only implements the ActionCtx methods finishConnect actually calls.
  const ctx = {
    runMutation: async (reference: MutationReference, args: DefaultFunctionArgs) => {
      mutations.push({ reference, args });

      return null;
    },
  } as ActionCtx;

  await expect(
    actionHandler(finishConnect)(ctx, { sessionId, state: "used", code: "code" }),
  ).resolves.toBe(false);

  expect(mutations).toHaveLength(1);
  expect(authCalls).toHaveLength(0);
  expect(profileCalls).toHaveLength(0);
});

test("links tokens only after Silpo returns a verified account profile", async () => {
  authCalls.length = 0;
  profileCalls.length = 0;
  const mutations: Array<{ reference: unknown; args: unknown }> = [];

  // SAFETY: this harness only implements the ActionCtx methods finishConnect actually calls.
  const ctx = {
    runMutation: async (reference: MutationReference, args: DefaultFunctionArgs) => {
      mutations.push({ reference, args });

      return mutations.length === 1
        ? { userId, sessionId: "session", authVersion: 3, codeVerifier: "verifier" }
        : userId;
    },
  } as ActionCtx;

  await expect(
    actionHandler(finishConnect)(ctx, { sessionId, state: "fresh", code: "code" }),
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

function cartContext(
  sourceIdea: Doc<"ideas"> | null,
  connection: Readonly<{
    userId: Id<"users">;
    cart: NonNullable<Doc<"silpoConnections">["cart"]>;
  }> | null,
) {
  const mutations: Array<{ reference: unknown; args: unknown }> = [];
  let queryCount = 0;

  // SAFETY: this harness only implements the ActionCtx methods addIdeaToCart actually calls.
  const ctx = {
    runQuery: async (_reference: QueryReference) => {
      queryCount += 1;

      if (queryCount === 1) return userId;

      if (queryCount === 2) return sourceIdea;

      return connection;
    },
    runMutation: async (reference: MutationReference, args: DefaultFunctionArgs) => {
      mutations.push({ reference, args });

      return null;
    },
  } as ActionCtx;

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

  // SAFETY: this harness only implements the ActionCtx methods setupCart actually calls.
  const ctx = {
    runQuery: async (_reference: QueryReference) => {
      queryCount += 1;

      return queryCount === 1
        ? userId
        : { userId, tokens: { access_token: "token", token_type: "Bearer" } };
    },
    runMutation: async (reference: MutationReference, args: DefaultFunctionArgs) => {
      mutations.push({ reference, args });

      return null;
    },
  } as ActionCtx;

  await actionHandler(setupCart)(ctx, { userId, threadId: "thread" });

  expect(toolCalls).toHaveLength(0);
  expect(mutations).toHaveLength(0);
});

test("adds matched products to the saved cart and persists its returned totals", async () => {
  toolCalls.length = 0;
  const { ctx, mutations } = cartContext(idea(), connectedCart);

  await actionHandler(addIdeaToCart)(ctx, { ideaId, userId, refreshOnly: false });

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
    idea({ userId: testId<"users">("another-user") }),
    connectedCart,
  );

  await actionHandler(addIdeaToCart)(ctx, { ideaId, userId, refreshOnly: false });

  expect(toolCalls).toHaveLength(0);
  expect(mutations).toHaveLength(1);
  expect(mutations[0]?.args).toEqual({
    ideaId,
    message: "Кошик Сільпо ще не готовий. Вкажи адресу доставки.",
  });
});
