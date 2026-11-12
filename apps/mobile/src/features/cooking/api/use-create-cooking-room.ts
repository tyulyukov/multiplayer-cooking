import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { CookingSetup } from "@multiplayer-cooking/core/cooking/types";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { newCookingCredential, newInviteToken } from "@/features/cooking/lib/credential";
import { readCookingCredential, saveCookingCredential } from "@/shared/lib/storage";

const freshCredential = () => newCookingCredential(newInviteToken());

// Creates a room from an idea, saves the host credential and returns the new room id.
export const useCreateCookingRoom = () => {
  const [sessionId] = useSessionId();
  const create = useMutation(api.cookingRooms.create);

  return async (sourceIdeaId: Id<"ideas">, setup: CookingSetup) => {
    if (!sessionId) throw new Error("Немає сесії.");
    const credential = freshCredential();

    const result = await create({
      sessionId,
      sourceIdeaId,
      participantToken: credential.participantToken,
      inviteToken: credential.inviteToken!,
      ...setup,
    });

    if (!result) throw new Error("Не вдалося створити кухню.");
    saveCookingCredential(result.roomId, credential);

    return result.roomId;
  };
};

// The finished room's setup prefills the form; `null` means this device has no place in it.
export const useCookAgain = (roomId: string) => {
  const [credential] = useState(() => readCookingCredential(roomId));
  const cookAgain = useMutation(api.cookingRooms.cookAgain);

  const read = useQuery(
    api.cookingRooms.read,
    credential ? { roomId, participantToken: credential.participantToken } : "skip",
  );

  const submit = async (setup: CookingSetup) => {
    if (!credential || !read) throw new Error("Немає доступу до кухні.");
    const next = freshCredential();

    const result = await cookAgain({
      roomId: read.room._id,
      participantToken: credential.participantToken,
      newParticipantToken: next.participantToken,
      inviteToken: next.inviteToken!,
      ...setup,
    });

    if (!result) throw new Error("Не вдалося почати заново.");
    saveCookingCredential(result.roomId, next);

    return result.roomId;
  };

  return { read: credential ? read : null, submit };
};
