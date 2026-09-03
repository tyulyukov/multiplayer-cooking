import { v, type Infer } from "convex/values";

export const aiGenerationResponseValidator = v.union(
  v.object({
    ok: v.literal(true),
    text: v.string(),
  }),
  v.object({
    ok: v.literal(false),
    message: v.string(),
  }),
);

export type AiGenerationResponse = Infer<typeof aiGenerationResponseValidator>;
