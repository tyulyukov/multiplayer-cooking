import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";

// Saved idea versions of a thread, oldest first; the last one is the current idea.
export const useThreadIdeas = (threadId: string | undefined) => {
  const [sessionId] = useSessionId();

  return useQuery(
    api.ideas.listForThread,
    sessionId && threadId ? { sessionId, threadId } : "skip",
  );
};
