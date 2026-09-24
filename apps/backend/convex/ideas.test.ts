import { expect, test } from "bun:test";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { finishRun, restore, saveImage, saveImageError } from "./ideas";
import { mutationHandler, testId, testSessionId } from "../tests/convex-doubles";

const userId = testId<"users">("user");

const storageId = testId<"_storage">("image");

const ideaId = testId<"ideas">("idea");

function idea(overrides: Partial<Doc<"ideas">> = {}): Doc<"ideas"> {
  return {
    _id: ideaId,
    _creationTime: 1,
    userId,
    threadId: "thread",
    promptMessageId: "prompt",
    title: "Курка",
    summary: "Легка вечеря",
    body: "Курка з овочами.",
    ingredients: [{ name: "Курка" }],
    timeMinutes: 20,
    servings: 2,
    pending: true,
    image: { storageId, generated: true },
    ...overrides,
  };
}

function context(rows: Doc<"ideas">[]) {
  const files = new Set(rows.flatMap((row) => (row.image ? [row.image.storageId] : [])));
  const documents = new Map<string, Doc<"ideas">>(rows.map((row) => [row._id, row]));

  const operations = {
    db: {
      get: async (id: string) => (id === userId ? { _id: userId } : (documents.get(id) ?? null)),
      query: (table: string) => ({
        withIndex: () => ({
          unique: async () => (table === "sessions" ? { userId } : null),
          collect: async () => [...documents.values()],
          order: () => ({ take: async () => [...documents.values()] }),
        }),
      }),
      delete: async (id: Id<"ideas">) => {
        documents.delete(id);
      },
      patch: async (id: Id<"ideas">, patch: Partial<Doc<"ideas">>) => {
        const row = documents.get(id);

        if (!row) throw new Error("Missing idea");
        documents.set(id, { ...row, ...patch });
      },
    },
    storage: {
      delete: async (id: Id<"_storage">) => {
        files.delete(id);
      },
    },
    runQuery: async () => [{ order: 0 }],
    runMutation: async () => ({ isDone: true }),
  };

  const operationsByKey = new Map<string | symbol, (typeof operations)[keyof typeof operations]>(
    Object.entries(operations),
  );

  // SAFETY: the proxy throws on any context member the handlers under test do not use.
  const ctx = new Proxy({} as MutationCtx, {
    get(_target, key) {
      const operation = operationsByKey.get(key);

      if (!operation) throw new Error("Unexpected context operation");

      return operation;
    },
  });

  return { ctx, files, documents };
}

test("failed runs publish saved ideas and preserve their files", async () => {
  for (const generated of [true, false]) {
    const { ctx, files, documents } = context([idea({ image: { storageId, generated } })]);
    await mutationHandler(finishRun)(ctx, {
      userId,
      threadId: "thread",
      promptMessageId: "prompt",
    });
    expect(documents.get(ideaId)?.pending).toBe(false);
    expect(files.has(storageId)).toBe(true);
  }
});

test("successful runs publish the idea and preserve its image", async () => {
  const { ctx, files, documents } = context([idea()]);
  await mutationHandler(finishRun)(ctx, {
    userId,
    threadId: "thread",
    promptMessageId: "prompt",
  });
  expect(documents.get(ideaId)?.pending).toBe(false);
  expect(files.has(storageId)).toBe(true);
});

test("restoring an older version removes only later generated images", async () => {
  const laterId = testId<"ideas">("later");
  const legacyId = testId<"ideas">("legacy");
  const laterFile = testId<"_storage">("later-image");
  const legacyFile = testId<"_storage">("legacy-image");

  const { ctx, files, documents } = context([
    idea(),
    idea({ _id: laterId, _creationTime: 3, image: { storageId: laterFile, generated: true } }),
    idea({ _id: legacyId, _creationTime: 2, image: { storageId: legacyFile, generated: false } }),
  ]);

  expect(
    await mutationHandler(restore)(ctx, { sessionId: testSessionId("session"), ideaId }),
  ).toEqual({
    ok: true,
  });
  expect([...documents.keys()]).toEqual([ideaId]);
  expect(files).toEqual(new Set([storageId, legacyFile]));
});

test("an image finishing after its idea was deleted is discarded", async () => {
  const { ctx, files, documents } = context([]);
  files.add(storageId);
  expect(
    await mutationHandler(saveImage)(ctx, { ideaId, image: { storageId, generated: true } }),
  ).toBe(false);
  expect(files.size).toBe(0);
  expect(documents.size).toBe(0);
});

test("duplicate generation preserves the first image and discards the second", async () => {
  const incoming = testId<"_storage">("incoming-image");
  const { ctx, files, documents } = context([idea()]);
  files.add(incoming);
  expect(
    await mutationHandler(saveImage)(ctx, {
      ideaId,
      image: { storageId: incoming, generated: true },
    }),
  ).toBe(true);
  expect(documents.get(ideaId)?.image?.storageId).toBe(storageId);
  expect(files).toEqual(new Set([storageId]));
});

test("image errors stay with an existing idea", async () => {
  const { ctx, documents } = context([idea()]);
  await mutationHandler(saveImageError)(ctx, {
    ideaId,
    message: "Не вдалося створити фото страви. Спробуй оновити ідею трохи пізніше.",
  });
  expect(documents.get(ideaId)?.imageError).toBe(
    "Не вдалося створити фото страви. Спробуй оновити ідею трохи пізніше.",
  );
});
