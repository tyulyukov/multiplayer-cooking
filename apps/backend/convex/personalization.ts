import { ConvexError } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { agentSettingsValidator, memoryKindValidator } from "./schema";
import { findUser, getOrCreateUser, resolveUserId } from "./lib/users";

export const MAX_PREFERENCE_MEMORIES = 60;

const defaultSettings = {
  tone: "friendly" as const,
  customInstructions: "",
  about: "",
};

const settingsValidator = v.object({
  tone: v.optional(v.union(v.literal("friendly"), v.literal("concise"), v.literal("playful"))),
  customInstructions: v.optional(v.string()),
  about: v.optional(v.string()),
});

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function preserveLines(value: string) {
  return value.trim().replace(/[\t ]+/g, " ");
}

export function normalizeMemorySubject(value: string) {
  return compact(value).normalize("NFKC").toLocaleLowerCase("uk-UA");
}

export function normalizeMemoryText(value: string) {
  return compact(value);
}

export function memoryKey(kind: "allergy" | "dislike" | "preference", subject: string) {
  return `${kind}:${normalizeMemorySubject(subject)}`;
}

function cleanSettings(settings: {
  tone?: "friendly" | "concise" | "playful";
  customInstructions?: string;
  about?: string;
}) {
  const customInstructions = preserveLines(settings.customInstructions ?? "");
  const about = preserveLines(settings.about ?? "");
  if (customInstructions.length > 1000 || about.length > 600) {
    throw new ConvexError("Налаштування агента надто довгі.");
  }

  return {
    tone: settings.tone ?? defaultSettings.tone,
    customInstructions,
    about,
  };
}

export const memoryValidator = v.object({
  _id: v.id("memories"),
  _creationTime: v.number(),
  kind: memoryKindValidator,
  text: v.string(),
  subject: v.string(),
  updatedAt: v.number(),
});

export const personalizationValidator = v.object({
  memories: v.array(memoryValidator),
  settings: agentSettingsValidator,
});

function memoryView(memory: {
  _id: Id<"memories">;
  _creationTime: number;
  kind: "allergy" | "dislike" | "preference";
  text: string;
  subject: string;
  updatedAt: number;
}) {
  return {
    _id: memory._id,
    _creationTime: memory._creationTime,
    kind: memory.kind,
    text: memory.text,
    subject: memory.subject,
    updatedAt: memory.updatedAt,
  };
}

async function memoriesForUser(ctx: QueryCtx | MutationCtx, requestedUserId: Id<"users">) {
  const userId = await resolveUserId(ctx, requestedUserId);
  const memories = await ctx.db
    .query("memories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();

  return memories.sort((first, second) => second.updatedAt - first.updatedAt);
}

async function settingsForUser(ctx: QueryCtx | MutationCtx, requestedUserId: Id<"users">) {
  const userId = await resolveUserId(ctx, requestedUserId);
  const saved = await ctx.db
    .query("personalizations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return saved?.settings ?? defaultSettings;
}

export const get = query({
  args: SessionIdArg,
  returns: personalizationValidator,
  handler: async (ctx, { sessionId }) => {
    const user = await findUser(ctx, sessionId);

    if (!user) {
      return { memories: [], settings: defaultSettings };
    }

    return {
      memories: (await memoriesForUser(ctx, user._id)).map(memoryView),
      settings: await settingsForUser(ctx, user._id),
    };
  },
});

export const saveSettings = mutation({
  args: { ...SessionIdArg, settings: settingsValidator },
  returns: v.null(),
  handler: async (ctx, { sessionId, settings }) => {
    const user = await getOrCreateUser(ctx, sessionId);
    const next = cleanSettings(settings);
    const saved = await ctx.db
      .query("personalizations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (saved) {
      await ctx.db.patch(saved._id, { settings: next });
    } else {
      await ctx.db.insert("personalizations", { userId: user._id, settings: next });
    }

    return null;
  },
});

export const removeMemory = mutation({
  args: { ...SessionIdArg, memoryId: v.id("memories") },
  returns: v.null(),
  handler: async (ctx, { sessionId, memoryId }) => {
    const user = await findUser(ctx, sessionId);
    const memory = await ctx.db.get(memoryId);

    if (!user || !memory || memory.userId !== user._id) {
      throw new ConvexError("Спогад не знайдено.");
    }

    await ctx.db.delete(memoryId);
    return null;
  },
});

export const getForAgent = internalQuery({
  args: { userId: v.id("users") },
  returns: personalizationValidator,
  handler: async (ctx, { userId }) => ({
    memories: (await memoriesForUser(ctx, userId)).map(memoryView),
    settings: await settingsForUser(ctx, userId),
  }),
});

export const addMemory = internalMutation({
  args: {
    userId: v.id("users"),
    kind: memoryKindValidator,
    text: v.string(),
    subject: v.string(),
  },
  returns: v.object({ changed: v.boolean(), action: v.literal("added"), text: v.string() }),
  handler: async (ctx, { userId: requestedUserId, kind, text, subject }) => {
    const userId = await resolveUserId(ctx, requestedUserId);
    const cleanText = normalizeMemoryText(text);
    const cleanSubject = normalizeMemorySubject(subject);

    if (!cleanText || !cleanSubject || cleanText.length > 240 || cleanSubject.length > 160) {
      throw new ConvexError("Спогад має містити конкретний продукт або обмеження.");
    }

    const existing = await memoriesForUser(ctx, userId);
    const key = memoryKey(kind, cleanSubject);
    const duplicate = existing.find((memory) => memoryKey(memory.kind, memory.subject) === key);

    if (duplicate) {
      if (duplicate.text !== cleanText) {
        await ctx.db.patch(duplicate._id, { text: cleanText, updatedAt: Date.now() });
        return { changed: true, action: "added" as const, text: cleanText };
      }

      return { changed: false, action: "added" as const, text: cleanText };
    }

    if (
      kind !== "allergy" &&
      existing.filter((memory) => memory.kind !== "allergy").length >= MAX_PREFERENCE_MEMORIES
    ) {
      throw new ConvexError("Ліміт спогадів досягнуто. Видали непотрібний спогад у налаштуваннях.");
    }

    await ctx.db.insert("memories", {
      userId,
      kind,
      text: cleanText,
      subject: cleanSubject,
      updatedAt: Date.now(),
    });
    return { changed: true, action: "added" as const, text: cleanText };
  },
});

export const removeMemoryForAgent = internalMutation({
  args: { userId: v.id("users"), memoryId: v.id("memories") },
  returns: v.object({ changed: v.boolean(), action: v.literal("removed"), text: v.string() }),
  handler: async (ctx, { userId: requestedUserId, memoryId }) => {
    const userId = await resolveUserId(ctx, requestedUserId);
    const memory = await ctx.db.get(memoryId);
    if (!memory || memory.userId !== userId) {
      return { changed: false, action: "removed" as const, text: "" };
    }
    await ctx.db.delete(memory._id);
    return { changed: true, action: "removed" as const, text: memory.text };
  },
});
