import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { mergeHistory } from "@multiplayer-cooking/core/history/merge-history";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export const useHistory = () => {
  const [sessionId] = useSessionId();
  const args = sessionId ? { sessionId } : ("skip" as const);
  const items = useQuery(api.chat.history, args);
  const rooms = useQuery(api.cookingRooms.listOwned, args);
  const openThreadMutation = useMutation(api.chat.openThread);
  const deleteThreadMutation = useMutation(api.chat.deleteThread);
  const [error, setError] = useState<string | null>(null);

  const openThread = async (threadId: string) => {
    if (!sessionId) return false;
    setError(null);

    try {
      await openThreadMutation({ sessionId, threadId });

      return true;
    } catch {
      setError("Не вдалося відкрити розмову. Спробуй ще раз.");

      return false;
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!sessionId) return false;
    setError(null);

    try {
      await deleteThreadMutation({ sessionId, threadId });

      return true;
    } catch {
      setError("Не вдалося видалити розмову. Спробуй ще раз.");

      return false;
    }
  };

  return {
    entries: items === undefined ? undefined : mergeHistory(items, rooms ?? []),
    error,
    openThread,
    deleteThread,
  };
};
