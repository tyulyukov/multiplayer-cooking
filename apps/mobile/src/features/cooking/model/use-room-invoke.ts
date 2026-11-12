import { isString } from "@multiplayer-cooking/core/shared/type-guards";
import { ConvexError } from "convex/values";
import { useRef, useState } from "react";

export const staleRoomMessage = "Стан кухні змінився. Перевір крок і спробуй ще раз.";

const syncFailedMessage = "Не вдалося синхронізувати зміну. Спробуй ще раз.";

export type RoomError = Readonly<{ message: string; scope?: string }>;

// Server rules throw ConvexError with a Ukrainian sentence; anything else gets the fallback.
export const serverMessage = (failure: Error, fallback: string) => {
  return failure instanceof ConvexError && isString(failure.data) ? failure.data : fallback;
};

// Port of the web room `invoke`: one shared "room" operation at a time, per-key locks for
// timers, and checklist taps that never block. Resolves true when the server accepted it.
export const useRoomInvoke = (online: boolean) => {
  const [error, setError] = useState<RoomError | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingScope, setPendingScope] = useState<string>();
  const operations = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);

  const invoke = async <T>(call: () => Promise<T>, key = "room", scope?: string) => {
    const running = operations.current;

    if (!online || running.has("room") || (key !== "checklist" && running.has(key))) return false;
    setError(null);

    if (key === "room") {
      setPending(true);
      setPendingScope(scope);
    }

    if (key !== "checklist") {
      running.add(key);
      setPendingKeys([...running]);
    }

    try {
      const result = await call();

      if (result === false || result === null) {
        setError({ message: staleRoomMessage, scope });

        return false;
      }

      return true;
    } catch (failure) {
      setError({
        message:
          failure instanceof Error ? serverMessage(failure, syncFailedMessage) : syncFailedMessage,
        scope,
      });

      return false;
    } finally {
      if (key === "room") {
        setPending(false);
        setPendingScope(undefined);
      }

      running.delete(key);
      setPendingKeys([...running]);
    }
  };

  return { invoke, error, setError, pending, setPending, pendingScope, pendingKeys };
};
