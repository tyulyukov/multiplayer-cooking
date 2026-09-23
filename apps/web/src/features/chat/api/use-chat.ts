import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation, useQuery } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { QuestionResponse } from "@/features/chat/model/types";
import { uploadImage } from "@/shared/lib/images";

const sortMessages = (messages: readonly UIMessage[]) => {
  return [...messages].sort((a, b) => a.order - b.order || a.stepOrder - b.stepOrder);
};

const isAgentWorking = (messages: readonly UIMessage[]) => {
  const last = messages.at(-1);

  if (!last) {
    return false;
  }

  return (
    last.role === "user" ||
    (last.role === "assistant" && (last.status === "pending" || last.status === "streaming"))
  );
};

export const useChat = (sessionId: SessionId | undefined, enabled: boolean) => {
  const active = useQuery(api.chat.activeThread, sessionId && enabled ? { sessionId } : "skip");
  const threadId = active?.threadId ?? null;
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const { results } = useUIMessages(api.chat.listMessages, threadArgs, {
    initialNumItems: 50,
    stream: true,
  });
  const remoteDraft = useQuery(
    api.chat.draft,
    sessionId && enabled ? { sessionId, threadId: threadId ?? undefined } : "skip",
  );
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const createThreadMutation = useMutation(api.chat.newThread);
  const answerQuestionMutation = useMutation(api.chat.answerQuestion);
  const saveDraftMutation = useMutation(api.chat.saveDraft);
  const uploadUrlMutation = useMutation(api.files.uploadUrl);
  const registerUploadMutation = useMutation(api.files.register);
  const messages = sortMessages(results);

  return {
    active,
    threadId,
    messages,
    agentWorking: isAgentWorking(messages),
    remoteDraft,
    sendMessage(text: string, imageIds: readonly string[]) {
      if (!sessionId) return Promise.resolve(null);
      return sendMessageMutation({
        sessionId,
        threadId: threadId ?? undefined,
        text,
        imageIds: imageIds as Id<"_storage">[],
      });
    },
    createThread() {
      return sessionId ? createThreadMutation({ sessionId }) : Promise.resolve(null);
    },
    answerQuestion(toolCallId: string, answer: QuestionResponse) {
      if (!sessionId || !threadId) return Promise.resolve(null);
      return answerQuestionMutation({ sessionId, threadId, toolCallId, answer });
    },
    saveDraft(target: string | null, text: string, imageIds: readonly string[]) {
      return sessionId
        ? saveDraftMutation({
            sessionId,
            threadId: target ?? undefined,
            text,
            imageIds: imageIds as Id<"_storage">[],
          }).catch(() => false)
        : Promise.resolve(false);
    },
    async uploadAttachment(blob: Blob) {
      if (!sessionId) throw new Error("Missing session");
      const url = await uploadUrlMutation({ sessionId });
      if (!url) throw new Error("Upload limit reached");
      const storageId = await uploadImage(url, blob);
      const registered = await registerUploadMutation({
        sessionId,
        storageId: storageId as Id<"_storage">,
      });
      if (!registered) throw new Error("Upload rejected");
      return storageId;
    },
  };
};
