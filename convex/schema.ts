import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ingredientValidator = v.object({
  name: v.string(),
  amount: v.optional(v.string()),
});

export const ideaImageValidator = v.object({
  storageId: v.id("_storage"),
  credit: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  generated: v.optional(v.boolean()),
});

export const productMatchValidator = v.object({
  ingredient: v.string(),
  quantity: v.number(),
  productId: v.optional(v.string()),
  companyId: v.optional(v.string()),
  branchId: v.optional(v.string()),
  title: v.optional(v.string()),
  price: v.optional(v.number()),
  oldPrice: v.optional(v.number()),
  unit: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  slug: v.optional(v.string()),
  productUrl: v.optional(v.string()),
});

export const ideaCartValidator = v.object({
  checkoutWebLink: v.optional(v.string()),
  itemCount: v.number(),
  // Named amounts returned by silpo_get_shopping_cart_by_id.calculation.
  productsTotal: v.optional(v.number()),
  subtotal: v.optional(v.number()),
  discount: v.optional(v.number()),
  deliveryTotal: v.optional(v.number()),
  total: v.optional(v.number()),
  warnings: v.optional(v.array(v.string())),
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
  imageError: v.optional(v.string()),
  products: v.optional(v.array(productMatchValidator)),
  productsStatus: v.optional(
    v.union(
      v.literal("not_connected"),
      v.literal("needs_address"),
      v.literal("unavailable"),
      v.literal("empty"),
    ),
  ),
  cart: v.optional(ideaCartValidator),
  cartError: v.optional(v.string()),
  cartPending: v.optional(v.boolean()),
  // Kept for persisted ideas from the first cooking-plan prototype.
  cookServings: v.optional(v.number()),
  // Number of people cooking in parallel; recipe servings stay separate.
  cookCount: v.optional(v.number()),
  // New ideas stay hidden until the response that produced them finishes.
  pending: v.optional(v.boolean()),
};

export const memoryKindValidator = v.union(
  v.literal("allergy"),
  v.literal("dislike"),
  v.literal("preference"),
);

export const agentToneValidator = v.union(
  v.literal("friendly"),
  v.literal("concise"),
  v.literal("playful"),
);

export const agentSettingsValidator = v.object({
  tone: agentToneValidator,
  customInstructions: v.string(),
  about: v.string(),
});

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
  email: v.optional(v.string()),
});

export const silpoCartContextValidator = v.object({
  shoppingCartId: v.string(),
  branchId: v.string(),
  deliveryType: v.string(),
  timeslot: v.object({ start: v.string(), end: v.string() }),
});

export default defineSchema({
  // A user becomes the durable account record after a verified Сільпо login.
  // sessionId and activeThreadId remain only to read data created before sessions existed.
  users: defineTable({
    sessionId: v.optional(v.string()),
    activeThreadId: v.optional(v.string()),
    silpoAccountId: v.optional(v.string()),
    mergedIntoUserId: v.optional(v.id("users")),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_silpoAccountId", ["silpoAccountId"]),
  // Browser-local state. Clearing userId deliberately blocks fallback to a legacy user row.
  sessions: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    activeThreadId: v.optional(v.string()),
    authVersion: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_user", ["userId"]),
  ideas: defineTable(ideaFields)
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_thread_prompt", ["threadId", "promptMessageId"]),
  memories: defineTable({
    userId: v.id("users"),
    kind: memoryKindValidator,
    text: v.string(),
    subject: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  personalizations: defineTable({
    userId: v.id("users"),
    settings: agentSettingsValidator,
  }).index("by_user", ["userId"]),
  // Who uploaded which photo; a message may only reference the sender's own uploads.
  uploads: defineTable({ storageId: v.id("_storage"), userId: v.id("users") })
    .index("by_storage", ["storageId"])
    .index("by_user", ["userId"]),
  // The unsent composer text and photos, one per thread, so a draft survives a reload and follows the account to another device.
  // threadId is absent for the home screen composer that starts a new thread.
  drafts: defineTable({
    userId: v.id("users"),
    threadId: v.optional(v.string()),
    text: v.string(),
    imageIds: v.array(v.id("_storage")),
  }).index("by_user_thread", ["userId", "threadId"]),
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
    // Optional invalidates states created before browser session binding was introduced.
    sessionId: v.optional(v.string()),
    authVersion: v.optional(v.number()),
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
