import type { UseStorage } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useCallback, useState } from "react";

type StoredSession = SessionId | undefined;

// convex-helpers persists the session per tab by default; a device session must survive new tabs.
export const useLocalStorage: UseStorage<StoredSession> = (key, initialValue) => {
  const [value, setValueInternal] = useState<StoredSession>(() => {
    const existing = localStorage.getItem(key);

    if (existing) {
      return existing as SessionId;
    }

    if (initialValue !== undefined) {
      localStorage.setItem(key, initialValue);
    }

    return initialValue;
  });
  const setValue = useCallback(
    (next: StoredSession) => {
      if (next === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, next);
      }

      setValueInternal(next);
    },
    [key],
  );

  return [value, setValue] as const;
};
