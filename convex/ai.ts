"use node";

import { RateLimiter } from "@convex-dev/rate-limiter";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import { admitAiGeneration } from "./lib/ai_admission";
import { AI_MAX_OUTPUT_TOKENS, AI_RATE_LIMITS, AI_TEMPERATURE } from "./lib/ai_config";
import { aiGenerationResponseValidator } from "./lib/ai_contract";
import { type AiGenerationService, generateCookingIdea } from "./lib/ai_generation";
import { recordAiGeneration } from "./lib/telemetry";

const rateLimiter = new RateLimiter(components.rateLimiter, AI_RATE_LIMITS);

function getService(): AiGenerationService | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;

  if (!apiKey || !modelId) {
    return null;
  }

  const openrouter = createOpenRouter({
    apiKey,
    appName: "Multiplayer Cooking",
    compatibility: "strict",
  });

  const model = openrouter.chat(modelId);

  return {
    model: modelId,
    generateText: ({ abortSignal, prompt, system }) =>
      generateText({
        model,
        system,
        prompt,
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE,
        abortSignal,
        telemetry: {
          isEnabled: false,
          recordInputs: false,
          recordOutputs: false,
          functionId: "cooking-idea",
        },
      }),
  };
}

export const generate = action({
  args: {
    request: v.string(),
  },
  returns: aiGenerationResponseValidator,
  handler: async (ctx, args) =>
    generateCookingIdea(args.request, getService(), {
      allowGeneration: () =>
        admitAiGeneration({
          limit: (name, options) => rateLimiter.limit(ctx, name, options),
        }),
      recordAiGeneration,
    }),
});
