import { useState } from "react";

import { useChatActions } from "@/features/chat/api/use-chat";
import { useAttachments } from "@/shared/hooks/use-attachments";
import { haptics } from "@/shared/lib/haptics";

import { useComposerDraft } from "./use-composer-draft";
import { useDraftSync } from "./use-draft-sync";

// One composer bound to one draft: Home passes null (the next new thread), Chat its thread id.
export const useChatComposer = (target: string | null | undefined) => {
  const actions = useChatActions(target);
  const draft = useComposerDraft();
  const attachments = useAttachments(actions.upload);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftSync = useDraftSync({
    threadId: target,
    remote: actions.remoteDraft,
    text: draft.request,
    imageIds: attachments.storageIds,
    adopt: (saved) => {
      draft.change(saved.text);
      attachments.restore(saved.images);
    },
    save: actions.saveDraft,
  });

  const submit = async (text: string) => {
    if (target === undefined || sending) return;
    setSending(true);
    setError(null);
    draftSync.beginSend();
    const submittedRevision = draft.revision.current;
    let sent = false;

    try {
      const result = await actions.sendMessage(text, attachments.storageIds);

      if (!result) return;

      if (result.ok) {
        sent = true;

        if (draft.revision.current === submittedRevision) draft.change("");
        attachments.clear();
      } else {
        haptics.error();
        setError(result.message);
      }
    } catch {
      haptics.error();
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      draftSync.endSend(sent);
      setSending(false);
    }
  };

  return { actions, draft, attachments, sending, error, setError, submit };
};
