import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ingredientValidator = v.object({
  name: v.string(),
  amount: v.optional(v.string()),
});

export const ideaImageValidator = v.object({
  storageId: v.id("_storage"),
  credit: v.string(),
  sourceUrl: v.string(),
});

export const productMatchValidator = v.object({
  ingredient: v.string(),
  quantity: v.number(),
  productId: v.optional(v.string()),
  companyId: v.optional(v.string()),
  title: v.optional(v.string()),
  price: v.optional(v.number()),
  unit: v.optional(v.string()),
});

export const ideaCartValidator = v.object({
  checkoutWebLink: v.optional(v.string()),
  itemCount: v.number(),
  addedAt: v.number(),
});

export const ideaFields = {
  userId: v.id("users"),
  threadId: v.string(),
  promptMessageId: v.string(),
  title: v.string(),
  summary: v.string(),
  body: v.string(),
  timeMinutes: v.number(),
  servings: v.number(),
  ingredients: v.array(ingredientValidator),
  image: v.optional(ideaImageValidator),
  products: v.optional(v.array(productMatchValidator)),
  cart: v.optional(ideaCartValidator),
  cartError: v.optional(v.string()),
  cartPending: v.optional(v.boolean()),
  // Servings chosen in "Готуємо разом"; the cooking plan itself comes later.
  cookServings: v.optional(v.number()),
};

export const ideaDocValidator = v.object({
  _id: v.id("ideas"),
  _creationTime: v.number(),
  ...ideaFields,
});

export const silpoTokensValidator = v.object({
  access_token: v.string(),
  token_type: v.string(),
  refresh_token: v.optional(v.string()),
  expires_in: v.optional(v.number()),
  scope: v.optional(v.string()),
});

export const silpoProfileValidator = v.object({
  name: v.optional(v.string()),
  phone: v.optional(v.string()),
});

export const silpoCartContextValidator = v.object({
  shoppingCartId: v.string(),
  branchId: v.string(),
  deliveryType: v.string(),
  timeslot: v.object({ start: v.string(), end: v.string() }),
});

export default defineSchema({
  users: defineTable({
    sessionId: v.string(),
    activeThreadId: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),
  ideas: defineTable(ideaFields).index("by_thread", ["threadId"]),
  // One dynamic client registration per deployment, keyed by redirect URI.
  silpoOAuthClients: defineTable({
    issuer: v.string(),
    redirectUri: v.string(),
    clientInformation: v.string(),
  }).index("by_redirect", ["issuer", "redirectUri"]),
  // Short-lived, single-use OAuth state for the authorization redirect.
  silpoAuthStates: defineTable({
    state: v.string(),
    userId: v.id("users"),
    codeVerifier: v.string(),
    expiresAt: v.number(),
  }).index("by_state", ["state"]),
  silpoConnections: defineTable({
    userId: v.id("users"),
    tokens: silpoTokensValidator,
    tokensSavedAt: v.number(),
    profile: v.optional(silpoProfileValidator),
    // The delivery address never reaches the model or the thread.
    address: v.optional(v.string()),
    cart: v.optional(silpoCartContextValidator),
    cartError: v.optional(v.string()),
    cartPending: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
});
