import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";

import { CookAgainSheet, CookTogetherSheet } from "@/features/cooking/ui/cook-together-sheet";

type Params = { ideaId?: string; roomId?: string; servings?: string; cookCount?: string };

export default function CookTogetherRoute() {
  const { ideaId, roomId, servings, cookCount } = useLocalSearchParams<Params>();

  if (roomId) return <CookAgainSheet roomId={roomId} />;

  return (
    <CookTogetherSheet
      // SAFETY: the idea sheet passes its own idea `_id`; the server validates it.
      ideaId={ideaId as Id<"ideas">}
      servings={Number(servings) || 2}
      cookCount={Number(cookCount) || 1}
    />
  );
}
