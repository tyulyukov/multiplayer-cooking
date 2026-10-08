import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { isString } from "@multiplayer-cooking/core/shared/type-guards";
import { useSessionId } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useAction } from "convex/react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

const returnUrl = "multiplayer-cooking://silpo";

const retryMessage = "Не вдалося підключити Сільпо. Спробуй ще раз.";

export const useSilpoConnect = () => {
  const [sessionId] = useSessionId();
  const startConnect = useAction(api.silpoAuth.startConnect);
  const finishConnect = useAction(api.silpoAuth.finishConnect);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (session: SessionId) => {
    let url: string;

    try {
      ({ url } = await startConnect({ sessionId: session, client: "app" }));
    } catch {
      return "Не вдалося відкрити Сільпо. Спробуй ще раз.";
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);

      if (result.type !== "success") return null;
      const params = Linking.parse(result.url).queryParams ?? {};
      const { code, state } = params;

      if (params.silpo !== "callback" || !isString(code) || !isString(state) || !code || !state) {
        return retryMessage;
      }

      return (await finishConnect({ sessionId: session, code, state }))
        ? null
        : "Не вдалося підключити Сільпо. Почни вхід знову на цьому пристрої.";
    } catch {
      return retryMessage;
    }
  };

  const connect = async () => {
    if (!sessionId) return;
    setConnecting(true);
    setError(null);
    setError(await login(sessionId));
    setConnecting(false);
  };

  return { connect, connecting, error };
};
