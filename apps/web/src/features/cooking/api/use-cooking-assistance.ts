import { useMutation, useQuery } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { uploadImage } from "@/shared/lib/images";
import { useAttachments } from "@/shared/hooks/use-attachments";

export const useCookingAssistance = ({
  roomId,
  participantToken,
  enabled,
}: {
  roomId: Id<"cookingRooms">;
  participantToken?: string;
  enabled: boolean;
}) => {
  const memberArgs = participantToken && enabled ? { roomId, participantToken } : ("skip" as const);
  const notes = useQuery(api.cookingAssistance.listNotes, memberArgs);
  const proposals = useQuery(api.cookingAssistance.listProposals, memberArgs);
  const messages = useQuery(api.cookingAssistance.listMessages, memberArgs);
  const addNote = useMutation(api.cookingAssistance.addNote);
  const ask = useMutation(api.cookingAssistance.askHelper);
  const approve = useMutation(api.cookingAssistance.approveProposal);
  const reject = useMutation(api.cookingAssistance.rejectProposal);
  const deleteNote = useMutation(api.cookingAssistance.deleteNote);
  const requestReference = useMutation(api.cookingAssistance.requestReference);
  const generateUploadUrl = useMutation(api.cookingAssistance.generateHelperUploadUrl);
  const registerUpload = useMutation(api.cookingAssistance.registerHelperUpload);

  const attachments = useAttachments(
    participantToken && enabled
      ? async (blob) => {
          const args = { roomId, participantToken };
          const grant = await generateUploadUrl(args);

          if (!grant) throw new Error("Upload unavailable");
          const storageId = await uploadImage(grant.uploadUrl, blob);

          // SAFETY: storageId was just minted by uploadImage() against this app's own "_storage"
          // table.
          if (
            !(await registerUpload({
              ...args,
              uploadTicket: grant.uploadTicket,
              storageId: storageId as Id<"_storage">,
            }))
          ) {
            throw new Error("Upload rejected");
          }

          return storageId;
        }
      : null,
  );

  return {
    notes,
    proposals,
    messages,
    attachments,
    addNote,
    ask,
    approve,
    reject,
    deleteNote,
    requestReference,
  };
};
