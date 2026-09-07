import { expect, test } from "bun:test";
import type { Doc, Id } from "../_generated/dataModel";
import { hashSecret, publicMember, publicRoom } from "./cooking_access";

const roomId = "room" as Id<"cookingRooms">;
const userId = "user" as Id<"users">;
const ideaId = "idea" as Id<"ideas">;
const memberId = "member" as Id<"cookingMembers">;

test("hashes participant credentials without preserving the token", async () => {
  const token = "x".repeat(32);
  const hash = await hashSecret(token);
  expect(hash).toHaveLength(64);
  expect(hash).not.toContain(token);
  expect(hash).toBe(await hashSecret(token));
});

test("public room and member projections exclude private authorization fields", () => {
  const room: Doc<"cookingRooms"> = {
    _id: roomId,
    _creationTime: 1,
    hostUserId: userId,
    sourceIdeaId: ideaId,
    source: {
      title: "Паста",
      summary: "Вечеря",
      body: "Томатна паста.",
      ingredients: [{ name: "Томати" }],
      servings: 2,
    },
    cookCount: 2,
    requestedServings: 2,
    constraints: "",
    state: "ready",
    planVersion: 1,
    checkedIngredientIds: [],
    inviteHash: "secret",
    inviteOpen: true,
    inviteExpiresAt: 2,
    createdAt: 1,
    generationAttempt: "attempt",
  };
  const member: Doc<"cookingMembers"> = {
    _id: memberId,
    _creationTime: 1,
    roomId,
    tokenHash: "credential",
    name: "Оля",
    role: "cook",
    status: "active",
    slots: [2],
    lastSeenAt: 1,
  };
  expect(publicRoom(room)).not.toHaveProperty("hostUserId");
  expect(publicRoom(room)).not.toHaveProperty("sourceIdeaId");
  expect(publicRoom(room)).not.toHaveProperty("inviteHash");
  expect(publicMember(member)).not.toHaveProperty("tokenHash");
});
