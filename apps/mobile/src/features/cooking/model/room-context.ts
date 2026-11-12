import { createContext, use, useEffect, useState } from "react";

import type { useRoomModel } from "./use-room-model";

export type CookingRoom = ReturnType<typeof useRoomModel>;

export const RoomContext = createContext<CookingRoom | null>(null);

// Shared state of the open room for the room screen and every room sheet.
export const useCookingRoom = () => {
  const room = use(RoomContext);

  if (!room) throw new Error("useCookingRoom must be used inside the room layout");

  return room;
};

// For screens that only render once the room has loaded (sheets, the timeline).
export const useRoomData = () => {
  const room = useCookingRoom();

  if (!room.read) throw new Error("The room has not loaded yet");

  return { ...room, read: room.read };
};

// Server-aligned clock ticking every 500ms; only components that show countdowns subscribe.
export const useRoomNow = () => {
  const { serverTime } = useCookingRoom();
  const [now, setNow] = useState(serverTime);

  useEffect(() => {
    const id = setInterval(() => setNow(serverTime()), 500);

    return () => clearInterval(id);
  }, [serverTime]);

  return now;
};
