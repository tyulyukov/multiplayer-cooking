import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { QuestionResponse } from "@multiplayer-cooking/core/chat/types";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";

import { uploadImage } from "@/shared/lib/upload-image";

const sortMessages = (messages: readonly UIMessage[]) => {
  return [...messages].sort((a, b) => a.order - b.order || a.stepOrder - b.stepOrder);
};

const isAgentWorking = (messages: readonly UIMessage[]) => {
  const last = messages.at(-1);

  if (!last) return false;

  return (
    last.role === "user" ||
    (last.role === "assistant" && (last.status === "pending" || last.status === "streaming"))
  );
};

// SAFETY: every id passed here comes from `uploadAttachment` or a server draft, both of which
// only hold ids Convex issued for this app's "_storage" table.
const asStorageId = (id: string) => id as Id<"_storage">;

const storageIds = (ids: readonly string[]) => ids.map(asStorageId);

export const useActiveThread = () => {
  const [sessionId] = useSessionId();

  return useQuery(api.chat.activeThread, sessionId ? { sessionId } : "skip");
};

export const useThreadMessages = (threadId: string | null | undefined) => {
  const [sessionId] = useSessionId();
  const args = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);

  const { results, status } = useUIMessages(api.chat.listMessages, args, {
    initialNumItems: 50,
    stream: true,
  });

  const messages = sortMessages(results);

  return {
    messages,
    loading: status === "LoadingFirstPage",
    agentWorking: isAgentWorking(messages),
  };
};

// `target` is the composer's thread: null for the home composer that starts a new thread.
export const useChatActions = (target: string | null | undefined) => {
  const [sessionId] = useSessionId();
  const threadId = target ?? undefined;

  const remoteDraft = useQuery(
    api.chat.draft,
    sessionId && target !== undefined ? { sessionId, threadId } : "skip",
  );

  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const newThreadMutation = useMutation(api.chat.newThread);
  const answerQuestionMutation = useMutation(api.chat.answerQuestion);
  const retryMutation = useMutation(api.chat.retry);
  const saveDraftMutation = useMutation(api.chat.saveDraft);
  const uploadUrlMutation = useMutation(api.files.uploadUrl);
  const registerUploadMutation = useMutation(api.files.register);

  return {
    remoteDraft,
    sendMessage(text: string, imageIds: readonly string[]) {
      if (!sessionId) return Promise.resolve(null);

      return sendMessageMutation({ sessionId, threadId, text, imageIds: storageIds(imageIds) });
    },
    newThread() {
      return sessionId ? newThreadMutation({ sessionId }) : Promise.resolve(null);
    },
    answerQuestion(toolCallId: string, answer: QuestionResponse) {
      if (!sessionId || !threadId) return Promise.resolve(null);

      return answerQuestionMutation({ sessionId, threadId, toolCallId, answer });
    },
    retry() {
      return sessionId && threadId ? retryMutation({ sessionId, threadId }) : Promise.resolve(null);
    },
    saveDraft(draftThreadId: string | null, text: string, imageIds: readonly string[]) {
      return sessionId
        ? saveDraftMutation({
            sessionId,
            threadId: draftThreadId ?? undefined,
            text,
            imageIds: storageIds(imageIds),
          }).catch(() => false)
        : Promise.resolve(false);
    },
    upload: sessionId
      ? async (fileUri: string) => {
          const url = await uploadUrlMutation({ sessionId });

          if (!url) throw new Error("Upload limit reached");
          const storageId = await uploadImage(url, fileUri);

          const registered = await registerUploadMutation({
            sessionId,
            storageId: asStorageId(storageId),
          });

          if (!registered) throw new Error("Upload rejected");

          return storageId;
        }
      : null,
  };
};
