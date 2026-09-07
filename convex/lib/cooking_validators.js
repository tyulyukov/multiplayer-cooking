import { zodToConvex } from "convex-helpers/server/zod4";
import { cookingPlanSchema, cookingStepSchema } from "./cooking_plan";

export const cookingPlanValidator = zodToConvex(cookingPlanSchema);
export const cookingStepValidator = zodToConvex(cookingStepSchema);
