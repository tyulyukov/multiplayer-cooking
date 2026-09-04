import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { findUser } from "./lib/users";
import { ideaDocValidator, ideaFields } from "./schema";

export const save = internalMutation({
  args: ideaFields,
  returns: v.id("ideas"),
  handler: async (ctx, args) => ctx.db.insert("ideas", args),
});

export const latest = query({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.union(v.null(), ideaDocValidator),
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

    return idea && idea.userId === user._id ? idea : null;
  },
});
