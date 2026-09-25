import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation, useQuery } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export const useHistory = (sessionId: SessionId | undefined, enabled: boolean) => {
  const items = useQuery(api.chat.history, sessionId && enabled ? { sessionId } : "skip");

  const cookingRooms = useQuery(
    api.cookingRooms.listOwned,
    sessionId && enabled ? { sessionId } : "skip",
  );

  const openThreadMutation = useMutation(api.chat.openThread);
  const deleteThreadMutation = useMutation(api.chat.deleteThread);

  return {
    items,
    cookingRooms,
    openThread(threadId: string) {
      return sessionId ? openThreadMutation({ sessionId, threadId }) : Promise.resolve(null);
    },
    deleteThread(threadId: string) {
      return sessionId ? deleteThreadMutation({ sessionId, threadId }) : Promise.resolve(null);
    },
  };
};
