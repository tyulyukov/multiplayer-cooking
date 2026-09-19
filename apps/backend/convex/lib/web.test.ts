import { describe, expect, test } from "bun:test";

import { htmlToText, isPublicHttpUrl, parseWebResults, READ_PAGE_MAX_CHARACTERS } from "./web";

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
