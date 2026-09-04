import {
  createThread,
  getThreadMetadata,
  listUIMessages,
  saveMessage,
  syncStreams,
  updateThreadMetadata,
  vStreamArgs,
} from "@convex-dev/agent";
import { RateLimiter } from "@convex-dev/rate-limiter";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { admitAiGeneration } from "./lib/ai_admission";
import { AI_RATE_LIMITS, AI_REQUEST_MAX_CHARACTERS } from "./lib/ai_config";
import { findUser, getOrCreateUser } from "./lib/users";

const rateLimiter = new RateLimiter(components.rateLimiter, AI_RATE_LIMITS);

export async function ownsThread(ctx: QueryCtx, user: Doc<"users">, threadId: string) {
  try {
    const thread = await getThreadMetadata(ctx, components.agent, { threadId });
    return thread.userId === user._id;
  } catch {
    return false;
  }
}

export const activeThread = query({
  args: SessionIdArg,
  returns: v.union(v.null(), v.object({ threadId: v.string() })),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);

    return user?.activeThreadId ? { threadId: user.activeThreadId } : null;
  },
});

export const listMessages = query({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  // No returns validator: the UIMessage shape is owned by the agent component.
  handler: async (ctx, { sessionId, threadId, paginationOpts, streamArgs }) => {
    const user = await findUser(ctx, sessionId);

    if (!user || !(await ownsThread(ctx, user, threadId))) {
      return { page: [], isDone: true, continueCursor: "", streams: undefined };
    }

    const paginated = await listUIMessages(ctx, components.agent, { threadId, paginationOpts });
    const streams = await syncStreams(ctx, components.agent, { threadId, streamArgs });

    return { ...paginated, streams };
  },
});

export const sendMessage = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.optional(v.string()),
    text: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), threadId: v.string() }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, threadId: requestedThreadId, text }) => {
    const prompt = text.trim();

    if (!prompt || prompt.length > AI_REQUEST_MAX_CHARACTERS) {
      return { ok: false as const, message: "Опиши страву коротше, до 1024 знаків." };
    }

    const user = await getOrCreateUser(ctx, sessionId);

    if (requestedThreadId && !(await ownsThread(ctx, user, requestedThreadId))) {
      return { ok: false as const, message: "Ця розмова недоступна. Почни нову." };
    }

    const admitted = await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: user._id }),
    });

    if (!admitted) {
      return { ok: false as const, message: "Забагато запитів. Спробуй трохи пізніше." };
    }

    let threadId = requestedThreadId;

    if (!threadId) {
      threadId = await createThread(ctx, components.agent, { userId: user._id });
      await ctx.db.patch(user._id, { activeThreadId: threadId });
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId: user._id,
      prompt,
    });

    await ctx.scheduler.runAfter(0, internal.cookingAgent.respond, {
      threadId,
      promptMessageId: messageId,
      userId: user._id,
    });

    return { ok: true as const, threadId };
  },
});

export const newThread = mutation({
  args: SessionIdArg,
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const user = await getOrCreateUser(ctx, sessionId);

    if (user.activeThreadId) {
      await updateThreadMetadata(ctx, components.agent, {
        threadId: user.activeThreadId,
        patch: { status: "archived" },
      });
      await ctx.db.patch(user._id, { activeThreadId: undefined });
    }

    return null;
  },
});

// Continues a thread after a server-side step (for example the cart is ready).
export const followUp = internalMutation({
  args: { userId: v.id("users"), threadId: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, threadId, text }) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      prompt: text,
    });

    await ctx.scheduler.runAfter(0, internal.cookingAgent.respond, {
      threadId,
      promptMessageId: messageId,
      userId,
    });

    return null;
  },
});
