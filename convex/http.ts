import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// The redirect target comes only from configuration, never from the request.
function backToApp(outcome: "connected" | "error") {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    const text =
      outcome === "connected"
        ? "Сільпо підключено. Повернись у застосунок."
        : "Не вдалося підключити Сільпо.";

    return new Response(text, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const target = new URL(appUrl);
  target.searchParams.set("silpo", outcome);

  return Response.redirect(target.toString(), 302);
}

const http = httpRouter();

http.route({
  path: "/silpo/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      console.warn("Silpo callback without code", params.get("error") ?? "");
      return backToApp("error");
    }

    const ok = await ctx.runAction(internal.silpoAuth.finishConnect, { state, code });

    return backToApp(ok ? "connected" : "error");
  }),
});

export default http;
