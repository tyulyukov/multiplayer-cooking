import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useMutation } from "convex/react";

// Helper mutations; the feed queries live in the room model (`useHelperFeed`).
export const useHelperActions = () => {
  return {
    ask: useMutation(api.cookingAssistance.askHelper),
    retry: useMutation(api.cookingAssistance.retryHelper),
    approve: useMutation(api.cookingAssistance.approveProposal),
    reject: useMutation(api.cookingAssistance.rejectProposal),
    addNote: useMutation(api.cookingAssistance.addNote),
    deleteNote: useMutation(api.cookingAssistance.deleteNote),
    uploadUrl: useMutation(api.cookingAssistance.generateHelperUploadUrl),
    registerUpload: useMutation(api.cookingAssistance.registerHelperUpload),
  };
};
