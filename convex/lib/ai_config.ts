export const AI_MAX_OUTPUT_TOKENS = 600;
export const AI_TEMPERATURE = 0.9;
export const AI_REQUEST_MAX_CHARACTERS = 1024;
export const AI_GENERATION_TIMEOUT_MS = 25_000;

export const AI_RATE_LIMITS = {
  aiBurst: { kind: "token bucket", rate: 3, period: 60_000, capacity: 3 },
  aiDaily: { kind: "fixed window", rate: 100, period: 86_400_000 },
} as const;
