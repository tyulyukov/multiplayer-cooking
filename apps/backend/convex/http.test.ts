import { afterEach, expect, test } from "bun:test";
import { convexTest } from "convex-test";

import schema from "./schema";

const appUrl = process.env.APP_URL;

afterEach(() => {
  if (appUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = appUrl;
  }
});

const callback = (query: string) => {
  const t = convexTest(schema, {
    "./_generated/server.ts": () => import("./_generated/server"),
    "./http.ts": () => import("./http"),
  });

  return t.fetch(`/silpo/callback?${query}`, { redirect: "manual" });
};

test("returns web Сільпо callbacks to APP_URL", async () => {
  process.env.APP_URL = "https://cooking.example/";
  const response = await callback("code=c1&state=web-state");

  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe(
    "https://cooking.example/?silpo=callback&code=c1&state=web-state",
  );
});

test("returns app Сільпо callbacks to the fixed app scheme", async () => {
  process.env.APP_URL = "https://cooking.example/";
  const response = await callback("code=c1&state=app.abc");

  expect(response.headers.get("Location")).toBe(
    "multiplayer-cooking://silpo?silpo=callback&code=c1&state=app.abc",
  );
});

test("returns failed app logins to the app with an error", async () => {
  process.env.APP_URL = "https://cooking.example/";
  const response = await callback("error=access_denied&state=app.abc");

  expect(response.headers.get("Location")).toBe("multiplayer-cooking://silpo?silpo=error");
});

test("keeps failed web logins on APP_URL", async () => {
  process.env.APP_URL = "https://cooking.example/";
  const response = await callback("error=access_denied");

  expect(response.headers.get("Location")).toBe("https://cooking.example/?silpo=error");
});
