export const WEB_TIMEOUT_MS = 8_000;
export const WEB_SEARCH_MAX_RESULTS = 6;
export const READ_PAGE_MAX_CHARACTERS = 6_000;
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const PAGE_MAX_BYTES = 1024 * 1024;

// Free-licence sources first; the order is the ranking.
export const IMAGE_ENGINES = ["unsplash", "openverse", "wikicommons.images", "pexels"] as const;

const imageSourceLabels: Record<(typeof IMAGE_ENGINES)[number], string> = {
  unsplash: "Unsplash",
  openverse: "Openverse",
  "wikicommons.images": "Wikimedia Commons",
  pexels: "Pexels",
};

export type WebResult = Readonly<{ title: string; url: string; snippet: string }>;

export type ImageCandidate = Readonly<{
  imageUrl: string;
  pageUrl: string;
  title: string;
  credit: string;
}>;

type SearxResult = Readonly<{
  url?: unknown;
  title?: unknown;
  content?: unknown;
  img_src?: unknown;
  engine?: unknown;
  author?: unknown;
}>;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readResults(payload: unknown): SearxResult[] {
  if (typeof payload !== "object" || payload === null || !("results" in payload)) {
    return [];
  }

  const results: unknown = Reflect.get(payload, "results");

  return Array.isArray(results) ? (results as SearxResult[]) : [];
}

const privateHostPattern =
  /^(localhost|.*\.(local|internal|localdomain)|\d+\.\d+\.\d+\.\d+|\[.*\])$/i;

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);

  if (parts.length !== 4) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// Numeric hosts are normalised by the URL parser before this check. A public name that
// resolves to a private address (DNS rebinding) is not caught here; that risk is accepted.
export function isPublicHttpUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const host = url.hostname;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return !isPrivateIpv4(host);
  }

  return !privateHostPattern.test(host);
}

export function parseWebResults(payload: unknown, limit = WEB_SEARCH_MAX_RESULTS): WebResult[] {
  const seen = new Set<string>();
  const results: WebResult[] = [];

  for (const item of readResults(payload)) {
    const url = readString(item.url);
    const title = readString(item.title);

    if (!title || !isPublicHttpUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    results.push({ title, url, snippet: readString(item.content).slice(0, 300) });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function engineRank(engine: string) {
  const index = IMAGE_ENGINES.indexOf(engine as (typeof IMAGE_ENGINES)[number]);

  return index === -1 ? IMAGE_ENGINES.length : index;
}

export function rankImageCandidates(payload: unknown): ImageCandidate[] {
  const candidates: Array<ImageCandidate & { rank: number }> = [];

  for (const item of readResults(payload)) {
    const imageUrl = readString(item.img_src);
    const pageUrl = readString(item.url);
    const engine = readString(item.engine);
    const rank = engineRank(engine);

    if (rank === IMAGE_ENGINES.length || !isPublicHttpUrl(imageUrl) || !isPublicHttpUrl(pageUrl)) {
      continue;
    }

    // Unsplash+ photos are paid; the free API still lists them.
    if (new URL(imageUrl).hostname === "plus.unsplash.com") {
      continue;
    }

    const source = imageSourceLabels[engine as (typeof IMAGE_ENGINES)[number]];
    const author = readString(item.author);
    const title = readString(item.title) || "Фото страви";

    candidates.push({
      imageUrl,
      pageUrl,
      title,
      credit: author ? `Фото: ${author}, ${source}` : `Фото: ${source}`,
      rank,
    });
  }

  return candidates
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...candidate }) => candidate);
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }

    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }

    return entities[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string, limit = READ_PAGE_MAX_CHARACTERS) {
  const withoutBlocks = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ");
  const withBreaks = withoutBlocks.replace(
    /<\/?(p|div|br|li|h[1-6]|tr|section|article|blockquote|ul|ol)\b[^>]*>/gi,
    "\n",
  );
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
