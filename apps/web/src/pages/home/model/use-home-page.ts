import { useHomeChatActions } from "./use-home-chat-actions";
import { useHomeIdeaActions } from "./use-home-idea-actions";
import { createHomeHistoryActions } from "./home-history-actions";
import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useChat } from "@/features/chat/api/use-chat";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useCreateCookingRoom } from "@/features/cooking/api/use-create-cooking-room";
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

  const [personalTab, setPersonalTab] = useState<"memories" | "settings" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { sending, answering, submit, startNew, answer } = useHomeChatActions({
    sessionId,
    chat,
    draft,
    attachments,
    resetVersion,
    setError,
  });

  const { addressError, submitAddress, submitCart, cookCount } = useHomeIdeaActions({
    sessionId,
    silpo,
    ideaState,
    createCookingRoom,
    setError,
  });

  const { openFromHistory, removeFromHistory } = createHomeHistoryActions({
    sessionId,
    history,
    resetVersion,
    setError,
  });

  const working = sending || answering || chat.agentWorking;
  const backendReady = status?.ready === true;

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
