import { expect, test } from "bun:test";
import type { SessionId } from "convex-helpers/server/sessions";

import { api } from "./_generated/api";
import { cookingFixture } from "../tests/cooking-fixture";

const sessionId = "history-session" as SessionId;
const outsiderSessionId = "history-outsider" as SessionId;

test("owned history returns source metadata for every room without exposing private idea fields", async () => {
  const fixture = await cookingFixture();
  const imageStorageId = await fixture.t.run((ctx) => ctx.storage.store(new Blob(["dish image"])));
  const secondRoomId = await fixture.t.run(async (ctx) => {
    const room = await ctx.db.get(fixture.roomId);
    if (!room) throw new Error("Missing fixture room");
    await ctx.db.insert("sessions", { sessionId, userId: fixture.userId, authVersion: 0 });
    const outsiderUserId = await ctx.db.insert("users", {});
    await ctx.db.insert("sessions", {
      sessionId: outsiderSessionId,
      userId: outsiderUserId,
      authVersion: 0,
    });
    await ctx.db.patch(room.sourceIdeaId, { image: { storageId: imageStorageId } });
    const { _id, _creationTime, ownerMemberId: _ownerMemberId, ...secondRoom } = room;
    return ctx.db.insert("cookingRooms", {
      ...secondRoom,
      createdAt: room.createdAt + 1,
    });
  });

  expect(
    await fixture.t.query(api.cookingRooms.listOwned, { sessionId: "unknown" as SessionId }),
  ).toEqual([]);
  expect(
    await fixture.t.query(api.cookingRooms.listOwned, { sessionId: outsiderSessionId }),
  ).toEqual([]);
  const rooms = await fixture.t.query(api.cookingRooms.listOwned, { sessionId });
  expect(rooms).toHaveLength(2);
  expect(rooms.map((room) => room._id)).toEqual([secondRoomId, fixture.roomId]);
  expect(rooms[0]?.sourceIdeaId).toBe(rooms[1]?.sourceIdeaId);
  expect(rooms.map((room) => room.sourceThreadId)).toEqual(["private-chat", "private-chat"]);
  expect(rooms.map((room) => room.sourceImageUrl)).toEqual([
    expect.any(String),
    expect.any(String),
  ]);
  expect(JSON.stringify(rooms)).not.toContain("private-prompt");
  expect(JSON.stringify(rooms)).not.toContain(String(imageStorageId));
});

test("owned history retains rooms with missing or foreign source ideas without source metadata", async () => {
  const fixture = await cookingFixture();
  const sourceIds = await fixture.t.run(async (ctx) => {
    const foreignUserId = await ctx.db.insert("users", {});
    const foreignIdeaId = await ctx.db.insert("ideas", {
      userId: foreignUserId,
      threadId: "foreign-thread",
      promptMessageId: "foreign-prompt",
      title: "Чужа ідея",
      summary: "Не показувати",
      body: "Не показувати",
      ingredients: [],
      timeMinutes: 10,
      servings: 1,
    });
    const room = await ctx.db.get(fixture.roomId);
    if (!room) throw new Error("Missing fixture room");
    await ctx.db.insert("sessions", { sessionId, userId: fixture.userId, authVersion: 0 });
    const { _id, _creationTime, ownerMemberId: _ownerMemberId, ...foreignRoom } = room;
    await ctx.db.insert("cookingRooms", {
      ...foreignRoom,
      sourceIdeaId: foreignIdeaId,
      createdAt: room.createdAt + 1,
    });
    await ctx.db.delete(room.sourceIdeaId);
    return { deletedSourceIdeaId: room.sourceIdeaId, foreignSourceId: foreignIdeaId };
  });

  const rooms = await fixture.t.query(api.cookingRooms.listOwned, { sessionId });
  expect(rooms).toHaveLength(2);
  expect(rooms.map((room) => room.sourceIdeaId)).toEqual([
    sourceIds.foreignSourceId,
    sourceIds.deletedSourceIdeaId,
  ]);
  expect(
    rooms.map(({ sourceThreadId, sourceImageUrl }) => ({ sourceThreadId, sourceImageUrl })),
  ).toEqual([
    { sourceThreadId: null, sourceImageUrl: null },
    { sourceThreadId: null, sourceImageUrl: null },
  ]);
  expect(JSON.stringify(rooms)).not.toContain("foreign-thread");
  expect(JSON.stringify(rooms)).not.toContain("foreign-prompt");
});
