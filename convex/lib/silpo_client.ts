import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  createSilpoAuthProvider,
  SILPO_MCP_URL,
  SILPO_REAUTH_MESSAGE,
  SilpoReauthRequiredError,
} from "./silpo_oauth";

export const SILPO_CALL_TIMEOUT_MS = 30_000;

export type SilpoClient = Readonly<{
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  listTools: () => Promise<unknown>;
}>;

export type SilpoClientAuthOptions = Readonly<{
  provider?: OAuthClientProvider;
  stagedTokens?: OAuthTokens;
  saveStagedTokens?: (tokens: OAuthTokens) => Promise<void>;
}>;

function parseToolResult(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  if (result.structuredContent !== undefined) {
    return result.structuredContent;
  }

  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// One MCP session per call site; tokens refresh through the auth provider on 401.
export async function withSilpoClient<T>(
  ctx: ActionCtx,
  userId: Id<"users">,
  run: (client: SilpoClient) => Promise<T>,
  authOptions: SilpoClientAuthOptions = {},
): Promise<T> {
  const provider = authOptions.provider ?? createSilpoAuthProvider(ctx, { userId, ...authOptions });
  const transport = new StreamableHTTPClientTransport(new URL(SILPO_MCP_URL), {
    authProvider: provider,
  });
  const client = new Client({ name: "multiplayer-cooking", version: "1.0.0" });

  await client.connect(transport);

  try {
    return await run({
      callTool: async (name, args) => {
        const result = await client.callTool({ name, arguments: args }, undefined, {
          timeout: SILPO_CALL_TIMEOUT_MS,
        });

        if (result.isError) {
          const detail = parseToolResult(result);

          throw new Error(
            `Сільпо: ${name} повернув помилку: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
          );
        }

        return parseToolResult(result);
      },
      listTools: async () => {
        const { tools } = await client.listTools();

        return tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
      },
    });
  } finally {
    await client.close().catch(() => undefined);
  }
}

export function isReauthRequired(error: unknown) {
  return (
    error instanceof SilpoReauthRequiredError ||
    (error instanceof Error && error.name === "UnauthorizedError")
  );
}

// User-facing text for a failed Сільпо call; internal messages never reach the UI.
export function describeSilpoError(error: unknown) {
  if (isReauthRequired(error)) {
    return SILPO_REAUTH_MESSAGE;
  }

  if (error instanceof Error && error.message.startsWith("Сільпо")) {
    return error.message;
  }

  if (error instanceof Error && /^[А-ЯІЇЄҐ]/.test(error.message)) {
    return error.message;
  }

  return "Сільпо не відповіло. Спробуй ще раз трохи пізніше.";
}

function readString(source: unknown, keys: readonly string[]) {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }

  for (const key of keys) {
    const value: unknown = Reflect.get(source, key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type VerifiedSilpoProfile = Readonly<{
  accountSubject: string;
  profile: { name?: string; phone?: string; email?: string };
}>;

// Identity only comes from the verified profile response, never from a phone number or token claim.
export function parseVerifiedSilpoProfile(raw: unknown): VerifiedSilpoProfile | null {
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.profile)) {
    return null;
  }

  const rawAccountSubject = raw.profile.id;
  const accountSubject =
    typeof rawAccountSubject === "string" && rawAccountSubject.trim()
      ? rawAccountSubject.trim()
      : undefined;

  if (!accountSubject) {
    return null;
  }

  return { accountSubject, profile: shapeProfile(raw) };
}

// The profile schema is owned by Сільпо; retain only fields useful in the account UI.
export function shapeProfile(raw: unknown) {
  const source =
    typeof raw === "object" && raw !== null && "profile" in raw ? Reflect.get(raw, "profile") : raw;
  const firstName = readString(source, ["firstName", "first_name"]);
  const lastName = readString(source, ["lastName", "last_name"]);
  const fullName = readString(source, ["fullName", "full_name", "name", "displayName"]);
  const joined = [firstName, lastName].filter(Boolean).join(" ");
  const name = fullName ?? (joined || undefined);
  const phone = readString(source, ["phone", "phoneNumber", "phone_number", "mobile", "msisdn"]);
  const email = readString(source, ["email"]);

  return { name, phone: phone ? formatPhone(phone) : undefined, email };
}

// 380505080405 → +380 50 508 04 05; other lengths are shown as given.
export function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (digits.length !== 12 || !digits.startsWith("380")) {
    return raw;
  }

  return `+380 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}
