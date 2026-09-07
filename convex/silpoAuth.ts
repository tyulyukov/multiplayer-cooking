"use node";

import { randomBytes } from "node:crypto";

import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { parseVerifiedSilpoProfile, withSilpoClient } from "./lib/silpo_client";
import { createSilpoAuthProvider, SILPO_ISSUER, SILPO_MCP_URL } from "./lib/silpo_oauth";

function storedTokens(tokens: OAuthTokens) {
  if (!tokens.access_token || !tokens.token_type) {
    throw new Error("Сільпо не повернуло токен доступу");
  }

  return {
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
  };
}

// Returns the Сільпо authorization URL; the browser navigates there.
export const startConnect = action({
  args: SessionIdArg,
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { sessionId }) => {
    const previousUserId = await ctx.runMutation(internal.silpo.ensureUser, { sessionId });
    await ctx.runAction(internal.silpoAuth.verifyExistingConnection, { userId: previousUserId });
    const connecting = await ctx.runMutation(internal.accounts.beginConnect, { sessionId });
    const state = randomBytes(32).toString("base64url");
    let redirectUrl: URL | null = null;
    const provider = createSilpoAuthProvider(ctx, {
      userId: connecting.userId,
      start: {
        state,
        sessionId,
        authVersion: connecting.authVersion,
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

export const finishConnect = action({
  args: { ...SessionIdArg, state: v.string(), code: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { state, code, sessionId }): Promise<boolean> => {
    const pending: {
      userId: Id<"users">;
      sessionId: string;
      authVersion: number;
      codeVerifier: string;
    } | null = await ctx.runMutation(internal.silpo.consumeAuthState, { state, sessionId });

    if (!pending) {
      console.warn("Silpo callback with unknown or expired state");
      return false;
    }

    let stagedTokens: OAuthTokens | undefined;
    const saveStagedTokens = async (tokens: OAuthTokens) => {
      stagedTokens = tokens;
    };
    const provider = createSilpoAuthProvider(ctx, {
      userId: pending.userId,
      codeVerifier: pending.codeVerifier,
      getStagedTokens: () => stagedTokens,
      saveStagedTokens,
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

    if (!stagedTokens) {
      console.error("Silpo token exchange completed without tokens");
      return false;
    }

    try {
      const profileResult = await withSilpoClient(
        ctx,
        pending.userId,
        (client) => client.callTool("silpo_get_my_profile", {}),
        { provider },
      );
      const verified = parseVerifiedSilpoProfile(profileResult);

      if (!verified || !stagedTokens) {
        console.error("Silpo returned an unverified profile shape");
        return false;
      }

      const linked: Id<"users"> | null = await ctx.runMutation(internal.accounts.linkConnection, {
        sessionId: pending.sessionId,
        authVersion: pending.authVersion,
        sourceUserId: pending.userId,
        accountId: `${SILPO_ISSUER}:${verified.accountSubject}`,
        profile: verified.profile,
        tokens: storedTokens(stagedTokens),
      });

      return linked !== null;
    } catch (error) {
      console.error("Silpo profile verification failed", error);
      return false;
    }
  },
});

// Re-verifies a saved connection before folding legacy browser history into a canonical account.
export const verifyExistingConnection = internalAction({
  args: { userId: v.id("users") },
  returns: v.object({ verified: v.boolean() }),
  handler: async (ctx, { userId }): Promise<{ verified: boolean }> => {
    try {
      const connection = await ctx.runQuery(internal.silpo.connectionByUser, { userId });
      if (!connection) return { verified: false };
      let stagedTokens: OAuthTokens = connection.tokens;
      const provider = createSilpoAuthProvider(ctx, {
        userId,
        getStagedTokens: () => stagedTokens,
        saveStagedTokens: async (tokens) => {
          stagedTokens = tokens;
        },
      });
      const profileResult = await withSilpoClient(
        ctx,
        userId,
        (client) => client.callTool("silpo_get_my_profile", {}),
        { provider },
      );
      const verified = parseVerifiedSilpoProfile(profileResult);

      if (!verified || !connection) {
        return { verified: false };
      }

      const linked = await ctx.runMutation(internal.accounts.linkExistingConnection, {
        expectedAccessToken: connection.tokens.access_token,
        expectedTokensSavedAt: connection.tokensSavedAt,
        sourceUserId: userId,
        accountId: `${SILPO_ISSUER}:${verified.accountSubject}`,
        profile: verified.profile,
        tokens: storedTokens(stagedTokens),
      });
      return { verified: linked !== null };
    } catch (error) {
      console.error("Silpo existing connection verification failed", error);
      return { verified: false };
    }
  },
});

// Diagnostics for development: call one read-only tool and return the raw JSON.
export const callTool = internalAction({
  args: { userId: v.id("users"), name: v.string(), args: v.any() },
  returns: v.string(),
  handler: async (ctx, { userId, name, args }) =>
    JSON.stringify(
      await withSilpoClient(ctx, userId, (client) =>
        client.callTool(name, args as Record<string, unknown>),
      ),
    ),
});

// Diagnostics for development: dump the live tool list of a connected user.
export const listTools = internalAction({
  args: { userId: v.id("users") },
  // Serialized: JSON Schema keys such as $schema are not valid Convex field names.
  returns: v.string(),
  handler: async (ctx, { userId }) =>
    JSON.stringify(await withSilpoClient(ctx, userId, async (client) => client.listTools())),
});
