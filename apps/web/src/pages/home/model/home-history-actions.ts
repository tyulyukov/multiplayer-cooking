import type { SessionId } from "convex-helpers/server/sessions";
import type { Dispatch, SetStateAction } from "react";
import type { useHistory } from "@/features/history/api/use-history";

type Props = {
  sessionId: SessionId | undefined;
  history: Pick<ReturnType<typeof useHistory>, "openThread" | "deleteThread">;
  resetVersion: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
};

export const createHomeHistoryActions = ({ sessionId, history, resetVersion, setError }: Props) => {
  const openFromHistory = async (target: string) => {
    if (!sessionId) return;
    setError(null);

    try {
      await history.openThread(target);
      resetVersion();
    } catch {
      setError("Не вдалося відкрити розмову. Спробуй ще раз.");
    }
  };

  const removeFromHistory = async (target: string) => {
    if (!sessionId) return;
    setError(null);

    try {
      await history.deleteThread(target);
    } catch {
      setError("Не вдалося видалити розмову. Спробуй ще раз.");
    }
  };

  return { openFromHistory, removeFromHistory };
};
