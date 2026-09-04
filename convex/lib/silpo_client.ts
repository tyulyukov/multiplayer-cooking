import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
): Promise<T> {
  const provider = createSilpoAuthProvider(ctx, { userId });
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

// The profile schema is owned by Сільпо; keep only a display name and a phone.
export function shapeProfile(raw: unknown) {
  const source =
    typeof raw === "object" && raw !== null && "profile" in raw ? Reflect.get(raw, "profile") : raw;
  const firstName = readString(source, ["firstName", "first_name"]);
  const lastName = readString(source, ["lastName", "last_name"]);
  const fullName = readString(source, ["fullName", "full_name", "name", "displayName"]);
  const joined = [firstName, lastName].filter(Boolean).join(" ");
  const name = fullName ?? (joined || undefined);
  const phone = readString(source, ["phone", "phoneNumber", "phone_number", "mobile", "msisdn"]);

  return { name, phone };
}
