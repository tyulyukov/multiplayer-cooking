import type { SessionId } from "convex-helpers/server/sessions";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function findUser(ctx: QueryCtx, sessionId: SessionId): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();
}

export async function getOrCreateUser(
  ctx: MutationCtx,
  sessionId: SessionId,
): Promise<Doc<"users">> {
  const existing = await findUser(ctx, sessionId);

  if (existing) {
    return existing;
  }

  const userId = await ctx.db.insert("users", { sessionId });
  const created = await ctx.db.get(userId);

  if (!created) {
    throw new Error("User insert did not return a document");
  }

  return created;
}
