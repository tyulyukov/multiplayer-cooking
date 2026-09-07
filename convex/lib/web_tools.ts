import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { readBounded } from "./http";

import {
  htmlToText,
  isPublicHttpUrl,
  PAGE_MAX_BYTES,
  parseWebResults,
  WEB_TIMEOUT_MS,
} from "./web";

const userAgent = "MultiplayerCooking/1.0 (+https://cooking.tyulyukov.com)";
const maxRedirects = 3;

// Follows redirects by hand so every hop is checked against private hosts before it is fetched.
async function fetchPublic(url: string, accept: string): Promise<Response | null> {
  let target = url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!isPublicHttpUrl(target)) {
      return null;
    }

    const response = await fetch(target, {
      headers: { accept, "user-agent": userAgent },
      redirect: "manual",
      signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
    });
    const location = response.headers.get("location");

    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }

    await response.body?.cancel();
    target = new URL(location, target).toString();
  }

  return null;
}

function searxBaseUrl() {
  return process.env.SEARXNG_URL?.replace(/\/+$/, "") ?? null;
}

async function searx(base: string, query: string, categories?: string) {
  const url = new URL(`${base}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("safesearch", "1");

  if (categories) {
    url.searchParams.set("categories", categories);
  }

  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": userAgent },
    signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`SearXNG responded with ${response.status}`);
  }

  const bytes = await readBounded(response, PAGE_MAX_BYTES);
  if (!bytes) throw new Error("Search response exceeded size limit");
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

function describeError(error: unknown) {
  return error instanceof Error && error.name === "TimeoutError"
    ? "Джерело не відповіло вчасно"
    : "Джерело недоступне";
}

export function createWebTools() {
  const readableUrls = new Set<string>();
  let searches = 0;
  let pages = 0;
  const web_search = createTool({
    description:
      "Шукає в інтернеті: рецепти, техніки, заміни продуктів, сезонність. Повертає до 6 результатів із посиланнями.",
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe("Пошуковий запит українською або англійською"),
    }),
    execute: async (_ctx, { query }) => {
      if (searches >= 3) return { results: [], note: "Ліміт пошуку для цієї відповіді вичерпано" };
      searches += 1;
      const base = searxBaseUrl();

      if (!base) {
        return { results: [], note: "Пошук не налаштований" };
      }

      try {
        const results = parseWebResults(await searx(base, query, "general"));
        for (const result of results) readableUrls.add(result.url);
        return { source: "untrusted_web" as const, results };
      } catch (error) {
        return { results: [], note: describeError(error) };
      }
    },
  });

  const read_page = createTool({
    description:
      "Читає текст публічної веб-сторінки за адресою з результатів пошуку. Повертає до 6000 знаків.",
    inputSchema: z.object({ url: z.string().url() }),
    execute: async (_ctx, { url }) => {
      if (!readableUrls.has(url))
        return { url, text: "", note: "Спочатку знайди цю сторінку через web_search" };
      if (pages >= 3) return { url, text: "", note: "Ліміт читання для цієї відповіді вичерпано" };
      pages += 1;
      try {
        const response = await fetchPublic(url, "text/html,text/plain;q=0.9");

        if (!response) {
          return { url, text: "", note: "Ця адреса недоступна" };
        }

        const type = response.headers.get("content-type") ?? "";

        if (!response.ok) {
          await response.body?.cancel();
          return { url, text: "", note: "Сторінка не відкрилась" };
        }

        if (!type.includes("text/html") && !type.includes("text/plain")) {
          await response.body?.cancel();
          return { url, text: "", note: "Це не текстова сторінка" };
        }

        const bytes = await readBounded(response, PAGE_MAX_BYTES);

        if (!bytes) {
          return { url, text: "", note: "Сторінка надто велика" };
        }

        return {
          source: "untrusted_web" as const,
          url: response.url || url,
          text: htmlToText(bytes.toString("utf8")),
        };
      } catch (error) {
        return { url, text: "", note: describeError(error) };
      }
    },
  });

  return { web_search, read_page };
}
