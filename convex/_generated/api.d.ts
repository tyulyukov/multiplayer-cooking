/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as cookingAgent from "../cookingAgent.js";
import type * as http from "../http.js";
import type * as ideas from "../ideas.js";
import type * as lib_ai_admission from "../lib/ai_admission.js";
import type * as lib_ai_config from "../lib/ai_config.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_silpo_client from "../lib/silpo_client.js";
import type * as lib_silpo_oauth from "../lib/silpo_oauth.js";
import type * as lib_silpo_shapes from "../lib/silpo_shapes.js";
import type * as lib_silpo_tools from "../lib/silpo_tools.js";
import type * as lib_telemetry from "../lib/telemetry.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_web from "../lib/web.js";
import type * as lib_web_tools from "../lib/web_tools.js";
import type * as silpo from "../silpo.js";
import type * as silpoAuth from "../silpoAuth.js";
import type * as silpoCart from "../silpoCart.js";
import type * as status from "../status.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  cookingAgent: typeof cookingAgent;
  http: typeof http;
  ideas: typeof ideas;
  "lib/ai_admission": typeof lib_ai_admission;
  "lib/ai_config": typeof lib_ai_config;
  "lib/errors": typeof lib_errors;
  "lib/silpo_client": typeof lib_silpo_client;
  "lib/silpo_oauth": typeof lib_silpo_oauth;
  "lib/silpo_shapes": typeof lib_silpo_shapes;
  "lib/silpo_tools": typeof lib_silpo_tools;
  "lib/telemetry": typeof lib_telemetry;
  "lib/users": typeof lib_users;
  "lib/web": typeof lib_web;
  "lib/web_tools": typeof lib_web_tools;
  silpo: typeof silpo;
  silpoAuth: typeof silpoAuth;
  silpoCart: typeof silpoCart;
  status: typeof status;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
