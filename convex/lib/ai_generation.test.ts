import { describe, expect, test } from "bun:test";

import { AI_GENERATION_TIMEOUT_MS, AI_REQUEST_MAX_CHARACTERS } from "./ai_config";
import { type AiGenerationService, generateCookingIdea } from "./ai_generation";
import type { AiGenerationEvent } from "./telemetry";

const service: AiGenerationService = {
  model: "openrouter/test",
  generateText: async () => ({
    finishReason: "stop",
    text: "Борщ",
    usage: { inputTokens: 4, outputTokens: 8 },
  }),
};

function dependencies(
  overrides: Partial<{
    allowGeneration: () => Promise<boolean>;
    now: () => number;
    recordAiGeneration: (event: AiGenerationEvent) => Promise<void>;
  }> = {},
) {
  return {
    allowGeneration: async () => true,
    now: () => 100,
    recordAiGeneration: async () => undefined,
    ...overrides,
  };
}

describe("generateCookingIdea", () => {
  test("returns a concise result for an invalid request", async () => {
    const response = await generateCookingIdea("   ", service, dependencies());

    expect(response).toEqual({
      ok: false,
      message: "Опиши страву одним-двома реченнями.",
    });
  });

  test("returns a concise result when OpenRouter is not configured", async () => {
    const response = await generateCookingIdea("Борщ", null, dependencies());

    expect(response).toEqual({
      ok: false,
      message: "ШІ ще не налаштований. Додай ключ OpenRouter у Convex.",
    });
  });

  test("does not emit external telemetry before provider admission", async () => {
    let telemetryCalls = 0;
    const recordAiGeneration = async () => {
      telemetryCalls += 1;
    };

    await generateCookingIdea(" ", service, dependencies({ recordAiGeneration }));
    await generateCookingIdea("Борщ", null, dependencies({ recordAiGeneration }));
    await generateCookingIdea(
      "Борщ",
      service,
      dependencies({ allowGeneration: async () => false, recordAiGeneration }),
    );

    expect(telemetryCalls).toBe(0);
  });

  test("does not change a result when telemetry fails", async () => {
    const response = await generateCookingIdea(
      "Борщ",
      service,
      dependencies({
        recordAiGeneration: async () => Promise.reject(new Error("telemetry")),
      }),
    );

    expect(response).toEqual({ ok: true, text: "Борщ" });
  });

  test("returns generated text and records privacy-safe success telemetry", async () => {
    const events: AiGenerationEvent[] = [];
    let now = 100;
    const response = await generateCookingIdea(
      "Борщ",
      service,
      dependencies({
        now: () => {
          now += 25;
          return now;
        },
        recordAiGeneration: async (event) => {
          events.push(event);
        },
      }),
    );

    expect(response).toEqual({ ok: true, text: "Борщ" });
    expect(events).toEqual([
      {
        durationMs: 25,
        finishReason: "stop",
        inputCharacters: 4,
        inputTokens: 4,
        model: "openrouter/test",
        outcome: "success",
        outputCharacters: 4,
        outputTokens: 8,
        truncated: false,
      },
    ]);
  });

  test("records a truncated non-empty response as a successful generation", async () => {
    const events: AiGenerationEvent[] = [];
    const response = await generateCookingIdea(
      "Борщ",
      {
        ...service,
        generateText: async () => ({
          finishReason: "length",
          text: "Довга відповідь",
          usage: {},
        }),
      },
      dependencies({
        recordAiGeneration: async (event) => {
          events.push(event);
        },
      }),
    );

    expect(response).toEqual({ ok: true, text: "Довга відповідь" });
    expect(events[0]).toMatchObject({
      finishReason: "length",
      outcome: "success",
      truncated: true,
    });
  });

  test("classifies provider failures without recording the prompt", async () => {
    const events: AiGenerationEvent[] = [];
    const providerError = Object.assign(new Error("provider response body"), {
      isRetryable: true,
      name: "APICallError",
      statusCode: 503,
    });
    const unavailableService: AiGenerationService = {
      ...service,
      generateText: async () => Promise.reject(providerError),
    };

    const response = await generateCookingIdea(
      "Борщ без м'яса",
      unavailableService,
      dependencies({
        recordAiGeneration: async (event) => {
          events.push(event);
        },
      }),
    );

    expect(response).toEqual({
      ok: false,
      message: "Не вдалося звернутися до ШІ. Спробуй ще раз трохи пізніше.",
    });
    expect(JSON.stringify(response)).not.toContain("provider response body");
    expect(events).toEqual([
      {
        durationMs: 0,
        errorName: "APICallError",
        httpStatus: 503,
        inputCharacters: 14,
        model: "openrouter/test",
        outcome: "error",
        retryable: true,
      },
    ]);
  });

  test.each(["AbortError", "TimeoutError"])(
    "maps a %s provider call to the timeout result",
    async (errorName) => {
      let capturedSignal: AbortSignal | undefined;
      const timeoutService: AiGenerationService = {
        ...service,
        generateText: async ({ abortSignal }) => {
          capturedSignal = abortSignal;
          throw new DOMException("Timed out", errorName);
        },
      };

      const response = await generateCookingIdea("Борщ", timeoutService, dependencies());

      expect(response).toEqual({
        ok: false,
        message: "Запит зайняв забагато часу. Спробуй ще раз.",
      });
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(AI_GENERATION_TIMEOUT_MS).toBe(25_000);
    },
  );

  test.each([
    [1024, true],
    [1025, false],
  ])("enforces the %i-character request boundary", async (length, allowed) => {
    let providerCalls = 0;
    const response = await generateCookingIdea(
      "a".repeat(length),
      {
        ...service,
        generateText: async (input) => {
          providerCalls += 1;
          return service.generateText(input);
        },
      },
      dependencies(),
    );

    expect(AI_REQUEST_MAX_CHARACTERS).toBe(1024);
    expect(response.ok).toBe(allowed);
    expect(providerCalls).toBe(allowed ? 1 : 0);
  });

  test("does not invoke the provider when admission denies", async () => {
    let providerCalls = 0;
    const response = await generateCookingIdea(
      "Борщ",
      {
        ...service,
        generateText: async (input) => {
          providerCalls += 1;
          return service.generateText(input);
        },
      },
      dependencies({ allowGeneration: async () => false }),
    );

    expect(response).toEqual({
      ok: false,
      message: "Забагато запитів. Спробуй трохи пізніше.",
    });
    expect(providerCalls).toBe(0);
  });

  test("rejects a whitespace-only provider response", async () => {
    const response = await generateCookingIdea(
      "Борщ",
      {
        ...service,
        generateText: async () => ({
          finishReason: "length",
          text: " \n ",
          usage: {},
        }),
      },
      dependencies(),
    );

    expect(response).toEqual({
      ok: false,
      message: "Не вдалося звернутися до ШІ. Спробуй ще раз трохи пізніше.",
    });
  });
});
