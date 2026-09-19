import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export async function findSession(
  ctx: ReadCtx,
  sessionId: string,
): Promise<Doc<"sessions"> | null> {
  return ctx.db
    .query("sessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();
}

export async function resolveUserId(ctx: ReadCtx, userId: Id<"users">): Promise<Id<"users">> {
  let currentId = userId;

  for (let hops = 0; hops < 10; hops += 1) {
    const current = await ctx.db.get(currentId);

    if (!current) {
      throw new Error("User no longer exists");
    }

    if (!current.mergedIntoUserId) {
      return currentId;
    }

    currentId = current.mergedIntoUserId;
  }

  throw new Error("User merge chain is invalid");
}

async function resolvedUser(ctx: ReadCtx, userId: Id<"users">): Promise<Doc<"users"> | null> {
  return ctx.db.get(await resolveUserId(ctx, userId));
}

// A session row is authoritative, including a deliberately disconnected row with no userId.
export async function findUser(ctx: ReadCtx, sessionId: string): Promise<Doc<"users"> | null> {
  const session = await findSession(ctx, sessionId);

  if (session) {
    return session.userId ? resolvedUser(ctx, session.userId) : null;
  }

  const legacy = await ctx.db
    .query("users")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();

  return legacy ? resolvedUser(ctx, legacy._id) : null;
}

export async function getOrCreateUser(ctx: MutationCtx, sessionId: string): Promise<Doc<"users">> {
  const session = await findSession(ctx, sessionId);

  if (session?.userId) {
    const user = await resolvedUser(ctx, session.userId);

    if (!user) {
      throw new Error("Session user no longer exists");
    }

    return user;
  }

  if (session) {
    const userId = await ctx.db.insert("users", {});
    await ctx.db.patch(session._id, { userId });
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User insert did not return a document");
    }

    return user;
  }

  const legacy = await ctx.db
    .query("users")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();

  if (legacy) {
    const canonicalId = await resolveUserId(ctx, legacy._id);
    await ctx.db.insert("sessions", {
      sessionId,
      userId: canonicalId,
      activeThreadId: legacy.activeThreadId,
      authVersion: 0,
    });
    const user = await ctx.db.get(canonicalId);

    if (!user) {
      throw new Error("Legacy user no longer exists");
    }

    return user;
  }

  const userId = await ctx.db.insert("users", {});
  await ctx.db.insert("sessions", { sessionId, userId, authVersion: 0 });
  const created = await ctx.db.get(userId);

  if (!created) {
    throw new Error("User insert did not return a document");
  }

  return created;
}

export async function setActiveThread(
  ctx: MutationCtx,
  sessionId: string,
  threadId: string | undefined,
): Promise<void> {
  await getOrCreateUser(ctx, sessionId);
  const session = await findSession(ctx, sessionId);

  if (!session) {
    throw new Error("Session was not created");
  }

  await ctx.db.patch(session._id, { activeThreadId: threadId });
}
