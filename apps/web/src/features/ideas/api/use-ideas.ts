import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation, useQuery } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useIdeaVersions } from "@/features/ideas/api/use-idea-versions";

export function useIdeas(sessionId: SessionId | undefined, threadId: string | null) {
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const latest = useQuery(api.ideas.latest, threadArgs);
  const versions = useIdeaVersions(sessionId, threadId, latest);
  const addToCartMutation = useMutation(api.ideas.addToCart);

  return {
    ...versions,
    addToCart() {
      return sessionId && versions.idea
        ? addToCartMutation({ sessionId, ideaId: versions.idea._id })
        : Promise.resolve(null);
    },
  };
}
