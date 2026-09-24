import type {
  DefaultFunctionArgs,
  FunctionVisibility,
  RegisteredAction,
  RegisteredMutation,
} from "convex/server";
import type { SessionId } from "convex-helpers/server/sessions";

import type { Id, TableNames } from "../convex/_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../convex/_generated/server";

export function testId<TableName extends TableNames | "_storage">(value: string): Id<TableName> {
  // SAFETY: fixture ids stand in for Convex document ids; tests only compare them for equality.
  return value as Id<TableName>;
}

export function testSessionId(value: string): SessionId {
  // SAFETY: session ids are opaque strings that the session helpers only compare.
  return value as SessionId;
}

type RegisteredFunction = Readonly<{ isConvexFunction: true }>;

type WithHandler<Ctx, A, R> = Readonly<{ _handler: (ctx: Ctx, args: A) => R }>;

// Convex keeps a registered function's handler under the undocumented `_handler` key.
function hasHandler<Fn extends RegisteredFunction, Ctx, A, R>(
  fn: Fn,
): fn is Fn & WithHandler<Ctx, A, R> {
  return "_handler" in fn && typeof fn._handler === "function";
}

function registeredHandler<Fn extends RegisteredFunction, Ctx, A, R>(fn: Fn) {
  if (!hasHandler<Fn, Ctx, A, R>(fn)) {
    throw new Error("Missing registered Convex handler");
  }

  return fn._handler;
}

export function mutationHandler<V extends FunctionVisibility, A extends DefaultFunctionArgs, R>(
  fn: RegisteredMutation<V, A, R>,
) {
  return registeredHandler<RegisteredMutation<V, A, R>, MutationCtx, A, R>(fn);
}

export function actionHandler<V extends FunctionVisibility, A extends DefaultFunctionArgs, R>(
  fn: RegisteredAction<V, A, R>,
) {
  return registeredHandler<RegisteredAction<V, A, R>, ActionCtx, A, R>(fn);
}

// convex-test turns fetch and the timer globals into accessors that neither assignment nor
// spyOn can replace, so tests swap the property itself and restore it afterwards.
export function replaceGlobal<Key extends "fetch" | "setTimeout">(
  key: Key,
  value: (typeof globalThis)[Key],
) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);

  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

  return () => {
    if (previous) Object.defineProperty(globalThis, key, previous);
  };
}
