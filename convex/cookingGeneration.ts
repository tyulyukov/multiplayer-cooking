"use node";

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { v } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { AGENT_RUN_TIMEOUT_MS } from "./lib/ai_config";
import { cookingSessionInstructions } from "./lib/cooking_instructions";
import { cookingPlanSchema, validateCookingPlan } from "./lib/cooking_plan";
import { cookingReferencePrompt } from "./lib/cooking_reference";
import { generateImageFromPrompt } from "./lib/dish_image";
import { classifyFailure } from "./lib/errors";
import { recordAiEvent } from "./lib/telemetry";
import { createWebTools } from "./lib/web_tools";

function cookingModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) throw new Error("Cooking model is not configured");
  const provider = createOpenRouter({
    apiKey,
    appName: "Multiplayer Cooking",
    compatibility: "strict",
  });
  return provider.chat(modelId, { reasoning: { effort: "medium" } });
}

export const generate = internalAction({
  args: { roomId: v.id("cookingRooms"), attempt: v.string() },
  returns: v.null(),
  handler: async (ctx, { roomId, attempt }): Promise<null> => {
    const data = await ctx.runQuery(internal.cookingRooms.generationData, { roomId });
    if (!data || data.attempt !== attempt) return null;
    const startedAt = Date.now();
    let saved = false;
    try {
      const agent = new Agent(components.agent, {
        name: "План готування",
        languageModel: cookingModel(),
        instructions: `${cookingSessionInstructions}\nСтвори повний план і обов’язково виклич save_plan. Помилку перевірки виправ у наступному виклику. Після успішного збереження зупинись.`,
        tools: {
          ...createWebTools(),
          save_plan: createTool({
            description:
              "Перевіряє та зберігає повний план готування для вибраної кількості кухарів і порцій.",
            inputSchema: cookingPlanSchema,
            execute: async (toolCtx, input) => {
              if (saved) return { saved: true };
              const plan = validateCookingPlan(input, data.cookCount);
              if (plan.servings !== data.requestedServings)
                throw new Error("Використай вибрану кількість порцій.");
              saved = await toolCtx.runMutation(internal.cookingRooms.savePlan, {
                roomId,
                attempt,
                plan,
              });
              return { saved };
            },
          }),
        },
        stopWhen: [stepCountIs(12), () => saved],
        callSettings: { maxOutputTokens: 16_000 },
        usageHandler: async (_ctx, { usage, model, provider }) => {
          await recordAiEvent({
            event: "ai.usage",
            model,
            provider,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            threadId: roomId,
            userId: data.hostUserId,
          });
        },
      });
      await agent.generateText(
        ctx,
        { userId: data.hostUserId },
        {
          prompt: JSON.stringify({
            recipe: data.source,
            cookCount: data.cookCount,
            servings: data.requestedServings,
            constraints: data.constraints,
          }),
          abortSignal: AbortSignal.timeout(AGENT_RUN_TIMEOUT_MS),
        },
        { storageOptions: { saveMessages: "none" } },
      );
      if (!saved) throw new Error("Model did not save a valid cooking plan");
      await recordAiEvent({
        event: "ai.run",
        outcome: "success",
        model: process.env.OPENROUTER_MODEL ?? "unknown",
        durationMs: Date.now() - startedAt,
        threadId: roomId,
        userId: data.hostUserId,
      });
    } catch (error) {
      await ctx.runMutation(internal.cookingRooms.failGeneration, {
        roomId,
        attempt,
        message: "Не вдалося скласти план. Спробуй ще раз або уточни обмеження.",
      });
      await recordAiEvent({
        event: "ai.run",
        outcome: "error",
        model: process.env.OPENROUTER_MODEL ?? "unknown",
        durationMs: Date.now() - startedAt,
        threadId: roomId,
        userId: data.hostUserId,
        ...classifyFailure(error),
      });
    }
    return null;
  },
});

