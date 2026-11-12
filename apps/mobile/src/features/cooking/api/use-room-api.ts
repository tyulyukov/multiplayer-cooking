import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";

const heartbeatMs = 20_000;

export const useRoomApi = (
  roomId: Id<"cookingRooms">,
  participantToken: string | undefined,
  online: boolean,
) => {
  const read = useQuery(
    api.cookingRooms.read,
    participantToken ? { roomId, participantToken } : "skip",
  );

  const heartbeat = useMutation(api.cookingRooms.heartbeat);

  useEffect(() => {
    if (!participantToken || !online) return;

    const beat = () => {
      heartbeat({ roomId, participantToken }).catch(() => undefined);
    };

    beat();
    const id = setInterval(beat, heartbeatMs);

    return () => clearInterval(id);
  }, [heartbeat, online, participantToken, roomId]);

  return {
    read,
    join: useMutation(api.cookingRooms.join),
    recoverHost: useMutation(api.cookingRooms.recoverHost),
    startSession: useMutation(api.cookingRooms.startSession),
    finish: useMutation(api.cookingRooms.finish),
    retryGeneration: useMutation(api.cookingRooms.retryGeneration),
    rotateInvite: useMutation(api.cookingRooms.rotateInvite),
    closeInvite: useMutation(api.cookingRooms.closeInvite),
    removeMember: useMutation(api.cookingRooms.removeMember),
    transferHost: useMutation(api.cookingRooms.transferHost),
    continueAlone: useMutation(api.cookingRooms.continueAlone),
    leave: useMutation(api.cookingRooms.leave),
    cookAgain: useMutation(api.cookingRooms.cookAgain),
    requestReference: useMutation(api.cookingAssistance.requestReference),
  };
};
