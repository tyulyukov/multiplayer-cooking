import { expect, test } from "bun:test";

import { api } from "./_generated/api";
import { cookingFixture } from "../tests/cooking-fixture";

test("active cooks receive only their room's saved dish image", async () => {
  const fixture = await cookingFixture();
  expect(
    (await fixture.t.query(api.cookingRooms.read, fixture.host))?.room.dishImage,
  ).toBeUndefined();
  const storageId = await fixture.t.run((ctx) => ctx.storage.store(new Blob(["dish image"])));
  await fixture.t.run(async (ctx) => {
    const room = await ctx.db.get(fixture.roomId);
    if (!room) throw new Error("Missing fixture room");
    await ctx.db.patch(room.sourceIdeaId, {
      image: {
        storageId,
        credit: "Фото: Оля",
        sourceUrl: "https://example.com/dish",
      },
    });
  });

  const host = await fixture.t.query(api.cookingRooms.read, fixture.host);
  const guest = await fixture.t.query(api.cookingRooms.read, fixture.guest);
  expect(host?.room.dishImage).toEqual(guest?.room.dishImage);
  expect(host?.room.dishImage).toMatchObject({
    credit: "Фото: Оля",
    sourceUrl: "https://example.com/dish",
  });
  expect(host?.room.dishImage?.url).toBeTruthy();
  expect(JSON.stringify(host)).not.toContain("private-chat");
  expect(JSON.stringify(host)).not.toContain("private-prompt");
  expect(JSON.stringify(host)).not.toContain("storageId");
  expect(
    await fixture.t.query(api.cookingRooms.read, {
      roomId: fixture.roomId,
      participantToken: "outsider-".padEnd(40, "x"),
    }),
  ).toBeNull();

  await fixture.t.mutation(api.cookingRooms.removeMember, {
    ...fixture.host,
    memberId: fixture.guestId,
  });
  expect(await fixture.t.query(api.cookingRooms.read, fixture.guest)).toBeNull();

  await fixture.t.run((ctx) => ctx.storage.delete(storageId));
  expect(
    (await fixture.t.query(api.cookingRooms.read, fixture.host))?.room.dishImage,
  ).toBeUndefined();
  await fixture.t.run(async (ctx) => {
    const room = await ctx.db.get(fixture.roomId);
    if (!room) throw new Error("Missing fixture room");
    await ctx.db.delete(room.sourceIdeaId);
  });
  expect(
    (await fixture.t.query(api.cookingRooms.read, fixture.host))?.room.dishImage,
  ).toBeUndefined();
});
