import { useState } from "react";

import { useCookingAssistance } from "@/features/cooking/api/use-cooking-assistance";
import type { useCookingRoom } from "@/features/cooking/api/use-cooking-room";
import { helperContextStep } from "@/features/cooking/lib/cooking-helper";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";

import type { CookingCredential } from "@/features/cooking/lib/cooking-session";
import type { CookingActions } from "@/features/cooking/model/types";
import type { CookingHelperProps } from "@/features/cooking/model/helper-types";
export const useRoomHelper = (
  roomId: Id<"cookingRooms">,
  credential: CookingCredential | null,
  roomApi: ReturnType<typeof useCookingRoom>,
) => {
  const [helperRequested, setHelperRequested] = useState(false);
  const [helperChatRequest, setHelperChatRequest] = useState(0);
  const [helperPrompt, setHelperPrompt] = useState("");
  const [helperStepKey, setHelperStepKey] = useState<string>();
  const [lastHelperRequest, setLastHelperRequest] = useState<{
    promptMessageId: string;
    prompt: string;
    stepKey?: string;
    attachmentStorageIds: Id<"_storage">[];
  }>();
  const assistance = useCookingAssistance({
    roomId,
    participantToken: credential?.participantToken,
    enabled: Boolean(credential && roomApi.room && roomApi.online),
  });

  const read = roomApi.room;
  const online = roomApi.online;
  const helperAttachments = assistance.attachments;
  const activeHelperStep =
    read?.steps.find(
      (step) => step.status === "active" && step.slots.some((slot) => read.me.slots.includes(slot)),
    ) ??
    read?.steps.find(
      (step) =>
        step.status === "waiting" && step.slots.some((slot) => read.me.slots.includes(slot)),
    );
  const helperContext = helperContextStep(
    read?.room.plan?.steps ?? [],
    helperStepKey,
    activeHelperStep?.stepKey,
  );

  const ask: CookingActions["ask"] = (prompt?: string, stepKey?: string) => {
    if (prompt) setHelperPrompt(prompt);
    setHelperStepKey(stepKey);
    setHelperChatRequest((key) => key + 1);
    setHelperRequested(true);
  };
  const helperProps: CookingHelperProps | null =
    credential && read?.room.plan
      ? {
          plan: read.room.plan,
          contextStepKey: helperContext,
          chatRequestKey: helperChatRequest,
          onContextChange: setHelperStepKey,
          notes: (assistance.notes ?? []).map((note) => ({
            ...note,
            canDelete: read.me.role === "host" || note.authorMemberId === read.me._id,
          })),
          proposals: assistance.proposals ?? [],
          messages: assistance.messages ?? [],
          loaded: assistance.messages !== undefined && assistance.proposals !== undefined,
          helperBusy: read.room.helperBusy === true,
          helperError: read.room.helperError,
          open: helperRequested,
          onOpenChange: (open) => {
            if (open) setHelperStepKey(undefined);
            setHelperRequested(open);
          },
          prompt: helperPrompt,
          onPromptChange: setHelperPrompt,
          online,
          finished: read.room.state === "done" || read.room.state === "error",
          attachments: helperAttachments,
          onNote: (text) =>
            assistance.addNote({ roomId, participantToken: credential.participantToken, text }),
          onAsk: async (prompt) => {
            const request = {
              prompt,
              stepKey: helperContext || undefined,
              attachmentStorageIds: helperAttachments.storageIds as Id<"_storage">[],
            };
            const result = await assistance.ask({
              roomId,
              participantToken: credential.participantToken,
              ...request,
            });
            if (result)
              setLastHelperRequest({ ...request, promptMessageId: result.promptMessageId });
            return result;
          },
          onRetry:
            lastHelperRequest &&
            lastHelperRequest.promptMessageId === read.room.helperFailedPromptMessageId
              ? async () => {
                  const { promptMessageId: _failedMessageId, ...request } = lastHelperRequest;
                  const result = await assistance.ask({
                    roomId,
                    participantToken: credential.participantToken,
                    ...request,
                    stepKey: helperContextStep(read.room.plan?.steps ?? [], request.stepKey),
                  });
                  if (result)
                    setLastHelperRequest({ ...request, promptMessageId: result.promptMessageId });
                  return result;
                }
              : undefined,
          onDeleteNote: (noteId) =>
            assistance.deleteNote({
              roomId,
              participantToken: credential.participantToken,
              noteId,
            }),
          onApprove: (proposalId) =>
            assistance.approve({
              roomId,
              participantToken: credential.participantToken,
              proposalId,
            }),
          onReject: (proposalId) =>
            assistance.reject({
              roomId,
              participantToken: credential.participantToken,
              proposalId,
            }),
        }
      : null;
  return { assistance, ask, helperProps };
};
