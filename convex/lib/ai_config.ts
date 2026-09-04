export const AI_REQUEST_MAX_CHARACTERS = 1024;
export const AI_MAX_OUTPUT_TOKENS = 4_000;
export const AGENT_MAX_STEPS = 50;
// Convex Node actions stop at 10 minutes; leave room to record the failure.
export const AGENT_RUN_TIMEOUT_MS = 8 * 60_000;

export const AI_RATE_LIMITS = {
  chatBurst: { kind: "token bucket", rate: 5, period: 60_000, capacity: 5 },
  chatDaily: { kind: "fixed window", rate: 40, period: 86_400_000 },
} as const;
