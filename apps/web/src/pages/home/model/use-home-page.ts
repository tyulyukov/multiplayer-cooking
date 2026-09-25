import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useChat } from "@/features/chat/api/use-chat";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useDraftSync } from "@/features/chat/model/use-draft-sync";
import type { QuestionSubmit } from "@/features/chat/model/types";
import { useCreateCookingRoom } from "@/features/cooking/api/use-create-cooking-room";
import type { CookingSetup } from "@/features/cooking/model/types";
import { useHistory } from "@/features/history/api/use-history";
import { useIdeas } from "@/features/ideas/api/use-ideas";
import { usePersonalization } from "@/features/personalization/api/use-personalization";
import { useSilpoConnection } from "@/features/silpo/api/use-silpo-connection";
import { useAttachments } from "@/shared/hooks/use-attachments";

export const useHomePageModel = () => {
  const [sessionId] = useSessionId();
  const navigate = useNavigate();
  const status = useQuery(api.status.current);
  const silpo = useSilpoConnection(sessionId);
  const connected = silpo.connection != null;
  const chat = useChat(sessionId, connected);
  const { threadId } = chat;
  const ideaState = useIdeas(sessionId, threadId);
  const { idea, ideas, versions, reset: resetVersion, select: selectVersion } = ideaState;
  const history = useHistory(sessionId, connected);
  const personal = usePersonalization(sessionId);
  const createCookingRoom = useCreateCookingRoom(sessionId);
  const draft = useComposerDraft();
  const attachments = useAttachments(sessionId ? chat.uploadAttachment : null);

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

  const [personalTab, setPersonalTab] = useState<"memories" | "settings" | null>(null);
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const working = sending || answering || chat.agentWorking;
  const backendReady = status?.ready === true;

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

  const submitAddress = async (address: string) => {
    if (!sessionId) return;
    setAddressError(null);

    try {
      const result = await silpo.saveAddress(address);

      if (result && !result.ok) setAddressError(result.message);
    } catch {
      setAddressError("Не вдалося зберегти адресу. Спробуй ще раз.");
    }
  };

  const cookCount = async (setup: CookingSetup) => {
    if (sessionId && idea) await createCookingRoom(idea._id, setup);
  };

  const submitCart = async () => {
    if (!sessionId || !idea) return;
    setError(null);

    try {
      const result = await ideaState.addToCart();

      if (result && !result.ok) setError(result.message);
    } catch {
      setError("Не вдалося додати в кошик. Спробуй ще раз.");
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

  const openFromHistory = async (target: string) => {
    if (!sessionId) return;
    setError(null);

    try {
      await history.openThread(target);
      resetVersion();
    } catch {
      setError("Не вдалося відкрити розмову. Спробуй ще раз.");
    }
  };

  const removeFromHistory = async (target: string) => {
    if (!sessionId) return;
    setError(null);

    try {
      await history.deleteThread(target);
    } catch {
      setError("Не вдалося видалити розмову. Спробуй ще раз.");
    }
  };

  if (silpo.connection === undefined) {
    return { screen: "loading", backendReady } as const;
  }

  if (silpo.connection === null) {
    return {
      screen: "connect",
      backendReady,
      props: {
        busy: silpo.connecting,
        error: silpo.error,
        onConnect: () => void silpo.connect(),
      },
    } as const;
  }

  const menu = {
    history: {
      items: history.items,
      onOpen: openFromHistory,
      onDelete: removeFromHistory,
      cookingRooms: history.cookingRooms,
      onOpenCooking: (roomId: string) => {
        void navigate({ to: "/cook/$roomId", params: { roomId } });
      },
    },
    personal: {
      open: personalTab !== null,
      onOpenChange: (open: boolean) => {
        if (!open) setPersonalTab(null);
      },
      initialTab: personalTab ?? "memories",
      memories: personal.memories,
      settings: personal.settings,
      loading: personal.loading,
      onDelete: personal.removeMemory,
      onSave: personal.saveSettings,
    },
    profile: {
      onOpenSettings: () => setPersonalTab("settings"),
      connection: silpo.connection,
      onForgetAddress: () => void silpo.forgetAddress(),
      onDisconnect: () => void silpo.disconnect(),
    },
  };

  if (!threadId) {
    return {
      screen: "home",
      backendReady,
      menu,
      props: { draft, attachments, busy: sending, error, onSubmit: submit },
    } as const;
  }

  return {
    screen: "chat",
    backendReady,
    menu,
    threadId,
    props: {
      connection: silpo.connection,
      messages: chat.messages,
      idea,
      ideas,
      versions,
      working,
      answering,
      draft,
      attachments,
      error,
      addressError,
      onSubmit: submit,
      onNew: startNew,
      onSaveAddress: submitAddress,
      onAddToCart: submitCart,
      onAnswer: answer,
      onCookCount: cookCount,
      profileName: silpo.connection.name,
      onOpenMemories: () => setPersonalTab("memories"),
      onOpenIdea: selectVersion,
    },
  } as const;
};

export const useMissingConvexHomeModel = () => {
  const draft = useComposerDraft();
  const attachments = useAttachments(null);
  const [error, setError] = useState<string | null>(null);

  return {
    draft,
    attachments,
    busy: false,
    error,
    onSubmit: () => setError("Convex ще не налаштований. Запусти bun run dev:backend."),
  };
};
