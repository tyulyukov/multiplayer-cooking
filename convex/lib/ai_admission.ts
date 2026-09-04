import { AI_RATE_LIMITS } from "./ai_config";

export type AiLimitName = keyof typeof AI_RATE_LIMITS;

export type AiLimitPort = Readonly<{
  limit: (
    name: AiLimitName,
    options?: Readonly<{ count: number }>,
  ) => Promise<Readonly<{ ok: boolean }>>;
}>;

export async function admitAiGeneration({ limit }: AiLimitPort) {
  const burst = await limit("chatBurst");

  if (!burst.ok) {
    return false;
  }

  const daily = await limit("chatDaily");

  if (daily.ok) {
    return true;
  }

  await limit("chatBurst", { count: -1 });
  return false;
}
