import { expect, test } from "bun:test";
import type { DefaultFunctionArgs, FunctionVisibility, RegisteredMutation } from "convex/server";

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { linkConnection } from "./accounts";

function handler<V extends FunctionVisibility, A extends DefaultFunctionArgs, R>(
  fn: RegisteredMutation<V, A, R>,
): (ctx: MutationCtx, args: A) => R {
  const value: unknown = Reflect.get(fn, "_handler");
  if (typeof value !== "function") throw new Error("Missing registered Convex handler");
  return value as (ctx: MutationCtx, args: A) => R;
}

type Row = { _id: string; _creationTime: number; [key: string]: unknown };

function context(seed: Record<string, Row[]>) {
  const tables = new Map(
    Object.entries(seed).map(([table, rows]) => [
      table,
      new Map(rows.map((row) => [row._id, row])),
    ]),
  );
  let next = 0;
  const rows = (table: string) => [...(tables.get(table)?.values() ?? [])];
  const db = {
    get: async (id: string) =>
      rows("users").find((row) => row._id === id) ??
      rows("sessions").find((row) => row._id === id) ??
      rows("ideas").find((row) => row._id === id) ??
      null,
    insert: async (table: string, value: Record<string, unknown>) => {
      const id = `${table}-${++next}`;
      const row = { _id: id, _creationTime: next, ...value };
      if (!tables.has(table)) tables.set(table, new Map());
      tables.get(table)?.set(id, row);
      return id;
    },
    patch: async (id: string, value: Record<string, unknown>) => {
      for (const table of tables.values()) {
        const row = table.get(id);
        if (row) table.set(id, { ...row, ...value });
      }
    },
    delete: async (id: string) => {
      for (const table of tables.values()) table.delete(id);
    },
    query: (table: string) => ({
      withIndex: (
        index: string,
        build: (q: { eq: (_: string, value: unknown) => unknown }) => unknown,
      ) => {
        const values: unknown[] = [];
        build({
          eq: (_field, value) => {
            values.push(value);
            return {};
          },
        });
        const filtered = rows(table).filter((row) => {
          if (index === "by_sessionId") return row.sessionId === values[0];
          if (index === "by_silpoAccountId") return row.silpoAccountId === values[0];
          if (index === "by_user") return row.userId === values[0];
          return true;
        });
        return {
          unique: async () => filtered[0] ?? null,
          take: async () => filtered,
          collect: async () => filtered,
        };
      },
    }),
  };
  const ctx = new Proxy({} as MutationCtx, {
    get: (_target, key) =>
      key === "db"
        ? db
        : key === "runQuery"
          ? async () => ({ page: [], isDone: true })
          : key === "runMutation"
            ? async () => null
            : undefined,
  });
  return { ctx, rows };
}

const tokens = { access_token: "token", token_type: "Bearer" };

test("rejects a stale auth version without linking", async () => {
  const { ctx, rows } = context({
    users: [{ _id: "u", _creationTime: 1 }],
    sessions: [{ _id: "s", _creationTime: 1, sessionId: "session", userId: "u", authVersion: 2 }],
  });
  expect(
    await handler(linkConnection)(ctx, {
      sessionId: "session",
      authVersion: 1,
      sourceUserId: "u" as Id<"users">,
      accountId: "account",
      profile: {},
      tokens,
    }),
  ).toBeNull();
  expect(rows("users")[0]?.silpoAccountId).toBeUndefined();
});

test("does not claim data from a different verified account", async () => {
  const { ctx, rows } = context({
    users: [
      { _id: "source", _creationTime: 1, silpoAccountId: "a" },
      { _id: "target", _creationTime: 2, silpoAccountId: "b" },
    ],
    sessions: [
      { _id: "s", _creationTime: 1, sessionId: "session", userId: "source", authVersion: 1 },
    ],
    ideas: [{ _id: "idea", _creationTime: 1, userId: "source" }],
  });
  expect(
    await handler(linkConnection)(ctx, {
      sessionId: "session",
      authVersion: 1,
      sourceUserId: "source" as Id<"users">,
      accountId: "b",
      profile: {},
      tokens,
    }),
  ).toBe("target" as Id<"users">);
  expect(rows("ideas")[0]?.userId).toBe("source");
});

test("links an anonymous session to its verified account without losing its idea", async () => {
  const { ctx, rows } = context({
    users: [{ _id: "anonymous", _creationTime: 1 }],
    sessions: [
      { _id: "s", _creationTime: 1, sessionId: "session", userId: "anonymous", authVersion: 1 },
    ],
    ideas: [{ _id: "idea", _creationTime: 1, userId: "anonymous" }],
  });
  expect(
    await handler(linkConnection)(ctx, {
      sessionId: "session",
      authVersion: 1,
      sourceUserId: "anonymous" as Id<"users">,
      accountId: "account",
      profile: {},
      tokens,
    }),
  ).toBe("anonymous" as Id<"users">);
  expect(rows("ideas")[0]?.userId).toBe("anonymous");
  expect(rows("users")[0]?.silpoAccountId).toBe("account");
});
