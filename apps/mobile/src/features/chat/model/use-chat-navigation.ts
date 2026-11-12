import { router, useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useActiveThread, useChatActions } from "@/features/chat/api/use-chat";

const newThreadError = "Не вдалося створити нову розмову. Спробуй ще раз.";

// Home owns the Home ⇄ Chat switch. An active thread pushes Chat (without animation on
// launch); coming back to Home from Chat starts a new conversation, and the old one stays in
// History.
export const useChatNavigation = (onNewConversation: () => void) => {
  const active = useActiveThread();
  const { newThread } = useChatActions(undefined);
  const focused = useIsFocused();
  const [error, setError] = useState<string | null>(null);
  const wasFocused = useRef(false);
  const chatOpen = useRef(false);
  const launched = useRef(false);
  // The thread just left stays active until `newThread` lands; it must not reopen meanwhile.
  const left = useRef<string | null>(null);
  const leave = useRef(() => {});
  const loaded = active !== undefined;
  const activeId = active?.threadId ?? null;

  useEffect(() => {
    leave.current = () => {
      onNewConversation();

      if (!activeId) return;
      left.current = activeId;
      setError(null);
      newThread().catch(() => setError(newThreadError));
    };
  });

  useEffect(() => {
    const regained = focused && !wasFocused.current;

    wasFocused.current = focused;

    if (!focused || !loaded) return;

    if (regained && chatOpen.current) {
      chatOpen.current = false;
      leave.current();
    }

    if (!activeId) left.current = null;

    if (activeId && activeId !== left.current && !chatOpen.current) {
      chatOpen.current = true;
      router.push(launched.current ? "/chat" : { pathname: "/chat", params: { instant: "1" } });
    }

    launched.current = true;
  }, [focused, loaded, activeId]);

  return { error, clearError: () => setError(null) };
};
