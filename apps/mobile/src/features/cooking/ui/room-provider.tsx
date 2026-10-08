import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { ReactNode } from "react";

import { RoomContext } from "../model/room-context";
import { useRoomModel } from "../model/use-room-model";

type RoomProviderProps = { roomId: Id<"cookingRooms">; children: ReactNode };

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const room = useRoomModel(roomId);

  return <RoomContext value={room}>{children}</RoomContext>;
}
