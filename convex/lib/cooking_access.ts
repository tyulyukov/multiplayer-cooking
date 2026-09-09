import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export const PARTICIPANT_TOKEN_MAX_LENGTH = 512;
export const ROOM_MEMBER_LIMIT = 12;

export async function hashSecret(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function activeMember(
  ctx: ReadCtx,
  roomId: Id<"cookingRooms">,
  participantToken: string,
): Promise<Doc<"cookingMembers"> | null> {
  const tokenHash = await hashSecret(participantToken);
  const member = await ctx.db
    .query("cookingMembers")
    .withIndex("by_room_tokenHash", (q) => q.eq("roomId", roomId).eq("tokenHash", tokenHash))
    .unique();
  return member?.status === "active" ? member : null;
}

export async function requireActiveMember(
  ctx: ReadCtx,
  roomId: Id<"cookingRooms">,
  participantToken: string,
): Promise<Doc<"cookingMembers">> {
  const member = await activeMember(ctx, roomId, participantToken);
  if (!member) throw new ConvexError("Учасник не має доступу до цієї кухні.");
  return member;
}

export function requireHost(member: Doc<"cookingMembers">): void {
  if (member.role !== "host") throw new ConvexError("Лише господар може виконати цю дію.");
}

export function hasSlot(member: Doc<"cookingMembers">, slot: number): boolean {
  return member.slots.includes(slot);
}

export function publicMember(member: Doc<"cookingMembers">) {
  return {
    _id: member._id,
    name: member.name,
    role: member.role,
    status: member.status,
    slots: member.slots,
    lastSeenAt: member.lastSeenAt,
  };
}

export function publicRoom(room: Doc<"cookingRooms">) {
  return {
    _id: room._id,
    source: room.source,
    cookCount: room.cookCount,
    requestedServings: room.requestedServings,
    constraints: room.constraints,
    state: room.state,
    lobbyCompletedAt: room.lobbyCompletedAt,
    plan: room.plan,
    planVersion: room.planVersion,
    inviteOpen: room.inviteOpen,
    inviteExpiresAt: room.inviteExpiresAt,
    createdAt: room.createdAt,
    generationError: room.generationError,
    helperBusy: room.helperBusy,
    helperError: room.helperError,
    checkedIngredientIds: room.checkedIngredientIds,
  };
}
