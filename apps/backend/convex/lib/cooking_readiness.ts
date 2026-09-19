import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function resetUnstartedReadiness(
  ctx: MutationCtx,
  steps: readonly Doc<"cookingSteps">[],
  changedSlots: ReadonlySet<number>,
) {
  for (const step of steps) {
    if (
      step.status === "waiting" &&
      step.startedAt === undefined &&
      step.slots.some((slot) => changedSlots.has(slot))
    ) {
      await ctx.db.patch(step._id, { status: "pending", readyMemberIds: [] });
    }
  }
}
