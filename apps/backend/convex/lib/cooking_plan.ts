import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "ID must use letters, numbers, dots, underscores, or hyphens",
  );
const shortTextSchema = z.string().trim().min(1).max(140);
const markdownSchema = z.string().trim().min(1).max(6_000);

const checklistItemSchema = z.object({ id: idSchema, label: shortTextSchema }).strict();

const timerSchema = z
  .object({
    id: idSchema,
    label: shortTextSchema,
    durationSeconds: z.number().int().min(1).max(604_800),
    afterChecklistItemId: idSchema.optional(),
  })
  .strict();

const choiceSchema = z
  .object({ id: idSchema, label: shortTextSchema, prompt: markdownSchema })
  .strict();

export const cookingStepSchema = z
  .object({
    id: idSchema,
    title: shortTextSchema,
    body: markdownSchema,
    kind: z.enum(["task", "together", "handoff"]),
    slots: z.array(z.number().int().min(1).max(12)).min(1).max(12),
    dependsOn: z.array(idSchema).max(79),
    activeMinutes: z.number().int().min(0).max(180),
    canWait: z.boolean().optional(),
    equipment: z.array(idSchema).max(12),
    checklist: z.array(checklistItemSchema).max(100),
    timers: z.array(timerSchema).max(24),
    confirmation: markdownSchema.optional(),
    temperature: z
      .object({ value: z.number(), unit: z.enum(["C", "F"]), label: shortTextSchema })
      .strict()
      .optional(),
    reference: z
      .object({
        prompt: markdownSchema,
        alt: shortTextSchema,
        style: z.enum(["illustration", "photo"]).optional(),
      })
      .strict()
      .optional(),
    choices: z.array(choiceSchema).max(12).optional(),
  })
  .strict();

const ingredientSchema = z
  .object({
    id: idSchema,
    name: shortTextSchema,
    amount: shortTextSchema,
    quantity: z.number().nonnegative().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

const equipmentSchema = z
  .object({ id: idSchema, name: shortTextSchema, capacity: z.number().int().min(1).max(12) })
  .strict();

export const cookingPlanSchema = z
  .object({
    servings: z.number().int().min(1).max(24),
    summary: z.string().trim().min(1).max(2_000),
    ingredients: z.array(ingredientSchema).max(200),
    equipment: z.array(equipmentSchema).max(24),
    steps: z.array(cookingStepSchema).min(1).max(80),
  })
  .strict()
  .superRefine((plan, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(plan)).byteLength > 200_000) {
      ctx.addIssue({ code: "custom", message: "Cooking plan exceeds 200 KB" });
    }
    if (plan.steps.reduce((count, step) => count + step.timers.length, 0) > 24) {
      ctx.addIssue({ code: "custom", message: "Cooking plan exceeds 24 timers" });
    }
    addDuplicateIdIssues(ctx, plan.ingredients, "ingredients");
    addDuplicateIdIssues(ctx, plan.equipment, "equipment");
    addDuplicateIdIssues(ctx, plan.steps, "steps");

    const stepIds = new Set(plan.steps.map((step) => step.id));
    const equipmentIds = new Set(plan.equipment.map((item) => item.id));

    for (const [index, step] of plan.steps.entries()) {
      addDuplicateValueIssue(
        ctx,
        step.slots,
        ["steps", index, "slots"],
        "Step slots must be distinct",
      );
      addDuplicateValueIssue(
        ctx,
        step.dependsOn,
        ["steps", index, "dependsOn"],
        "Step dependencies must be distinct",
      );
      addDuplicateValueIssue(
        ctx,
        step.equipment,
        ["steps", index, "equipment"],
        "Step equipment must be distinct",
      );
      addDuplicateIdIssues(ctx, step.checklist, `steps.${index}.checklist`);
      addDuplicateIdIssues(ctx, step.timers, `steps.${index}.timers`);
      for (const [timerIndex, timer] of step.timers.entries()) {
        if (
          timer.afterChecklistItemId &&
          !step.checklist.some((item) => item.id === timer.afterChecklistItemId)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", index, "timers", timerIndex, "afterChecklistItemId"],
            message: "Timer placement must reference a checklist item in the same step",
          });
        }
      }
      addDuplicateIdIssues(ctx, step.choices ?? [], `steps.${index}.choices`);

      if (step.kind === "task" && step.slots.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "slots"],
          message: "A task needs one cook slot",
        });
      }
      if (step.kind === "together" && step.slots.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "slots"],
          message: "A shared step needs at least two cook slots",
        });
      }
      if (step.kind === "handoff" && step.slots.length !== 2) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "slots"],
          message: "A handoff needs sender and recipient slots",
        });
      }

      for (const dependency of step.dependsOn) {
        if (dependency === step.id) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", index, "dependsOn"],
            message: "A step cannot depend on itself",
          });
        } else if (!stepIds.has(dependency)) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", index, "dependsOn"],
            message: `Unknown dependency: ${dependency}`,
          });
        }
      }

      for (const equipmentId of step.equipment) {
        if (!equipmentIds.has(equipmentId)) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", index, "equipment"],
            message: `Unknown equipment: ${equipmentId}`,
          });
        }
      }
    }

    if (hasCycle(plan.steps)) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: "Step dependencies must not contain a cycle",
      });
    }
  });

