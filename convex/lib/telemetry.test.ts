import { afterEach, describe, expect, test } from "bun:test";

import { recordAiGeneration } from "./telemetry";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  dataset: process.env.AXIOM_DATASET,
  edge: process.env.AXIOM_EDGE,
  token: process.env.AXIOM_TOKEN,
};

afterEach(() => {
  globalThis.fetch = originalFetch;

  for (const [name, value] of Object.entries({
    AXIOM_DATASET: originalEnvironment.dataset,
    AXIOM_EDGE: originalEnvironment.edge,
    AXIOM_TOKEN: originalEnvironment.token,
  })) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("recordAiGeneration", () => {
  test("sends events to the configured Axiom edge", async () => {
    process.env.AXIOM_TOKEN = "xaat-test";
    process.env.AXIOM_DATASET = "multiplayer-cooking-test";
    process.env.AXIOM_EDGE = "eu-central-1.aws.edge.axiom.co";

    let requestUrl: string | undefined;
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        requestUrl = String(input);
        return new Response(
          JSON.stringify({
            blocksCreated: 0,
            failed: 0,
            ingested: 1,
            processedBytes: 1,
            walLength: 1,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      },
      { preconnect: () => undefined },
    );

    await recordAiGeneration({
      inputCharacters: 12,
      model: "openrouter/test",
      outcome: "success",
    });

    expect(requestUrl).toBe(
      "https://eu-central-1.aws.edge.axiom.co/v1/ingest/multiplayer-cooking-test",
    );
  });
});
