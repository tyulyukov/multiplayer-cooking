import { expect, test } from "bun:test";

import type { Id } from "../../convex/_generated/dataModel";
import { mergeHistory, type CookingHistoryItem, type HistoryItem } from "./history";

const ideaId = "idea-1" as Id<"ideas">;
const item: HistoryItem = {
  threadId: "conversation-1",
  title: "Пряний рамен",
  createdAt: 100,
  active: true,
  photos: ["/dish.jpg"],
};
function room(id: string, patch: Partial<CookingHistoryItem> = {}): CookingHistoryItem {
  return {
    _id: id as Id<"cookingRooms">,
    sourceIdeaId: ideaId,
    sourceThreadId: item.threadId,
    sourceImageUrl: "/dish.jpg",
    source: { title: "Рамен без грибів" },
    state: "done",
    requestedServings: 2,
    createdAt: 200,
    ...patch,
  };
}

test("cooked versions and repeated sessions stay in one unchanged conversation row", () => {
  const older = room("older");
  const newer = room("newer", { sourceIdeaId: "idea-version-2" as Id<"ideas">, createdAt: 300 });
  const entries = mergeHistory([item], [older, newer]);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject(item);
  expect(entries[0]?.rooms.map((session) => session._id)).toEqual([newer._id, older._id]);
  expect(item).not.toHaveProperty("rooms");
});

test("same titles in different conversations are not merged", () => {
  const other = { ...item, threadId: "conversation-2" };
  const entries = mergeHistory([item, other], [room("one")]);
  expect(entries).toHaveLength(2);
  expect(entries.find((entry) => entry.threadId === other.threadId)?.rooms).toEqual([]);
});

test("a session outside the conversation history page retains its idea link and image", () => {
  const entries = mergeHistory([], [room("one"), room("two", { createdAt: 300 })]);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    threadId: item.threadId,
    title: "Рамен без грибів",
    photos: ["/dish.jpg"],
    createdAt: 300,
  });
  expect(entries[0]?.rooms).toHaveLength(2);
});

test("deleted source ideas keep all their sessions together without a broken idea link", () => {
  const rooms = [
    room("one", { sourceThreadId: null, sourceImageUrl: null }),
    room("two", { sourceThreadId: null, sourceImageUrl: null }),
  ];
  const entries = mergeHistory([], rooms);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ threadId: null, photos: [], rooms });
});

test("distinct deleted ideas stay separate and normal history keeps its date order", () => {
  const entries = mergeHistory(
    [item],
    [
      room("old", { sourceThreadId: null, createdAt: 50 }),
      room("recent", { sourceThreadId: null, sourceIdeaId: "other-idea" as Id<"ideas"> }),
    ],
  );
  expect(entries).toHaveLength(3);
  expect(entries.map((entry) => entry.createdAt)).toEqual([200, 100, 50]);
  expect(mergeHistory([], [])).toEqual([]);
});
