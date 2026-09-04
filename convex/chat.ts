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
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { admitAiGeneration } from "./lib/ai_admission";
import { AI_MAX_IMAGES, AI_RATE_LIMITS, AI_REQUEST_MAX_CHARACTERS } from "./lib/ai_config";
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
    imageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), threadId: v.string() }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, threadId: requestedThreadId, text, imageIds = [] }) => {
    const prompt = text.trim();

    if (prompt.length > AI_REQUEST_MAX_CHARACTERS) {
      return { ok: false as const, message: "Опиши страву коротше, до 1024 знаків." };
    }

    if (!prompt && imageIds.length === 0) {
      return { ok: false as const, message: "Напиши, що приготувати, або додай фото." };
    }

    if (imageIds.length > AI_MAX_IMAGES) {
      return { ok: false as const, message: `Можна додати до ${AI_MAX_IMAGES} фото.` };
    }

    const user = await getOrCreateUser(ctx, sessionId);
    const imageUrls: string[] = [];

    for (const imageId of imageIds) {
      const upload = await ctx.db
        .query("uploads")
        .withIndex("by_storage", (q) => q.eq("storageId", imageId))
        .unique();
      const url = upload?.userId === user._id ? await ctx.storage.getUrl(imageId) : null;

      if (!url) {
        return { ok: false as const, message: "Фото не завантажилось. Спробуй ще раз." };
      }

      imageUrls.push(url);
    }

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
      message: {
        role: "user",
        content: [
          ...imageUrls.map((url) => ({
            type: "image" as const,
            image: url,
            mediaType: "image/jpeg",
          })),
          { type: "text" as const, text: prompt || "Що можна приготувати з цього?" },
        ],
      },
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

export const answerQuestion = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    toolCallId: v.string(),
    answer: v.object({
      optionIds: v.array(v.string()),
      labels: v.array(v.string()),
      custom: v.optional(v.string()),
    }),
  },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, threadId, toolCallId, answer }) => {
    const user = await findUser(ctx, sessionId);

    if (!user || !(await ownsThread(ctx, user, threadId))) {
      return { ok: false as const, message: "Ця розмова недоступна. Почни нову." };
    }

    const custom = answer.custom?.trim().slice(0, 200);
    const value = {
      selected: answer.labels.slice(0, 5),
      ...(custom ? { custom } : {}),
    };

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId: user._id,
      message: {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId,
            toolName: "ask_user",
            output: { type: "json", value },
          },
        ],
      },
    });

    await ctx.scheduler.runAfter(0, internal.cookingAgent.respond, {
      threadId,
      promptMessageId: messageId,
      userId: user._id,
    });

    return { ok: true as const };
  },
});

export const HISTORY_LIMIT = 30;

const historyItemValidator = v.object({
  threadId: v.string(),
  title: v.optional(v.string()),
  createdAt: v.number(),
  active: v.boolean(),
  photos: v.array(v.string()),
});

async function threadPhotos(ctx: QueryCtx, threadId: string) {
  const ideas = await ctx.db
    .query("ideas")
    .withIndex("by_thread", (q) => q.eq("threadId", threadId))
    .order("desc")
    .take(12);
  const seen = new Set<Id<"_storage">>();
  const photos: string[] = [];

  for (const idea of ideas) {
    if (!idea.image || seen.has(idea.image.storageId) || photos.length >= 3) {
      continue;
    }

    seen.add(idea.image.storageId);
    const url = await ctx.storage.getUrl(idea.image.storageId);

    if (url) {
      photos.push(url);
    }
  }

  return photos;
}

export const history = query({
  args: SessionIdArg,
  returns: v.array(historyItemValidator),
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user) {
      return [];
    }

    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: user._id,
      order: "desc",
      paginationOpts: { cursor: null, numItems: HISTORY_LIMIT },
    });

    return Promise.all(
      threads.page.map(async (thread) => ({
        threadId: thread._id,
        title: thread.title,
        createdAt: thread._creationTime,
        active: thread._id === user.activeThreadId,
        photos: await threadPhotos(ctx, thread._id),
      })),
    );
  },
});

export const openThread = mutation({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await getOrCreateUser(ctx, sessionId);

    if (!(await ownsThread(ctx, user, threadId)) || user.activeThreadId === threadId) {
      return null;
    }

    if (user.activeThreadId) {
      await updateThreadMetadata(ctx, components.agent, {
        threadId: user.activeThreadId,
        patch: { status: "archived" },
      });
    }

    await updateThreadMetadata(ctx, components.agent, { threadId, patch: { status: "active" } });
    await ctx.db.patch(user._id, { activeThreadId: threadId });

    return null;
  },
});

export const deleteThread = mutation({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user || !(await ownsThread(ctx, user, threadId))) {
      return null;
    }

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();

    for (const idea of ideas) {
      if (idea.image) {
        await ctx.storage.delete(idea.image.storageId);
      }

      await ctx.db.delete(idea._id);
    }

    if (user.activeThreadId === threadId) {
      await ctx.db.patch(user._id, { activeThreadId: undefined });
    }

    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId });

    return null;
  },
});
