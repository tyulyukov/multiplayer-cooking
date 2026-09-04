import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { internalMutation, internalQuery, query } from "./_generated/server";
import { findUser } from "./lib/users";
import { ideaDocValidator, ideaFields, ideaImageValidator } from "./schema";

export const save = internalMutation({
  args: ideaFields,
  returns: v.id("ideas"),
  handler: async (ctx, args) => ctx.db.insert("ideas", args),
});

export const latestImage = internalQuery({
  args: { threadId: v.string() },
  returns: v.union(v.null(), ideaImageValidator),
  handler: async (ctx, { threadId }) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(20);

    return ideas.find((idea) => idea.image)?.image ?? null;
  },
});

export const ideaViewValidator = v.object({
  ...ideaDocValidator.fields,
  imageUrl: v.optional(v.string()),
});

export const latest = query({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.union(v.null(), ideaViewValidator),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user) {
      return null;
    }

    const idea = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .first();

    if (!idea || idea.userId !== user._id) {
      return null;
    }

    const imageUrl = idea.image ? await ctx.storage.getUrl(idea.image.storageId) : null;

    return { ...idea, imageUrl: imageUrl ?? undefined };
  },
});