export type CookingPlan = z.output<typeof cookingPlanSchema>;
export type CookingStep = z.output<typeof cookingStepSchema>;

export function validateCookingPlan(input: unknown, cookCount: number): CookingPlan {
  if (!Number.isInteger(cookCount) || cookCount < 1 || cookCount > 12) {
    throw new Error("Cook count must be an integer from 1 to 12");
  }

  const parsed = cookingPlanSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid cooking plan: ${formatIssues(parsed.error.issues)}`);
  }

  for (const step of parsed.data.steps) {
    if (step.slots.some((slot) => slot > cookCount)) {
      throw new Error(`Step ${step.id} assigns a cook slot outside 1..${cookCount}`);
    }
    if (cookCount === 1 && (step.kind !== "task" || step.slots[0] !== 1)) {
      throw new Error("A solo cooking plan may only contain task steps assigned to slot 1");
    }
  }

  return parsed.data;
}

export function topologicalOrder(plan: CookingPlan): CookingStep[] {
  const remaining = new Set(plan.steps.map((step) => step.id));
  const ordered: CookingStep[] = [];

  while (remaining.size > 0) {
    const next = plan.steps.find(
      (step) =>
        remaining.has(step.id) && step.dependsOn.every((dependency) => !remaining.has(dependency)),
    );
    if (!next) {
      throw new Error("Step dependencies must not contain a cycle");
    }
    remaining.delete(next.id);
    ordered.push(next);
  }

  return ordered;
}

export function normalizeSoloPlan(plan: CookingPlan): CookingPlan {
  const ordered = topologicalOrder(plan);
  const steps = ordered.map((step, index) => {
    const previous = index === 0 ? undefined : ordered[index - 1];
    return {
      ...step,
      kind: "task" as const,
      slots: [1],
      dependsOn: previous ? [previous.id] : [],
    };
  });

  return { ...plan, steps };
}

export function availableSteps(plan: CookingPlan, doneStepIds: Iterable<string>): CookingStep[] {
  const done = new Set(doneStepIds);
  return plan.steps.filter(
    (step) => !done.has(step.id) && step.dependsOn.every((dependency) => done.has(dependency)),
  );
}

function addDuplicateIdIssues(
  ctx: z.RefinementCtx,
  items: readonly { id: string }[],
  scope: string,
): void {
  addDuplicateValueIssue(
    ctx,
    items.map((item) => item.id),
    scope.split("."),
    `${scope} IDs must be distinct`,
  );
}

function addDuplicateValueIssue<T extends string | number>(
  ctx: z.RefinementCtx,
  values: readonly T[],
  path: PropertyKey[],
  message: string,
): void {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: "custom", path, message });
  }
}

function hasCycle(steps: readonly CookingStep[]): boolean {
  const remaining = new Set(steps.map((step) => step.id));

  while (remaining.size > 0) {
    const next = steps.find(
      (step) =>
        remaining.has(step.id) && step.dependsOn.every((dependency) => !remaining.has(dependency)),
    );
    if (!next) {
      return true;
    }
    remaining.delete(next.id);
  }

  return false;
}

function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`).join("; ");
}