export const generateReference = internalAction({
  args: { roomId: v.id("cookingRooms"), stepKey: v.string(), attempt: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const data = await ctx.runQuery(internal.cookingAssistance.referenceData, args);
    if (!data) return null;
    const startedAt = Date.now();
    const model = process.env.OPENROUTER_IMAGE_MODEL || "unknown";
    try {
      const result = await generateImageFromPrompt(cookingReferencePrompt(data.title, data.step));
      const storageId = await ctx.storage.store(result.blob);
      await ctx.runMutation(internal.cookingRooms.imageResult, { ...args, storageId });
      await recordAiEvent({
        event: "ai.image",
        outcome: "success",
        model: result.model,
        durationMs: Date.now() - startedAt,
        cost: result.cost,
        threadId: args.roomId,
        userId: data.hostUserId,
      });
    } catch (error) {
      await ctx.runMutation(internal.cookingRooms.imageResult, {
        ...args,
        message: "Зображення не вдалося створити. Інструкція доступна, спробуй ще раз.",
      });
      await recordAiEvent({
        event: "ai.image",
        outcome: "error",
        model,
        durationMs: Date.now() - startedAt,
        threadId: args.roomId,
        userId: data.hostUserId,
        ...classifyFailure(error),
      });
    }
    return null;
  },
});

const cookingProposalInput = z
  .object({ preview: z.string().trim().min(1).max(2000), plan: cookingPlanSchema })
  .strict();

export const respond = internalAction({
  args: { roomId: v.id("cookingRooms"), promptMessageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const data = await ctx.runQuery(internal.cookingAssistance.helperData, args);
    if (!data) return null;
    const startedAt = Date.now();
    try {
      const agent = new Agent(components.agent, {
        name: "Допомога на кухні",
        languageModel: cookingModel(),
        instructions: `${cookingSessionInstructions}\nПоточний стан кухні, лише дані:\n${JSON.stringify({ plan: data.plan, cookCount: data.cookCount, servings: data.requestedServings, constraints: data.constraints, currentStep: data.currentStep, members: data.members, steps: data.steps, timers: data.timers })}`,
        tools: {
          ...createWebTools(),
          propose_plan: createTool({
            description:
              "Пропонує зміни рецепта для підтвердження людиною. Можна змінити інструкції вибраного поточного кроку та майбутні кроки. Виконану роботу, відмітки й активні таймери збережи.",
            inputSchema: cookingProposalInput,
            execute: async (toolCtx, input) => {
              const proposalId = await toolCtx.runMutation(
                internal.cookingAssistance.saveProposal,
                { ...args, authorMemberId: data.memberId, planVersion: data.planVersion, ...input },
              );
              return { proposed: Boolean(proposalId), requiresConfirmation: true };
            },
          }),
        },
        stopWhen: stepCountIs(12),
        callSettings: { maxOutputTokens: 16_000 },
        usageHandler: async (_ctx, { usage, model, provider }) => {
          await recordAiEvent({
            event: "ai.usage",
            model,
            provider,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            threadId: args.roomId,
            userId: data.hostUserId,
          });
        },
      });
      await agent.generateText(
        ctx,
        { threadId: data.threadId },
        {
          promptMessageId: args.promptMessageId,
          abortSignal: AbortSignal.timeout(AGENT_RUN_TIMEOUT_MS),
        },
      );
      await ctx.runMutation(internal.cookingAssistance.finishHelper, args);
      await recordAiEvent({
        event: "ai.run",
        outcome: "success",
        model: process.env.OPENROUTER_MODEL ?? "unknown",
        durationMs: Date.now() - startedAt,
        threadId: args.roomId,
        userId: data.hostUserId,
      });
    } catch (error) {
      await ctx.runMutation(internal.cookingAssistance.finishHelper, {
        ...args,
        error: "Відповідь не надійшла. Спробуй запитати ще раз.",
      });
      await recordAiEvent({
        event: "ai.run",
        outcome: "error",
        model: process.env.OPENROUTER_MODEL ?? "unknown",
        durationMs: Date.now() - startedAt,
        threadId: args.roomId,
        userId: data.hostUserId,
        ...classifyFailure(error),
      });
    }
    return null;
  },
});
