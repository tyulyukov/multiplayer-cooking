import { useNavigate } from "@tanstack/react-router";
import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { CookingSetup } from "@multiplayer-cooking/core/cooking/types";
import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import {
  createCookingCredential,
  saveCookingCredential,
} from "@/features/cooking/lib/cooking-session";

export const useCreateCookingRoom = (sessionId: SessionId | undefined) => {
  const navigate = useNavigate();
  const createRoomMutation = useMutation(api.cookingRooms.create);

  return async (sourceIdeaId: Idea["_id"], setup: CookingSetup) => {
    if (!sessionId) return;
    const credential = createCookingCredential(createCookingCredential().participantToken);

    const result = await createRoomMutation({
      sessionId,
      sourceIdeaId,
      participantToken: credential.participantToken,
      inviteToken: credential.inviteToken!,
      ...setup,
    });

    if (!result) throw new Error("Не вдалося створити кухню.");
    saveCookingCredential(result.roomId, credential);
    await navigate({ to: "/cook/$roomId", params: { roomId: result.roomId } });
  };
};
