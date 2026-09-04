import { RateLimiter } from "@convex-dev/rate-limiter";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { AI_RATE_LIMITS } from "./lib/ai_config";
import { findUser, getOrCreateUser } from "./lib/users";

const rateLimiter = new RateLimiter(components.rateLimiter, AI_RATE_LIMITS);

// The browser uploads resized photos straight to Convex storage with this URL.
export const uploadUrl = mutation({
  args: SessionIdArg,
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { sessionId }) => {
    const user = await getOrCreateUser(ctx, sessionId);
    const { ok } = await rateLimiter.limit(ctx, "uploadBurst", { key: user._id });

    return ok ? ctx.storage.generateUploadUrl() : null;
  },
});

// Storage ids are unguessable, so whoever presents one uploaded it; record the owner.
export const register = mutation({
  args: { ...SessionIdArg, storageId: v.id("_storage") },
  returns: v.boolean(),
  handler: async (ctx, { sessionId, storageId }) => {
    const user = await findUser(ctx, sessionId);
    const file = await ctx.db.system.get("_storage", storageId);

    if (!user || !file || !file.contentType?.startsWith("image/")) {
      return false;
    }

    const existing = await ctx.db
      .query("uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .unique();

    if (!existing) {
      await ctx.db.insert("uploads", { storageId, userId: user._id });
    }

    return existing === null || existing.userId === user._id;
  },
});
