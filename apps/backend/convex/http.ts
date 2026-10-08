import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { SILPO_APP_RETURN_URL, SILPO_APP_STATE_PREFIX } from "./lib/silpo_app_return";

// The redirect target comes only from code or configuration, never from the request.
function backToApp(
  state: string | null,
  outcome: "callback" | "error",
  callback?: { code: string; state: string },
) {
  const appUrl = state?.startsWith(SILPO_APP_STATE_PREFIX)
    ? SILPO_APP_RETURN_URL
    : process.env.APP_URL;

  if (!appUrl) {
    const text =
      outcome === "callback"
        ? "Повернись у застосунок і повтори підключення Сільпо."
        : "Не вдалося підключити Сільпо.";

    return new Response(text, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const target = new URL(appUrl);
  target.searchParams.set("silpo", outcome);

  if (callback) {
    target.searchParams.set("code", callback.code);
    target.searchParams.set("state", callback.state);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}

const http = httpRouter();

http.route({
  path: "/silpo/callback",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      console.warn("Silpo callback without code", params.get("error") ?? "");

      return backToApp(state, "error");
    }

    return backToApp(state, "callback", { state, code });
  }),
});

export default http;
