import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { CookingCredential } from "@/features/cooking/lib/cooking-session";

export const useCookingRoom = (
  roomId: Id<"cookingRooms">,
  credential: CookingCredential | null,
) => {
  const connection = useConvexConnectionState();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const online = browserOnline && connection.isWebSocketConnected;
  const participantToken = credential?.participantToken;

  const room = useQuery(
    api.cookingRooms.read,
    participantToken ? { roomId, participantToken } : "skip",
  );

  const join = useMutation(api.cookingRooms.join);
  const recoverHost = useMutation(api.cookingRooms.recoverHost);
  const heartbeat = useMutation(api.cookingRooms.heartbeat);
  const startSession = useMutation(api.cookingRooms.startSession);
  const finish = useMutation(api.cookingRooms.finish);
  const retryGeneration = useMutation(api.cookingRooms.retryGeneration);
  const rotateInvite = useMutation(api.cookingRooms.rotateInvite);
  const closeInvite = useMutation(api.cookingRooms.closeInvite);
  const removeMember = useMutation(api.cookingRooms.removeMember);
  const transferHost = useMutation(api.cookingRooms.transferHost);
  const continueAlone = useMutation(api.cookingRooms.continueAlone);
  const leave = useMutation(api.cookingRooms.leave);
  const cookAgain = useMutation(api.cookingRooms.cookAgain);

  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!participantToken || !online) return;
    void heartbeat({ roomId, participantToken }).catch(() => undefined);

    const id = window.setInterval(
      () => void heartbeat({ roomId, participantToken }).catch(() => undefined),
      20_000,
    );

    return () => window.clearInterval(id);
  }, [heartbeat, online, participantToken, roomId]);

  return {
    room,
    online,
    join,
    recoverHost,
    startSession,
    finish,
    retryGeneration,
    rotateInvite,
    closeInvite,
    removeMember,
    transferHost,
    continueAlone,
    leave,
    cookAgain,
  };
};
