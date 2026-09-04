export const AI_REQUEST_MAX_CHARACTERS = 1024;
export const AI_MAX_OUTPUT_TOKENS = 4_000;
export const AGENT_MAX_STEPS = 50;
// Convex Node actions stop at 10 minutes; leave room to record the failure.
export const AGENT_RUN_TIMEOUT_MS = 8 * 60_000;

export const AI_RATE_LIMITS = {
  chatBurst: { kind: "token bucket", rate: 5, period: 60_000, capacity: 5 },
  chatDaily: { kind: "fixed window", rate: 40, period: 86_400_000 },
  uploadBurst: { kind: "token bucket", rate: 12, period: 60_000, capacity: 12 },
} as const;

// Delivery address length accepted by the secure address form.
export const ADDRESS_MAX_CHARACTERS = 200;

// Photo attachments in a message: the browser resizes them before upload.
export const AI_MAX_IMAGES = 4;
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_EDGE = 1600;
