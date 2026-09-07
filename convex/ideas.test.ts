import { expect, test } from "bun:test";
import type { DefaultFunctionArgs, FunctionVisibility, RegisteredMutation } from "convex/server";
import type { SessionId } from "convex-helpers/server/sessions";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { finishRun, restore, saveImage, saveImageError } from "./ideas";

function handler<V extends FunctionVisibility, A extends DefaultFunctionArgs, R>(
  fn: RegisteredMutation<V, A, R>,
): (ctx: MutationCtx, args: A) => R {
  const run: unknown = Reflect.get(fn, "_handler");
  if (typeof run !== "function") throw new Error("Missing registered Convex handler");
  return run as (ctx: MutationCtx, args: A) => R;
}

const userId = "user" as Id<"users">;
const storageId = "image" as Id<"_storage">;
const ideaId = "idea" as Id<"ideas">;

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
  const documents = new Map(rows.map((row) => [row._id, row]));
  const operations = {
    db: {
      get: async (id: string) =>
        id === userId ? { _id: userId } : (documents.get(id as Id<"ideas">) ?? null),
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
  const ctx = new Proxy({} as MutationCtx, {
    get(_target, key) {
      if (!(key in operations)) throw new Error("Unexpected context operation");
      return Reflect.get(operations, key);
    },
  });
  return { ctx, files, documents };
}

test("failed runs publish saved ideas and preserve their files", async () => {
  for (const generated of [true, false]) {
    const { ctx, files, documents } = context([idea({ image: { storageId, generated } })]);
    await handler(finishRun)(ctx, {
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
  await handler(finishRun)(ctx, {
    userId,
    threadId: "thread",
    promptMessageId: "prompt",
  });
  expect(documents.get(ideaId)?.pending).toBe(false);
  expect(files.has(storageId)).toBe(true);
});

test("restoring an older version removes only later generated images", async () => {
  const laterId = "later" as Id<"ideas">;
  const legacyId = "legacy" as Id<"ideas">;
  const laterFile = "later-image" as Id<"_storage">;
  const legacyFile = "legacy-image" as Id<"_storage">;
  const { ctx, files, documents } = context([
    idea(),
    idea({ _id: laterId, _creationTime: 3, image: { storageId: laterFile, generated: true } }),
    idea({ _id: legacyId, _creationTime: 2, image: { storageId: legacyFile, generated: false } }),
  ]);
  expect(await handler(restore)(ctx, { sessionId: "session" as SessionId, ideaId })).toEqual({
    ok: true,
  });
  expect([...documents.keys()]).toEqual([ideaId]);
  expect(files).toEqual(new Set([storageId, legacyFile]));
});

test("an image finishing after its idea was deleted is discarded", async () => {
  const { ctx, files, documents } = context([]);
  files.add(storageId);
  expect(await handler(saveImage)(ctx, { ideaId, image: { storageId, generated: true } })).toBe(
    false,
  );
  expect(files.size).toBe(0);
  expect(documents.size).toBe(0);
});

test("duplicate generation preserves the first image and discards the second", async () => {
  const incoming = "incoming-image" as Id<"_storage">;
  const { ctx, files, documents } = context([idea()]);
  files.add(incoming);
  expect(
    await handler(saveImage)(ctx, { ideaId, image: { storageId: incoming, generated: true } }),
  ).toBe(true);
  expect(documents.get(ideaId)?.image?.storageId).toBe(storageId);
  expect(files).toEqual(new Set([storageId]));
});

test("image errors stay with an existing idea", async () => {
  const { ctx, documents } = context([idea()]);
  await handler(saveImageError)(ctx, {
    ideaId,
    message: "Не вдалося створити фото страви. Спробуй оновити ідею трохи пізніше.",
  });
  expect(documents.get(ideaId)?.imageError).toBe(
    "Не вдалося створити фото страви. Спробуй оновити ідею трохи пізніше.",
  );
});
