import { defineTable } from "convex/server";
import { v } from "convex/values";

import { cookingPlanValidator } from "./lib/cooking_validators";

export const roomStateValidator = v.union(
  v.literal("generating"),
  v.literal("ready"),
  v.literal("cooking"),
  v.literal("done"),
  v.literal("error"),
);
export const memberRoleValidator = v.union(v.literal("host"), v.literal("cook"));
export const memberStatusValidator = v.union(
  v.literal("active"),
  v.literal("removed"),
  v.literal("left"),
);
export const stepStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("waiting"),
  v.literal("done"),
);
export const imageStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("error"),
);
export const timerStatusValidator = v.union(
  v.literal("ready"),
  v.literal("running"),
  v.literal("paused"),
  v.literal("fired"),
  v.literal("cancelled"),
  v.literal("acknowledged"),
);

const sourceSnapshotValidator = v.object({
  title: v.string(),
  summary: v.string(),
  body: v.string(),
  ingredients: v.array(v.object({ name: v.string(), amount: v.optional(v.string()) })),
  servings: v.number(),
});

export const cookingTables = {
  cookingRooms: defineTable({
    hostUserId: v.id("users"),
    ownerMemberId: v.optional(v.id("cookingMembers")),
    sourceIdeaId: v.id("ideas"),
    source: sourceSnapshotValidator,
    cookCount: v.number(),
    requestedServings: v.number(),
    constraints: v.string(),
    state: roomStateValidator,
    lobbyCompletedAt: v.optional(v.number()),
    plan: v.optional(cookingPlanValidator),
    planVersion: v.number(),
    checkedIngredientIds: v.array(v.string()),
    inviteHash: v.string(),
    inviteOpen: v.boolean(),
    inviteExpiresAt: v.number(),
    createdAt: v.number(),
    generationAttempt: v.string(),
    generationError: v.optional(v.string()),
    helperThreadId: v.optional(v.string()),
    helperBusy: v.optional(v.boolean()),
    helperError: v.optional(v.string()),
    helperPromptMessageId: v.optional(v.string()),
    helperStartedAt: v.optional(v.number()),
  })
    .index("by_host_created", ["hostUserId", "createdAt"])
    .index("by_source", ["sourceIdeaId"]),
  cookingMembers: defineTable({
    roomId: v.id("cookingRooms"),
    tokenHash: v.string(),
    name: v.string(),
    role: memberRoleValidator,
    status: memberStatusValidator,
    slots: v.array(v.number()),
    lastSeenAt: v.number(),
  })
    .index("by_room_status", ["roomId", "status"])
    .index("by_room_tokenHash", ["roomId", "tokenHash"]),
  cookingSteps: defineTable({
    roomId: v.id("cookingRooms"),
    stepKey: v.string(),
    status: stepStatusValidator,
    slots: v.array(v.number()),
    readyMemberIds: v.array(v.id("cookingMembers")),
    checkedIds: v.array(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("cookingMembers")),
    imageStorageId: v.optional(v.id("_storage")),
    imageStatus: v.optional(imageStatusValidator),
    imageError: v.optional(v.string()),
    imageAttempt: v.optional(v.string()),
  }).index("by_room_step", ["roomId", "stepKey"]),
  cookingTimers: defineTable({
    roomId: v.id("cookingRooms"),
    stepKey: v.string(),
    timerKey: v.string(),
    label: v.string(),
    status: timerStatusValidator,
    durationMs: v.number(),
    deadline: v.optional(v.number()),
    remainingMs: v.optional(v.number()),
    version: v.number(),
    startedBy: v.optional(v.id("cookingMembers")),
    jobId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_room_status", ["roomId", "status"])
    .index("by_room_step_key", ["roomId", "stepKey", "timerKey"]),
  cookingProposals: defineTable({
    roomId: v.id("cookingRooms"),
    authorMemberId: v.id("cookingMembers"),
    status: v.union(
      v.literal("open"),
      v.literal("approved"),
      v.literal("stale"),
      v.literal("rejected"),
    ),
    planVersion: v.number(),
    preview: v.string(),
    plan: cookingPlanValidator,
    affectedStepKeys: v.array(v.string()),
    approvedBy: v.optional(v.id("cookingMembers")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_room_created", ["roomId", "createdAt"]),
  cookingNotes: defineTable({
    roomId: v.id("cookingRooms"),
    authorMemberId: v.id("cookingMembers"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_room_created", ["roomId", "createdAt"]),
};
