import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";

export type HistoryItem = FunctionReturnType<typeof api.chat.history>[number];
export type CookingHistoryItem = FunctionReturnType<typeof api.cookingRooms.listOwned>[number];
export type HistoryEntry = Omit<HistoryItem, "threadId"> & {
  key: string;
  threadId: string | null;
  rooms: CookingHistoryItem[];
};

export function mergeHistory(
  items: readonly HistoryItem[],
  rooms: readonly CookingHistoryItem[],
): HistoryEntry[] {
  const entries = new Map<string, HistoryEntry>();
  for (const item of items) {
    const key = `thread:${item.threadId}`;
    entries.set(key, { ...item, key, rooms: [] });
  }
  for (const room of [...rooms].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = room.sourceThreadId ? `thread:${room.sourceThreadId}` : `idea:${room.sourceIdeaId}`;
    const entry = entries.get(key);
    if (entry) {
      entry.rooms.push(room);
    } else {
      entries.set(key, {
        key,
        threadId: room.sourceThreadId,
        title: room.source.title,
        createdAt: room.createdAt,
        active: false,
        photos: room.sourceImageUrl ? [room.sourceImageUrl] : [],
        rooms: [room],
      });
    }
  }
  return [...entries.values()].sort((a, b) => b.createdAt - a.createdAt);
}
