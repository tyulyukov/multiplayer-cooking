import {
  createThread,
  getThreadMetadata,
  listMessages as listThreadMessages,
  listUIMessages,
  saveMessage,
  syncStreams,
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
import {
  AI_MAX_IMAGES,
  AI_RATE_LIMITS,
  AI_REQUEST_MAX_CHARACTERS,
  DRAFT_MAX_CHARACTERS,
} from "./lib/ai_config";
import { readQuestionInput, validateQuestionSubmission } from "./lib/questions";
import {
  findUser,
  findSession,
  getOrCreateUser,
  resolveUserId,
  setActiveThread,
} from "./lib/users";

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

    if (!user) return null;
    const session = await findSession(ctx, sessionId);
    const threadId = session ? session.activeThreadId : user.activeThreadId;
    return threadId && (await ownsThread(ctx, user, threadId)) ? { threadId } : null;
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

const draftValidator = v.object({
  text: v.string(),
  images: v.array(v.object({ storageId: v.id("_storage"), url: v.string() })),
});

async function findDraft(ctx: QueryCtx, userId: Id<"users">, threadId: string | undefined) {
  return ctx.db
    .query("drafts")
    .withIndex("by_user_thread", (q) => q.eq("userId", userId).eq("threadId", threadId))
    .unique();
}

async function ownsUpload(ctx: QueryCtx, userId: Id<"users">, storageId: Id<"_storage">) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();

  return upload?.userId === userId;
}

// Returns an empty draft, not null, when nothing is saved: the client treats null as "not loaded yet".
export const draft = query({
  args: { ...SessionIdArg, threadId: v.optional(v.string()) },
  returns: v.union(v.null(), draftValidator),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user) return null;

    const saved = await findDraft(ctx, user._id, threadId);
    const images: { storageId: Id<"_storage">; url: string }[] = [];

    for (const storageId of saved?.imageIds ?? []) {
      const url = await ctx.storage.getUrl(storageId);

      if (url) images.push({ storageId, url });
    }

    return { text: saved?.text ?? "", images };
  },
});

export const saveDraft = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.optional(v.string()),
    text: v.string(),
    imageIds: v.array(v.id("_storage")),
  },
  // false means nothing was written; the client keeps the text and tries again later.
  returns: v.boolean(),
  handler: async (ctx, { sessionId, threadId, text, imageIds }) => {
    const user = await findUser(ctx, sessionId);

    if (!user || (threadId && !(await ownsThread(ctx, user, threadId)))) return false;

    const { ok } = await rateLimiter.limit(ctx, "draftBurst", { key: user._id });

    if (!ok) return false;

    const ownImageIds: Id<"_storage">[] = [];

    for (const storageId of imageIds.slice(0, AI_MAX_IMAGES)) {
      if (await ownsUpload(ctx, user._id, storageId)) ownImageIds.push(storageId);
    }

    const value = { text: text.slice(0, DRAFT_MAX_CHARACTERS), imageIds: ownImageIds };
    const existing = await findDraft(ctx, user._id, threadId);

    if (!value.text.trim() && value.imageIds.length === 0) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("drafts", { userId: user._id, threadId, ...value });
    }

    return true;
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
      const url = (await ownsUpload(ctx, user._id, imageId))
        ? await ctx.storage.getUrl(imageId)
        : null;

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

    // The draft for this composer is sent now; a stale copy must not reappear on another device.
    const savedDraft = await findDraft(ctx, user._id, requestedThreadId);

    if (savedDraft) await ctx.db.delete(savedDraft._id);

    let threadId = requestedThreadId;

    if (!threadId) {
      threadId = await createThread(ctx, components.agent, { userId: user._id });
      await setActiveThread(ctx, sessionId, threadId);
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
    await setActiveThread(ctx, sessionId, undefined);
    return null;
  },
});

// Continues a thread after a server-side step (for example the cart is ready).
export const followUp = internalMutation({
  args: { userId: v.id("users"), threadId: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId: requestedUserId, threadId, text }) => {
    const userId = await resolveUserId(ctx, requestedUserId);
    const user = await ctx.db.get(userId);
    if (!user || !(await ownsThread(ctx, user, threadId))) return null;
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

// An answer is accepted only for an ask_user call in this thread that has no result yet.
async function pendingQuestionInput(ctx: QueryCtx, threadId: string, toolCallId: string) {
  const recent = await listThreadMessages(ctx, components.agent, {
    threadId,
    paginationOpts: { cursor: null, numItems: 40 },
  });
  let input: unknown;

  for (const doc of recent.page) {
    const content = doc.message?.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (part.type === "tool-call" && part.toolCallId === toolCallId) {
        if (part.toolName !== "ask_user") return null;
        input = "input" in part ? part.input : part.args;
      }

      if (part.type === "tool-result" && part.toolCallId === toolCallId) {
        return null;
      }
    }
  }

  return input === undefined ? null : readQuestionInput(input);
}

export const answerQuestion = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    toolCallId: v.string(),
    answer: v.object({
      answers: v.array(
        v.object({
          questionId: v.string(),
          optionIds: v.array(v.string()),
          custom: v.optional(v.string()),
        }),
      ),
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

    const input = await pendingQuestionInput(ctx, threadId, toolCallId);
    if (!input) {
      return { ok: false as const, message: "Це питання вже закрите." };
    }

    const value = validateQuestionSubmission(input, answer);
    if (!value) {
      return { ok: false as const, message: "Перевір відповіді та спробуй ще раз." };
    }

    const admitted = await admitAiGeneration({
      limit: (name, options) => rateLimiter.limit(ctx, name, { ...options, key: user._id }),
    });

    if (!admitted) {
      return { ok: false as const, message: "Забагато запитів. Спробуй трохи пізніше." };
    }

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

    const session = await findSession(ctx, sessionId);
    const activeThreadId = session ? session.activeThreadId : user.activeThreadId;
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
        active: thread._id === activeThreadId,
        photos: await threadPhotos(ctx, thread._id),
      })),
    );
  },
});

export const openThread = mutation({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await findUser(ctx, sessionId);
    if (!user || !(await ownsThread(ctx, user, threadId))) return null;
    await setActiveThread(ctx, sessionId, threadId);
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
    // Versions share a photo when the model reuses "img_previous"; delete each file once.
    const storageIds = new Set(ideas.flatMap((idea) => (idea.image ? [idea.image.storageId] : [])));

    for (const idea of ideas) {
      await ctx.db.delete(idea._id);
    }

    for (const storageId of storageIds) {
      await ctx.storage.delete(storageId);
    }

    const savedDraft = await findDraft(ctx, user._id, threadId);

    if (savedDraft) await ctx.db.delete(savedDraft._id);

    const session = await findSession(ctx, sessionId);
    if ((session ? session.activeThreadId : user.activeThreadId) === threadId) {
      await setActiveThread(ctx, sessionId, undefined);
    }

    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId });

    return null;
  },
});
