import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

// Helper queries live with the room so the header can show the unread dot and the helper
// sheet reuses the same subscriptions.
export const useHelperFeed = (
  roomId: Id<"cookingRooms">,
  participantToken: string | undefined,
  enabled: boolean,
) => {
  const args = participantToken && enabled ? { roomId, participantToken } : ("skip" as const);

  return {
    messages: useQuery(api.cookingAssistance.listMessages, args),
    proposals: useQuery(api.cookingAssistance.listProposals, args),
    notes: useQuery(api.cookingAssistance.listNotes, args),
  };
};
