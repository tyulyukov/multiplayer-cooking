import { AI_RATE_LIMITS } from "./ai_config";

export type AiLimitName = keyof typeof AI_RATE_LIMITS;

export type AiLimitPort = Readonly<{
  limit: (
    name: AiLimitName,
    options?: Readonly<{ count: number }>,
  ) => Promise<Readonly<{ ok: boolean }>>;
}>;

export async function admitAiGeneration({ limit }: AiLimitPort) {
  const burst = await limit("aiBurst");

  if (!burst.ok) {
    return false;
  }

  const daily = await limit("aiDaily");

  if (daily.ok) {
    return true;
  }

  await limit("aiBurst", { count: -1 });
  return false;
}
