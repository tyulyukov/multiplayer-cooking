import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { findUser, resolveUserId } from "./lib/users";
import { ideaCartValidator, ideaDocValidator, ideaFields, ideaImageValidator } from "./schema";

export const save = internalMutation({
  args: ideaFields,
  returns: v.id("ideas"),
  handler: async (ctx, args) =>
    ctx.db.insert("ideas", {
      ...args,
      userId: await resolveUserId(ctx, args.userId),
      pending: true,
    }),
});

export const finishRun = internalMutation({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, promptMessageId, userId: requestedUserId }) => {
    const userId = await resolveUserId(ctx, requestedUserId);
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_thread_prompt", (q) =>
        q.eq("threadId", threadId).eq("promptMessageId", promptMessageId),
      )
      .collect();

    for (const idea of ideas) {
      if (idea.userId === userId && idea.promptMessageId === promptMessageId && idea.pending) {
        await ctx.db.patch(idea._id, { pending: false });
      }
    }

    return null;
  },
});

export const latestForThread = internalQuery({
  args: { threadId: v.string() },
  returns: v.union(v.null(), ideaDocValidator),
  handler: async (ctx, { threadId }) =>
    ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .first(),
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

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(IDEA_VERSIONS_LIMIT);
    const idea = ideas.find((item) => !item.pending);

    if (!idea || idea.userId !== user._id) {
      return null;
    }

    const imageUrl = idea.image ? await ctx.storage.getUrl(idea.image.storageId) : null;

    return { ...idea, imageUrl: imageUrl ?? undefined };
  },
});

export const get = internalQuery({
  args: { ideaId: v.id("ideas") },
  returns: v.union(v.null(), ideaDocValidator),
  handler: async (ctx, { ideaId }) => ctx.db.get(ideaId),
});

// Cart writes happen only from this explicit action, never from the model.
export const addToCart = mutation({
  args: { ...SessionIdArg, ideaId: v.id("ideas") },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, ideaId }) => {
    const user = await findUser(ctx, sessionId);
    const idea = await ctx.db.get(ideaId);

    if (!user || !idea || idea.userId !== user._id) {
      return { ok: false as const, message: "Ця ідея недоступна." };
    }

    if (!idea.products?.some((product) => product.productId)) {
      return { ok: false as const, message: "Спочатку підбери продукти в Сільпо." };
    }

    if (idea.cartPending) {
      return { ok: true as const };
    }

    await ctx.db.patch(ideaId, { cartPending: true, cartError: undefined });
    await ctx.scheduler.runAfter(0, internal.silpoCart.addIdeaToCart, {
      ideaId,
      userId: user._id,
      refreshOnly: Boolean(idea.cart),
    });

    return { ok: true as const };
  },
});

export const saveCart = internalMutation({
  args: { ideaId: v.id("ideas"), cart: ideaCartValidator },
  returns: v.null(),
  handler: async (ctx, { ideaId, cart }) => {
    await ctx.db.patch(ideaId, { cart, cartError: undefined, cartPending: false });

    return null;
  },
});

export const saveCartError = internalMutation({
  args: { ideaId: v.id("ideas"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, { ideaId, message }) => {
    await ctx.db.patch(ideaId, { cartError: message, cartPending: false });

    return null;
  },
});

export const IDEA_VERSIONS_LIMIT = 30;

// Every saved version of the idea in a thread, oldest first, with photo URLs resolved.
export const listForThread = query({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.array(ideaViewValidator),
  handler: async (ctx, { sessionId, threadId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user) {
      return [];
    }

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .take(IDEA_VERSIONS_LIMIT);

    const visibleIdeas = ideas.filter((idea) => idea.userId === user._id && !idea.pending);
    return Promise.all(
      visibleIdeas.map(async (idea) => ({
        ...idea,
        imageUrl: idea.image
          ? ((await ctx.storage.getUrl(idea.image.storageId)) ?? undefined)
          : undefined,
      })),
    );
  },
});

// Returns the thread to the state right after this version: later messages and ideas are removed.
export const restore = mutation({
  args: { ...SessionIdArg, ideaId: v.id("ideas") },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { sessionId, ideaId }) => {
    const user = await findUser(ctx, sessionId);
    const idea = await ctx.db.get(ideaId);

    if (!user || !idea || idea.userId !== user._id) {
      return { ok: false as const, message: "Ця версія недоступна." };
    }

    const [prompt] = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [idea.promptMessageId],
    });

    if (!prompt) {
      return { ok: false as const, message: "Повідомлення цієї версії вже видалено." };
    }

    let cursor = { startOrder: prompt.order + 1, startStepOrder: undefined as number | undefined };

    for (let round = 0; round < 20; round += 1) {
      const result = await ctx.runMutation(components.agent.messages.deleteByOrder, {
        threadId: idea.threadId,
        startOrder: cursor.startOrder,
        startStepOrder: cursor.startStepOrder,
        endOrder: Number.MAX_SAFE_INTEGER,
      });

      if (result.isDone || result.lastOrder === undefined) {
        break;
      }

      cursor = { startOrder: result.lastOrder, startStepOrder: result.lastStepOrder };
    }

    const later = await ctx.db
      .query("ideas")
      .withIndex("by_thread", (q) => q.eq("threadId", idea.threadId))
      .order("desc")
      .take(IDEA_VERSIONS_LIMIT);

    for (const version of later) {
      if (version._creationTime > idea._creationTime) {
        if (version.image?.generated) await ctx.storage.delete(version.image.storageId);
        await ctx.db.delete(version._id);
      }
    }

    return { ok: true as const };
  },
});

export const setCookCount = mutation({
  args: { ...SessionIdArg, ideaId: v.id("ideas"), count: v.number() },
  returns: v.null(),
  handler: async (ctx, { sessionId, ideaId, count }) => {
    const user = await findUser(ctx, sessionId);
    const idea = await ctx.db.get(ideaId);

    if (!user || !idea || idea.userId !== user._id) {
      return null;
    }

    if (!Number.isInteger(count) || count < 1 || count > 12) {
      return null;
    }

    await ctx.db.patch(ideaId, { cookCount: count });

    return null;
  },
});

export const saveImage = internalMutation({
  args: { ideaId: v.id("ideas"), image: ideaImageValidator },
  returns: v.boolean(),
  handler: async (ctx, { ideaId, image }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea || idea.image?.generated) {
      await ctx.storage.delete(image.storageId);
      return Boolean(idea?.image?.generated);
    }
    await ctx.db.patch(ideaId, { image, imageError: undefined });
    return true;
  },
});

export const saveImageError = internalMutation({
  args: { ideaId: v.id("ideas"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, { ideaId, message }) => {
    if (await ctx.db.get(ideaId)) await ctx.db.patch(ideaId, { imageError: message });
    return null;
  },
});
