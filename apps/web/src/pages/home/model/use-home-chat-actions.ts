import type { SessionId } from "convex-helpers/server/sessions";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { useChat } from "@/features/chat/api/use-chat";
import type { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useDraftSync } from "@/features/chat/model/use-draft-sync";
import type { QuestionSubmit } from "@/features/chat/model/types";
import type { useAttachments } from "@/shared/hooks/use-attachments";

type Props = {
  sessionId: SessionId | undefined;
  chat: Pick<
    ReturnType<typeof useChat>,
    | "active"
    | "threadId"
    | "remoteDraft"
    | "saveDraft"
    | "sendMessage"
    | "createThread"
    | "answerQuestion"
  >;
  draft: ReturnType<typeof useComposerDraft>;
  attachments: ReturnType<typeof useAttachments>;
  resetVersion: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
};

export const useHomeChatActions = ({
  sessionId,
  chat,
  draft,
  attachments,
  resetVersion,
  setError,
}: Props) => {
  const { threadId } = chat;
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);

  const draftSync = useDraftSync({
    threadId: chat.active === undefined ? undefined : threadId,
    remote: chat.remoteDraft,
    text: draft.request,
    imageIds: attachments.storageIds,
    adopt: (saved) => {
      draft.change(saved.text);
      attachments.restore(saved.images);
    },
    save: chat.saveDraft,
  });

  const submit = async (text: string) => {
    if (!sessionId) return;
    setSending(true);
    setError(null);
    draftSync.beginSend();
    const submittedRevision = draft.revision.current;
    let sentThreadId: string | undefined;

    try {
      const result = await chat.sendMessage(text, attachments.storageIds);

      if (!result) return;

      if (result.ok) {
        sentThreadId = result.threadId;

        if (draft.revision.current === submittedRevision) draft.change("");
        attachments.clear();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      draftSync.endSend(sentThreadId);
      setSending(false);
    }
  };

  const startNew = async () => {
    if (!sessionId) return;
    setError(null);

    try {
      await chat.createThread();
      draft.reset();
      resetVersion();
    } catch {
      setError("Не вдалося створити нову розмову. Спробуй ще раз.");
    }
  };

  const answer = async (toolCallId: string, value: Parameters<QuestionSubmit>[1]) => {
    if (!sessionId || !threadId) return;
    setAnswering(true);
    setError(null);

    try {
      const result = await chat.answerQuestion(toolCallId, value);

      if (result && !result.ok) setError(result.message);
    } catch {
      setError("Не вдалося надіслати відповідь. Спробуй ще раз.");
    } finally {
      setAnswering(false);
    }
  };

  return { sending, answering, submit, startNew, answer };
};
