import type { Validator } from "convex/values";
import type { CookingPlan, CookingStep } from "./cooking_plan";

// Keep convex-helpers' non-erasable implementation out of the browser type graph.
export declare const cookingPlanValidator: Validator<CookingPlan>;
export declare const cookingStepValidator: Validator<CookingStep>;
