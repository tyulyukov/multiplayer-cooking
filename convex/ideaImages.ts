"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { DISH_IMAGE_MODEL, generateDishImage } from "./lib/dish_image";
import { classifyFailure } from "./lib/errors";
import { recordAiEvent } from "./lib/telemetry";

const imageFailureMessage = "Не вдалося створити фото страви. Спробуй оновити ідею трохи пізніше.";

export const generate = internalAction({
  args: { ideaId: v.id("ideas") },
  returns: v.object({ generated: v.boolean() }),
  handler: async (ctx, { ideaId }): Promise<{ generated: boolean }> => {
    const idea = await ctx.runQuery(internal.ideas.get, { ideaId });
    if (!idea) return { generated: false };
    if (idea.image?.generated) return { generated: true };
    const startedAt = Date.now();
    try {
      const result = await generateDishImage(idea);
      const storageId = await ctx.storage.store(result.blob);
      const generated = await ctx.runMutation(internal.ideas.saveImage, {
        ideaId,
        image: { storageId, generated: true },
      });
      await recordAiEvent({
        event: "ai.image",
        outcome: "success",
        model: DISH_IMAGE_MODEL,
        durationMs: Date.now() - startedAt,
        cost: result.cost,
        threadId: idea.threadId,
        userId: idea.userId,
      });
      return { generated };
    } catch (error) {
      await ctx.runMutation(internal.ideas.saveImageError, {
        ideaId,
        message: imageFailureMessage,
      });
      await recordAiEvent({
        event: "ai.image",
        outcome: "error",
        model: DISH_IMAGE_MODEL,
        durationMs: Date.now() - startedAt,
        threadId: idea.threadId,
        userId: idea.userId,
        ...classifyFailure(error),
      });
      return { generated: false };
    }
  },
});
