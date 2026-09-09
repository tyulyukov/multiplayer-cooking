import { describe, expect, test } from "bun:test";
import { decodeDishImage, dishImageModel, dishImagePrompt, generateDishImage } from "./dish_image";

const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aBz8AAAAASUVORK5CYII=";

describe("generated dish images", () => {
  test.each(["openai/gpt-image-2.5-flare", "openai/gpt-image-2.5-sunburst"])(
    "uses the configured model %s and decodes the documented image response",
    async (model) => {
      const originalFetch = globalThis.fetch;
      const originalKey = process.env.OPENROUTER_API_KEY;
      const originalModel = process.env.OPENROUTER_IMAGE_MODEL;
      let request: Request | undefined;
      process.env.OPENROUTER_API_KEY = "test-key";
      process.env.OPENROUTER_IMAGE_MODEL = model;
      const mockedFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
        request = new Request(input, init);
        return new Response(JSON.stringify({ data: [{ b64_json: png }], usage: { cost: 0.04 } }));
      };
      Object.defineProperty(globalThis, "fetch", { configurable: true, value: mockedFetch });
      try {
        const result = await generateDishImage({
          title: "Курка",
          summary: "Вечеря",
          body: "Ніжна",
          ingredients: [{ name: "курка" }],
        });
        expect(request?.url).toBe("https://openrouter.ai/api/v1/images");
        expect(request?.method).toBe("POST");
        expect(request?.headers.get("authorization")).toBe("Bearer test-key");
        const body = await request?.json();
        expect(body).toMatchObject({
          model,
          n: 1,
          quality: "medium",
          aspect_ratio: "3:2",
          provider: { order: ["openai"], allow_fallbacks: false },
        });
        expect(body).not.toHaveProperty("resolution");
        expect(result.cost).toBe(0.04);
        expect(result.model).toBe(model);
        expect(result.blob.type).toBe("image/png");
      } finally {
        Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
        if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
        else process.env.OPENROUTER_API_KEY = originalKey;
        if (originalModel === undefined) delete process.env.OPENROUTER_IMAGE_MODEL;
        else process.env.OPENROUTER_IMAGE_MODEL = originalModel;
      }
    },
  );

  test("requires an explicit image model configuration", () => {
    const originalModel = process.env.OPENROUTER_IMAGE_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;
    try {
      expect(dishImageModel).toThrow("Image model is not configured");
    } finally {
      if (originalModel === undefined) delete process.env.OPENROUTER_IMAGE_MODEL;
      else process.env.OPENROUTER_IMAGE_MODEL = originalModel;
    }
  });
  test("uses the final ingredients in the fixed art direction", () => {
    const prompt = dishImagePrompt({
      title: "Курка з рисом",
      summary: "Легка вечеря",
      body: "Ніжна курка з рисом",
      ingredients: [{ name: "курка", amount: "200 г" }, { name: "рис" }],
    });
    expect(prompt).toContain('"name":"курка"');
    expect(prompt).toContain("No extra visible ingredients");
    expect(prompt).toContain("Warm cream tabletop");
    expect(prompt).not.toContain("shrimp");
  });

  test("decodes inline image bytes without fetching a provider URL", async () => {
    const blob = decodeDishImage({ data: [{ b64_json: png, media_type: "image/png" }] });
    expect(blob.type).toBe("image/png");
    expect(Buffer.from(await blob.arrayBuffer()).toString("base64")).toBe(png);
  });

  test("rejects missing, oversized, malformed, executable and mislabeled output", () => {
    for (const payload of [
      {},
      { data: [{ url: "https://example.com/image.png" }] },
      { data: [{ b64_json: "!notbase64!" }] },
      {
        data: [
          {
            b64_json: Buffer.from("<svg><script/></svg>").toString("base64"),
            media_type: "image/png",
          },
        ],
      },
      { data: [{ b64_json: png, media_type: "image/jpeg" }] },
      { data: [{ b64_json: "A".repeat(12 * 1024 * 1024) }] },
    ])
      expect(() => decodeDishImage(payload)).toThrow();
  });
});
