import { useNavigate, useSearch } from "@tanstack/react-router";
import type { SessionId } from "convex-helpers/server/sessions";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export function useSilpoConnection(sessionId: SessionId | undefined) {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const startConnect = useAction(api.silpoAuth.startConnect);
  const finishConnect = useAction(api.silpoAuth.finishConnect);
  const completing = useRef<string | null>(null);
  const disconnect = useMutation(api.silpo.disconnect);
  const forgetAddress = useMutation(api.silpo.forgetAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    search.silpo === "error" ? "Не вдалося підключити Сільпо. Спробуй ще раз." : null,
  );

  useEffect(() => {
    if (search.silpo === "callback" && search.code && search.state) {
      if (!sessionId || completing.current === search.state) return;
      completing.current = search.state;
      setConnecting(true);
      void navigate({ to: "/", search: {}, replace: true });
      void finishConnect({ sessionId, code: search.code, state: search.state })
        .then((ok) => {
          if (!ok) setError("Не вдалося підключити Сільпо. Почни вхід знову в цьому браузері.");
        })
        .catch(() => setError("Не вдалося підключити Сільпо. Спробуй ще раз."))
        .finally(() => setConnecting(false));
    } else if (search.silpo) {
      void navigate({ to: "/", search: {}, replace: true });
    }
  }, [search.silpo, search.code, search.state, sessionId, navigate, finishConnect]);

  async function connect() {
    if (!sessionId) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const { url } = await startConnect({ sessionId });
      window.location.assign(url);
    } catch {
      setError("Не вдалося відкрити Сільпо. Спробуй ще раз.");
      setConnecting(false);
    }
  }

  return {
    connection,
    connecting,
    error,
    connect,
    disconnect: () => (sessionId ? disconnect({ sessionId }) : Promise.resolve(null)),
    forgetAddress: () => (sessionId ? forgetAddress({ sessionId }) : Promise.resolve(null)),
  };
}
