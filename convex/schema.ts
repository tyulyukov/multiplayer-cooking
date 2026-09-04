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
};

export const ideaDocValidator = v.object({
  _id: v.id("ideas"),
  _creationTime: v.number(),
  ...ideaFields,
});

export default defineSchema({
  users: defineTable({
    sessionId: v.string(),
    activeThreadId: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),
  ideas: defineTable(ideaFields).index("by_thread", ["threadId"]),
});
