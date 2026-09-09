/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as chat from "../chat.js";
import type * as cookingAgent from "../cookingAgent.js";
import type * as cookingAssistance from "../cookingAssistance.js";
import type * as cookingGeneration from "../cookingGeneration.js";
import type * as cookingRooms from "../cookingRooms.js";
import type * as cookingSchema from "../cookingSchema.js";
import type * as cookingSteps from "../cookingSteps.js";
import type * as cookingTimers from "../cookingTimers.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as ideaImages from "../ideaImages.js";
import type * as ideas from "../ideas.js";
import type * as lib_ai_admission from "../lib/ai_admission.js";
import type * as lib_ai_config from "../lib/ai_config.js";
import type * as lib_cooking_access from "../lib/cooking_access.js";
import type * as lib_cooking_instructions from "../lib/cooking_instructions.js";
import type * as lib_cooking_plan from "../lib/cooking_plan.js";
import type * as lib_cooking_readiness from "../lib/cooking_readiness.js";
import type * as lib_cooking_reference from "../lib/cooking_reference.js";
import type * as lib_cooking_step_access from "../lib/cooking_step_access.js";
import type * as lib_cooking_validators from "../lib/cooking_validators.js";
import type * as lib_dish_image from "../lib/dish_image.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_http from "../lib/http.js";
import type * as lib_idea_products from "../lib/idea_products.js";
import type * as lib_ingredient from "../lib/ingredient.js";
import type * as lib_questions from "../lib/questions.js";
import type * as lib_silpo_client from "../lib/silpo_client.js";
import type * as lib_silpo_oauth from "../lib/silpo_oauth.js";
import type * as lib_silpo_products from "../lib/silpo_products.js";
import type * as lib_silpo_shapes from "../lib/silpo_shapes.js";
import type * as lib_silpo_tools from "../lib/silpo_tools.js";
import type * as lib_telemetry from "../lib/telemetry.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_web from "../lib/web.js";
import type * as lib_web_tools from "../lib/web_tools.js";
import type * as personalization from "../personalization.js";
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
  accounts: typeof accounts;
  chat: typeof chat;
  cookingAgent: typeof cookingAgent;
  cookingAssistance: typeof cookingAssistance;
  cookingGeneration: typeof cookingGeneration;
  cookingRooms: typeof cookingRooms;
  cookingSchema: typeof cookingSchema;
  cookingSteps: typeof cookingSteps;
  cookingTimers: typeof cookingTimers;
  files: typeof files;
  http: typeof http;
  ideaImages: typeof ideaImages;
  ideas: typeof ideas;
  "lib/ai_admission": typeof lib_ai_admission;
  "lib/ai_config": typeof lib_ai_config;
  "lib/cooking_access": typeof lib_cooking_access;
  "lib/cooking_instructions": typeof lib_cooking_instructions;
  "lib/cooking_plan": typeof lib_cooking_plan;
  "lib/cooking_readiness": typeof lib_cooking_readiness;
  "lib/cooking_reference": typeof lib_cooking_reference;
  "lib/cooking_step_access": typeof lib_cooking_step_access;
  "lib/cooking_validators": typeof lib_cooking_validators;
  "lib/dish_image": typeof lib_dish_image;
  "lib/errors": typeof lib_errors;
  "lib/http": typeof lib_http;
  "lib/idea_products": typeof lib_idea_products;
  "lib/ingredient": typeof lib_ingredient;
  "lib/questions": typeof lib_questions;
  "lib/silpo_client": typeof lib_silpo_client;
  "lib/silpo_oauth": typeof lib_silpo_oauth;
  "lib/silpo_products": typeof lib_silpo_products;
  "lib/silpo_shapes": typeof lib_silpo_shapes;
  "lib/silpo_tools": typeof lib_silpo_tools;
  "lib/telemetry": typeof lib_telemetry;
  "lib/users": typeof lib_users;
  "lib/web": typeof lib_web;
  "lib/web_tools": typeof lib_web_tools;
  personalization: typeof personalization;
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
