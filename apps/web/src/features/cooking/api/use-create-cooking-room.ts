import { useNavigate } from "@tanstack/react-router";
import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { CookingSetup } from "@/features/cooking/model/types";
import type { Idea } from "@/features/ideas/model/types";
import { createCookingCredential, saveCookingCredential } from "@/lib/cooking-session";

export function useCreateCookingRoom(sessionId: SessionId | undefined) {
  const navigate = useNavigate();
  const createRoomMutation = useMutation(api.cookingRooms.create);

  return async function createRoom(sourceIdeaId: Idea["_id"], setup: CookingSetup) {
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
}
