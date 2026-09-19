import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

import { silpoProfileValidator, silpoTokensValidator } from "./schema";
import { findSession, getOrCreateUser, resolveUserId as resolveCanonicalUserId } from "./lib/users";

import { normalizeMemorySubject, normalizeMemoryText } from "./personalization";

const MIGRATION_LIMIT = 1_000;

async function takeForMigration<T>(read: Promise<T[]>, label: string): Promise<T[]> {
  const rows = await read;

  if (rows.length > MIGRATION_LIMIT) {
    throw new Error(`Cannot merge account with more than ${MIGRATION_LIMIT} ${label}`);
  }

  return rows;
}

async function findConnection(ctx: MutationCtx, userId: Id<"users">) {
  return ctx.db
    .query("silpoConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function migrateInto(
  ctx: MutationCtx,
  sourceUserId: Id<"users">,
  targetUserId: Id<"users">,
  fresh: {
    accountId: string;
    profile: { name?: string; phone?: string };
    tokens: {
      access_token: string;
      token_type: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
  },
) {
  if (sourceUserId === targetUserId) {
    const connection = await findConnection(ctx, targetUserId);

    if (connection) {
      await ctx.db.patch(connection._id, {
        tokens: fresh.tokens,
        tokensSavedAt: Date.now(),
        profile: fresh.profile,
      });
    } else {
      await ctx.db.insert("silpoConnections", {
        userId: targetUserId,
        tokens: fresh.tokens,
        tokensSavedAt: Date.now(),
        profile: fresh.profile,
      });
    }

    await ctx.db.patch(targetUserId, { silpoAccountId: fresh.accountId });
    return targetUserId;
  }

  const [
    ideas,
    memories,
    uploads,
    sessions,
    drafts,
    targetDrafts,
    sourceSettings,
    targetSettings,
    sourceConnection,
    targetConnection,
  ] = await Promise.all([
    takeForMigration(
      ctx.db
        .query("ideas")
        .withIndex("by_user", (q) => q.eq("userId", sourceUserId))
        .take(1001),
      "ideas",
    ),
    takeForMigration(
      ctx.db
        .query("memories")
        .withIndex("by_user", (q) => q.eq("userId", sourceUserId))
        .take(1001),
      "memories",
    ),
    takeForMigration(
      ctx.db
        .query("uploads")
        .withIndex("by_user", (q) => q.eq("userId", sourceUserId))
        .take(1001),
      "uploads",
    ),
    takeForMigration(
      ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", sourceUserId))
        .take(1001),
      "sessions",
    ),
    takeForMigration(
      ctx.db
        .query("drafts")
        .withIndex("by_user_thread", (q) => q.eq("userId", sourceUserId))
        .take(1001),
      "drafts",
    ),
    takeForMigration(
      ctx.db
        .query("drafts")
        .withIndex("by_user_thread", (q) => q.eq("userId", targetUserId))
        .take(1001),
      "target drafts",
    ),
    ctx.db
      .query("personalizations")
      .withIndex("by_user", (q) => q.eq("userId", sourceUserId))
      .unique(),
    ctx.db
      .query("personalizations")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .unique(),
    findConnection(ctx, sourceUserId),
    findConnection(ctx, targetUserId),
  ]);
  const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
    userId: sourceUserId,
    order: "desc",
    paginationOpts: { cursor: null, numItems: MIGRATION_LIMIT + 1 },
  });

  if (!threads.isDone || threads.page.length > MIGRATION_LIMIT) {
    throw new Error(`Cannot merge account with more than ${MIGRATION_LIMIT} threads`);
  }

  const targetMemories = await takeForMigration(
    ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .take(1001),
    "target memories",
  );
  const memoryKeys = new Set(
    targetMemories.map(
      (memory) =>
        `${memory.kind}:${normalizeMemorySubject(memory.subject)}:${normalizeMemoryText(memory.text)}`,
    ),
  );

  for (const idea of ideas) {
    await ctx.db.patch(idea._id, { userId: targetUserId });
  }
  for (const upload of uploads) {
    await ctx.db.patch(upload._id, { userId: targetUserId });
  }
  for (const memory of memories) {
    const key = `${memory.kind}:${normalizeMemorySubject(memory.subject)}:${normalizeMemoryText(memory.text)}`;

    if (memoryKeys.has(key)) {
      await ctx.db.delete(memory._id);
    } else {
      memoryKeys.add(key);
      await ctx.db.patch(memory._id, { userId: targetUserId });
    }
  }
  for (const session of sessions) {
    await ctx.db.patch(session._id, { userId: targetUserId });
  }
  // The target account keeps its own draft for a composer both accounts had one for.
  const targetDraftThreads = new Set(targetDrafts.map((draft) => draft.threadId));
  for (const draft of drafts) {
    if (targetDraftThreads.has(draft.threadId)) {
      await ctx.db.delete(draft._id);
    } else {
      await ctx.db.patch(draft._id, { userId: targetUserId });
    }
  }
  for (const thread of threads.page) {
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: thread._id,
      patch: { userId: targetUserId },
    });
  }

  const sourceIsDefault =
    sourceSettings?.settings.tone === "friendly" &&
    !sourceSettings.settings.customInstructions &&
    !sourceSettings.settings.about;
  const targetIsDefault =
    targetSettings?.settings.tone === "friendly" &&
    !targetSettings.settings.customInstructions &&
    !targetSettings.settings.about;

  if (sourceSettings && (!targetSettings || (targetIsDefault && !sourceIsDefault))) {
    if (targetSettings) {
      await ctx.db.patch(targetSettings._id, { settings: sourceSettings.settings });
      await ctx.db.delete(sourceSettings._id);
    } else {
      await ctx.db.patch(sourceSettings._id, { userId: targetUserId });
    }
  } else if (sourceSettings) {
    await ctx.db.delete(sourceSettings._id);
  }

  if (targetConnection) {
    await ctx.db.patch(targetConnection._id, {
      tokens: fresh.tokens,
      tokensSavedAt: Date.now(),
      profile: fresh.profile,
      address: targetConnection.address ?? sourceConnection?.address,
      cart: targetConnection.address ? targetConnection.cart : sourceConnection?.cart,
      cartError: targetConnection.address
        ? targetConnection.cartError
        : sourceConnection?.cartError,
      cartPending: targetConnection.address
        ? targetConnection.cartPending
        : sourceConnection?.cartPending,
    });
  } else {
    await ctx.db.insert("silpoConnections", {
      userId: targetUserId,
      tokens: fresh.tokens,
      tokensSavedAt: Date.now(),
      profile: fresh.profile,
      address: sourceConnection?.address,
      cart: sourceConnection?.cart,
      cartError: sourceConnection?.cartError,
      cartPending: sourceConnection?.cartPending,
    });
  }

  if (sourceConnection) {
    await ctx.db.delete(sourceConnection._id);
  }
  await ctx.db.patch(sourceUserId, { mergedIntoUserId: targetUserId });
  await ctx.db.patch(targetUserId, { silpoAccountId: fresh.accountId });

  return targetUserId;
}

