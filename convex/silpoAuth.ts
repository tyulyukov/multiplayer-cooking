"use node";

import { randomBytes } from "node:crypto";

import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { shapeProfile, withSilpoClient } from "./lib/silpo_client";
import { createSilpoAuthProvider, SILPO_MCP_URL } from "./lib/silpo_oauth";

// Returns the Сільпо authorization URL; the browser navigates there.
export const startConnect = action({
  args: SessionIdArg,
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { sessionId }) => {
    const userId = await ctx.runMutation(internal.silpo.ensureUser, { sessionId });
    const state = randomBytes(32).toString("base64url");
    let redirectUrl: URL | null = null;
    const provider = createSilpoAuthProvider(ctx, {
      userId,
      start: {
        state,
        onRedirect: (url) => {
          redirectUrl = url;
        },
      },
    });

    const result = await auth(provider, { serverUrl: SILPO_MCP_URL });

    if (result !== "REDIRECT" || !redirectUrl) {
      throw new Error("Сільпо не повернуло адресу для входу");
    }

    return { url: (redirectUrl as URL).toString() };
  },
});

export const finishConnect = internalAction({
  args: { state: v.string(), code: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { state, code }) => {
    const pending = await ctx.runMutation(internal.silpo.consumeAuthState, { state });

    if (!pending) {
      console.warn("Silpo callback with unknown or expired state");
      return false;
    }

    const provider = createSilpoAuthProvider(ctx, {
      userId: pending.userId,
      codeVerifier: pending.codeVerifier,
    });

    try {
      const result = await auth(provider, { serverUrl: SILPO_MCP_URL, authorizationCode: code });

      if (result !== "AUTHORIZED") {
        return false;
      }
    } catch (error) {
      console.error("Silpo token exchange failed", error);
      return false;
    }

    try {
      const profile = await withSilpoClient(ctx, pending.userId, (client) =>
        client.callTool("silpo_get_my_profile", {}),
      );

      await ctx.runMutation(internal.silpo.saveProfile, {
        userId: pending.userId,
        profile: shapeProfile(profile),
      });
    } catch (error) {
      console.error("Silpo profile fetch failed", error);
    }

    return true;
  },
});

// Diagnostics for development: dump the live tool list of a connected user.
export const listTools = internalAction({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) =>
    withSilpoClient(ctx, userId, async (client) => client.listTools()),
});
