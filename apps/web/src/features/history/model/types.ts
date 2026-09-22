import type { FunctionReturnType } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type HistoryItem = FunctionReturnType<typeof api.chat.history>[number];
export type CookingHistoryItem = FunctionReturnType<typeof api.cookingRooms.listOwned>[number];
export type HistoryEntry = Omit<HistoryItem, "threadId"> & {
  key: string;
  threadId: string | null;
  rooms: CookingHistoryItem[];
};