async function canonicalizeConnection(
  ctx: MutationCtx,
  sourceUserId: Id<"users">,
  fresh: {
    accountId: string;
    profile: { name?: string; phone?: string };
    tokens: {
      access_token: string;
      token_type: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
  },
  verifiedLegacy = false,
): Promise<{ userId: Id<"users">; historyMigrated: boolean }> {
  const sourceId = await resolveCanonicalUserId(ctx, sourceUserId);
  const source = await ctx.db.get(sourceId);

  if (!source) {
    throw new Error("Source user no longer exists");
  }

  const existingTarget = await ctx.db
    .query("users")
    .withIndex("by_silpoAccountId", (q) => q.eq("silpoAccountId", fresh.accountId))
    .unique();

  if (source.silpoAccountId && source.silpoAccountId !== fresh.accountId) {
    const target =
      existingTarget?._id ?? (await ctx.db.insert("users", { silpoAccountId: fresh.accountId }));
    return { userId: await migrateInto(ctx, target, target, fresh), historyMigrated: false };
  }

  const sourceConnection = await findConnection(ctx, sourceId);
  const mayMigrate =
    verifiedLegacy || !sourceConnection || source.silpoAccountId === fresh.accountId;

  if (!mayMigrate) {
    const target =
      existingTarget?._id ?? (await ctx.db.insert("users", { silpoAccountId: fresh.accountId }));
    return { userId: await migrateInto(ctx, target, target, fresh), historyMigrated: false };
  }

  return {
    userId: await migrateInto(ctx, sourceId, existingTarget?._id ?? sourceId, fresh),
    historyMigrated: true,
  };
}

export const resolveUserId = internalQuery({
  args: { userId: v.id("users") },
  returns: v.id("users"),
  handler: async (ctx, { userId }) => resolveCanonicalUserId(ctx, userId),
});

export const beginConnect = internalMutation({
  args: { sessionId: v.string() },
  returns: v.object({ userId: v.id("users"), authVersion: v.number() }),
  handler: async (ctx, { sessionId }) => {
    const user = await getOrCreateUser(ctx, sessionId);
    const session = await findSession(ctx, sessionId);

    if (!session) {
      throw new Error("Session was not created");
    }

    const authVersion = session.authVersion + 1;
    await ctx.db.patch(session._id, { authVersion });
    return { userId: user._id, authVersion };
  },
});

export const linkConnection = internalMutation({
  args: {
    sessionId: v.string(),
    authVersion: v.number(),
    sourceUserId: v.id("users"),
    accountId: v.string(),
    profile: silpoProfileValidator,
    tokens: silpoTokensValidator,
  },
  returns: v.union(v.null(), v.id("users")),
  handler: async (ctx, args) => {
    const session = await findSession(ctx, args.sessionId);

    if (
      !session ||
      session.authVersion !== args.authVersion ||
      session.userId !== args.sourceUserId
    ) {
      return null;
    }

    const linked = await canonicalizeConnection(ctx, args.sourceUserId, args);
    await ctx.db.patch(session._id, {
      userId: linked.userId,
      activeThreadId: linked.historyMigrated ? session.activeThreadId : undefined,
    });
    return linked.userId;
  },
});

export const linkExistingConnection = internalMutation({
  args: {
    expectedAccessToken: v.string(),
    expectedTokensSavedAt: v.number(),
    sourceUserId: v.id("users"),
    accountId: v.string(),
    profile: silpoProfileValidator,
    tokens: silpoTokensValidator,
  },
  returns: v.union(v.null(), v.id("users")),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceUserId);
    const connection = await findConnection(ctx, args.sourceUserId);
    if (
      !source ||
      source.mergedIntoUserId ||
      !connection ||
      connection.tokens.access_token !== args.expectedAccessToken ||
      connection.tokensSavedAt !== args.expectedTokensSavedAt
    )
      return null;
    if (source.silpoAccountId && source.silpoAccountId !== args.accountId) return null;

    if (source?.sessionId && !(await findSession(ctx, source.sessionId))) {
      await ctx.db.insert("sessions", {
        sessionId: source.sessionId,
        userId: source._id,
        activeThreadId: source.activeThreadId,
        authVersion: 0,
      });
    }

    return (await canonicalizeConnection(ctx, args.sourceUserId, args, true)).userId;
  },
});

export const disconnectSession = internalMutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const session = await findSession(ctx, sessionId);

    if (session) {
      await ctx.db.patch(session._id, {
        userId: undefined,
        activeThreadId: undefined,
        authVersion: session.authVersion + 1,
      });
    } else {
      await ctx.db.insert("sessions", { sessionId, authVersion: 1 });
    }

    return null;
  },
});
