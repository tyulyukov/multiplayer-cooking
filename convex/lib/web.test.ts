import { describe, expect, test } from "bun:test";

import {
  htmlToText,
  isPublicHttpUrl,
  parseWebResults,
  rankImageCandidates,
  READ_PAGE_MAX_CHARACTERS,
} from "./web";

describe("isPublicHttpUrl", () => {
  test("accepts public http and https hosts", () => {
    expect(isPublicHttpUrl("https://silpo.ua/recipes")).toBe(true);
    expect(isPublicHttpUrl("http://8.8.8.8/x")).toBe(true);
  });

  test("rejects local, private, and non-http targets", () => {
    for (const value of [
      "http://localhost:8080/",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://172.20.0.1/",
      "http://192.168.1.10/",
      "http://169.254.169.254/latest",
      "http://searxng.railway.internal/",
      "http://[::1]/",
      "ftp://example.com/",
      "not a url",
    ]) {
      expect(isPublicHttpUrl(value)).toBe(false);
    }
  });
});

describe("parseWebResults", () => {
  test("keeps unique public results with trimmed snippets", () => {
    const payload = {
      results: [
        { url: "https://a.example/1", title: " Борщ ", content: "x".repeat(400) },
        { url: "https://a.example/1", title: "Дубль" },
        { url: "http://localhost/secret", title: "Local" },
        { url: "https://b.example/2", title: "", content: "без назви" },
        { url: "https://c.example/3", title: "Суп", content: "короткий" },
      ],
    };

    const results = parseWebResults(payload);

    expect(results).toEqual([
      { title: "Борщ", url: "https://a.example/1", snippet: "x".repeat(300) },
      { title: "Суп", url: "https://c.example/3", snippet: "короткий" },
    ]);
  });

  test("returns nothing for malformed payloads", () => {
    expect(parseWebResults(null)).toEqual([]);
    expect(parseWebResults({ results: "nope" })).toEqual([]);
    expect(parseWebResults("text")).toEqual([]);
  });

  test("honours the result limit", () => {
    const payload = {
      results: Array.from({ length: 10 }, (_, index) => ({
        url: `https://x.example/${index}`,
        title: `Result ${index}`,
      })),
    };

    expect(parseWebResults(payload, 2)).toHaveLength(2);
  });
});

describe("rankImageCandidates", () => {
  test("orders free-licence engines first and builds a credit line", () => {
    const payload = {
      results: [
        {
          engine: "pexels",
          img_src: "https://img.pexels.example/p.jpg",
          url: "https://pexels.example/p",
          title: "Pasta",
        },
        {
          engine: "bing images",
          img_src: "https://bing.example/b.jpg",
          url: "https://bing.example/b",
          title: "Bing",
        },
        {
          engine: "unsplash",
          img_src: "https://img.unsplash.example/u.jpg",
          url: "https://unsplash.example/u",
          title: "Pasta on a plate",
          author: "Ann Cook",
        },
        {
          engine: "openverse",
          img_src: "http://10.0.0.5/private.jpg",
          url: "https://openverse.example/o",
          title: "Private",
        },
        {
          engine: "unsplash",
          img_src: "https://plus.unsplash.com/premium_photo-1?w=1080",
          url: "https://unsplash.example/premium",
          title: "Paid",
        },
      ],
    };

    expect(rankImageCandidates(payload)).toEqual([
      {
        imageUrl: "https://img.unsplash.example/u.jpg",
        pageUrl: "https://unsplash.example/u",
        title: "Pasta on a plate",
        credit: "Фото: Ann Cook, Unsplash",
      },
      {
        imageUrl: "https://img.pexels.example/p.jpg",
        pageUrl: "https://pexels.example/p",
        title: "Pasta",
        credit: "Фото: Pexels",
      },
    ]);
  });
});

describe("htmlToText", () => {
  test("drops scripts, styles, and tags while keeping line breaks", () => {
    const html = `<html><head><title>T</title><style>p{}</style></head>
      <body><script>alert(1)</script><h1>Борщ &amp; сало</h1>
      <p>Крок&nbsp;1<br>Крок 2</p><ul><li>сіль</li><li>перець</li></ul></body></html>`;

    expect(htmlToText(html)).toBe("Борщ & сало\nКрок 1\nКрок 2\nсіль\nперець");
  });

  test("decodes numeric entities", () => {
    expect(htmlToText("<p>&#1041;&#x456;&#x433;&#x443;&#x441;</p>")).toBe("Бігус");
  });

  test("caps the output length", () => {
    const text = htmlToText(`<p>${"a".repeat(READ_PAGE_MAX_CHARACTERS + 100)}</p>`);

    expect(text).toHaveLength(READ_PAGE_MAX_CHARACTERS + 1);
    expect(text.endsWith("…")).toBe(true);
  });
});
