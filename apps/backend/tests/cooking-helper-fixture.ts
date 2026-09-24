import { Glob } from "bun";
import type { GenericDatabaseWriter, SystemDataModel } from "convex/server";
import agentSchema from "../node_modules/@convex-dev/agent/src/component/schema";
import rateLimiterSchema from "../node_modules/@convex-dev/rate-limiter/dist/component/schema.js";
import { cookingFixture } from "./cooking-fixture";

export async function cookingHelperFixture() {
  const fixture = await cookingFixture();

  const agentRoot = new URL("../node_modules/@convex-dev/agent/src/component/", import.meta.url)
    .pathname;

  const modules = Array.from(new Glob("**/*.ts").scanSync(agentRoot)).filter(
    (path) => !path.endsWith(".test.ts"),
  );

  fixture.t.registerComponent(
    "agent",
    agentSchema,
    Object.fromEntries(
      modules.map((path) => [`./component/${path}`, () => import(`${agentRoot}${path}`)]),
    ),
  );
  fixture.t.registerComponent("rateLimiter", rateLimiterSchema, {
    "./component/_generated/server.ts": () =>
      import("../node_modules/@convex-dev/rate-limiter/dist/component/_generated/server.js"),
    "./component/lib.ts": () =>
      import("../node_modules/@convex-dev/rate-limiter/dist/component/lib.js"),
  });

  return fixture;
}

export async function storeHelperImage(fixture: Awaited<ReturnType<typeof cookingFixture>>) {
  return fixture.t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["test image"], { type: "image/png" }));
    // SAFETY: convex-test 0.0.59 omits Blob.type from stored metadata, and its db writer patches
    // system tables such as _storage even though the Convex types only allow app tables.
    const storageDb = ctx.db as Pick<GenericDatabaseWriter<SystemDataModel>, "patch">;
    await storageDb.patch(storageId, { contentType: "image/png" });

    return storageId;
  });
}

export async function withoutScheduledHelper<T>(run: () => Promise<T>): Promise<T> {
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = Object.assign((...args: Parameters<typeof setTimeout>) => {
    const timer = originalTimeout(...args);
    clearTimeout(timer);

    return timer;
  }, originalTimeout);

  try {
    return await run();
  } finally {
    globalThis.setTimeout = originalTimeout;
  }
}
