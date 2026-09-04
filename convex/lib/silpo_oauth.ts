import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

export const SILPO_MCP_URL = "https://mcp.silpo.ua/mcp";
export const SILPO_ISSUER = "https://mcp.silpo.ua";
export const SILPO_REAUTH_MESSAGE = "Сесія Сільпо закінчилась. Натисни «Перепідключити» в меню.";

// Thrown when a stored token can no longer be refreshed and the person must log in again.
export class SilpoReauthRequiredError extends Error {
  constructor() {
    super(SILPO_REAUTH_MESSAGE);
    this.name = "SilpoReauthRequiredError";
  }
}

export function silpoRedirectUri() {
  const siteUrl = process.env.CONVEX_SITE_URL;

  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set");
  }

  return `${siteUrl.replace(/\/+$/, "")}/silpo/callback`;
}

type ProviderOptions = Readonly<{
  userId: Id<"users">;
  // The authorization leg: ignore stored tokens and remember where the SDK wants to redirect.
  start?: { state: string; onRedirect: (url: URL) => void };
  // The callback leg: the verifier saved during the authorization leg.
  codeVerifier?: string;
}>;

// Persists client registration and tokens in Convex; the SDK drives the OAuth flow.
export function createSilpoAuthProvider(
  ctx: ActionCtx,
  options: ProviderOptions,
): OAuthClientProvider {
  const redirectUri = silpoRedirectUri();
  const clientKey = { issuer: SILPO_ISSUER, redirectUri };
  const { userId, start, codeVerifier } = options;

  return {
    redirectUrl: redirectUri,
    clientMetadata: {
      client_name: "Multiplayer Cooking",
      client_uri: "https://cooking.tyulyukov.com",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    } satisfies OAuthClientMetadata,
    state: start ? () => start.state : undefined,
    async clientInformation() {
      const stored = await ctx.runQuery(internal.silpo.oauthClient, clientKey);

      return stored ? (JSON.parse(stored) as OAuthClientInformationMixed) : undefined;
    },
    async saveClientInformation(info) {
      await ctx.runMutation(internal.silpo.saveOAuthClient, {
        ...clientKey,
        clientInformation: JSON.stringify(info),
      });
    },
    async tokens() {
      if (start) {
        return undefined;
      }

      const found = await ctx.runQuery(internal.silpo.connectionByUser, { userId });

      return found?.tokens;
    },
    async saveTokens(tokens: OAuthTokens) {
      await ctx.runMutation(internal.silpo.saveTokens, {
        userId,
        tokens: {
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          scope: tokens.scope,
        },
      });
    },
    redirectToAuthorization(url) {
      if (!start) {
        throw new SilpoReauthRequiredError();
      }

      start.onRedirect(url);
    },
    async saveCodeVerifier(verifier) {
      if (!start) {
        throw new SilpoReauthRequiredError();
      }

      await ctx.runMutation(internal.silpo.createAuthState, {
        state: start.state,
        userId,
        codeVerifier: verifier,
      });
    },
    codeVerifier() {
      if (!codeVerifier) {
        throw new Error("Missing code verifier");
      }

      return codeVerifier;
    },
    async invalidateCredentials(scope) {
      if (scope === "all" || scope === "client") {
        await ctx.runMutation(internal.silpo.clearOAuthClient, clientKey);
      }

      if (scope === "all" || scope === "tokens") {
        await ctx.runMutation(internal.silpo.deleteConnection, { userId });
      }
    },
  };
}
