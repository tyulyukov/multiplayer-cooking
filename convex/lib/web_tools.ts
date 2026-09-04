import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import type { Id } from "../_generated/dataModel";
import {
  htmlToText,
  IMAGE_MAX_BYTES,
  isPublicHttpUrl,
  parseWebResults,
  rankImageCandidates,
  WEB_TIMEOUT_MS,
} from "./web";

export type IdeaImage = Readonly<{ storageId: Id<"_storage">; credit: string; sourceUrl: string }>;

// Images found during one run, keyed by the short id handed to the model.
export type ImageRegistry = Map<string, IdeaImage>;

const userAgent = "MultiplayerCooking/1.0 (+https://cooking.tyulyukov.com)";
const imageBangs = "!us !opv !wci !pe";

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

  return response.json();
}

async function downloadImage(imageUrl: string) {
  const response = await fetch(imageUrl, {
    headers: { accept: "image/*", "user-agent": userAgent },
    signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
  });
  const type = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  const declaredSize = Number(response.headers.get("content-length"));

  if (!response.ok || !type.startsWith("image/") || type === "image/svg+xml") {
    return null;
  }

  if (declaredSize > IMAGE_MAX_BYTES || !isPublicHttpUrl(response.url)) {
    return null;
  }

  const bytes = await response.arrayBuffer();

  return bytes.byteLength > IMAGE_MAX_BYTES ? null : new Blob([bytes], { type });
}

function describeError(error: unknown) {
  return error instanceof Error && error.name === "TimeoutError"
    ? "Джерело не відповіло вчасно"
    : "Джерело недоступне";
}

export function createWebTools(images: ImageRegistry) {
  const web_search = createTool({
    description:
      "Шукає в інтернеті: рецепти, техніки, заміни продуктів, сезонність. Повертає до 6 результатів із посиланнями.",
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe("Пошуковий запит українською або англійською"),
    }),
    execute: async (_ctx, { query }) => {
      const base = searxBaseUrl();

      if (!base) {
        return { results: [], note: "Пошук не налаштований" };
      }

      try {
        return { results: parseWebResults(await searx(base, query, "general")) };
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
      if (!isPublicHttpUrl(url)) {
        return { url, text: "", note: "Ця адреса недоступна" };
      }

      try {
        const response = await fetch(url, {
          headers: { accept: "text/html,text/plain;q=0.9", "user-agent": userAgent },
          signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
        });
        const type = response.headers.get("content-type") ?? "";

        if (!response.ok || !isPublicHttpUrl(response.url)) {
          return { url, text: "", note: "Сторінка не відкрилась" };
        }

        if (!type.includes("text/html") && !type.includes("text/plain")) {
          return { url, text: "", note: "Це не текстова сторінка" };
        }

        return { url: response.url, text: htmlToText(await response.text()) };
      } catch (error) {
        return { url, text: "", note: describeError(error) };
      }
    },
  });

  const find_dish_image = createTool({
    description:
      "Знаходить фото страви з вільною ліцензією і зберігає його для картки. Повертає imageId, який треба передати в save_idea.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .max(80)
        .describe("Назва страви англійською, 2–5 слів, наприклад 'cheese omelette'"),
    }),
    execute: async (ctx, { query }) => {
      const base = searxBaseUrl();

      if (!base) {
        return { imageId: null, note: "Пошук фото не налаштований" };
      }

      let candidates;

      try {
        candidates = rankImageCandidates(await searx(base, `${imageBangs} ${query}`, "images"));
      } catch (error) {
        return { imageId: null, note: describeError(error) };
      }

      for (const candidate of candidates.slice(0, 4)) {
        let blob: Blob | null = null;

        try {
          blob = await downloadImage(candidate.imageUrl);
        } catch {
          blob = null;
        }

        if (!blob) {
          continue;
        }

        const storageId = await ctx.storage.store(blob);
        const imageId = `img_${images.size + 1}`;

        images.set(imageId, { storageId, credit: candidate.credit, sourceUrl: candidate.pageUrl });

        return { imageId, title: candidate.title, credit: candidate.credit };
      }

      return { imageId: null, note: "Фото не знайдено" };
    },
  });

  return { web_search, read_page, find_dish_image };
}
