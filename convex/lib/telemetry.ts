import { Axiom } from "@axiomhq/js";

import { classifyFailure } from "./errors";

const AXIOM_REQUEST_TIMEOUT_MS = 1_500;

export type AiGenerationEvent = Readonly<{
  durationMs?: number;
  errorName?: string;
  finishReason?: string;
  httpStatus?: number;
  inputCharacters: number;
  inputTokens?: number;
  model: string;
  outcome: "error" | "success";
  outputCharacters?: number;
  outputTokens?: number;
  retryable?: boolean;
  truncated?: boolean;
}>;

let cachedAxiom: Readonly<{ client: Axiom; edge: string; token: string }> | undefined;

function reportAxiomFailure(error: unknown) {
  console.error("Axiom ingestion failed", classifyFailure(error));
}

function createAxiomFetch() {
  const fetchWithTimeout = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const timeout = AbortSignal.timeout(AXIOM_REQUEST_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

    return fetch(input, { ...init, signal });
  };

  return Object.assign(fetchWithTimeout, { preconnect: () => undefined });
}

function getAxiom(token: string, edge: string) {
  if (cachedAxiom?.token !== token || cachedAxiom.edge !== edge) {
    cachedAxiom = {
      client: new Axiom({
        token,
        edge,
        axiomClient: "multiplayer-cooking/0.0.0",
        fetch: createAxiomFetch(),
        onError: reportAxiomFailure,
      }),
      edge,
      token,
    };
  }

  return cachedAxiom.client;
}

export async function recordAiGeneration(event: AiGenerationEvent) {
  const token = process.env.AXIOM_TOKEN;
  const dataset = process.env.AXIOM_DATASET;
  const edge = process.env.AXIOM_EDGE;

  if (!token || !dataset || !edge) {
    return;
  }

  try {
    const client = getAxiom(token, edge);

    client.ingest(dataset, {
      _time: new Date().toISOString(),
      event: "ai.generate",
      service: "multiplayer-cooking",
      ...event,
    });
    await client.flush();
  } catch (error) {
    reportAxiomFailure(error);
  }
}
