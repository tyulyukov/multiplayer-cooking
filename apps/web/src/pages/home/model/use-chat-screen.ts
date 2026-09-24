import { useState } from "react";

import { pendingQuestion } from "@/features/chat/lib/question-messages";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

import type { ChatScreenProps } from "./chat-screen-types";

export function useChatScreen({
  messages,
  idea,
  ideas,
  connection,
  working,
}: Pick<ChatScreenProps, "messages" | "idea" | "ideas" | "connection" | "working">) {
  const question = pendingQuestion(messages);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const visibleIdea = idea;
  const showIdea = Boolean(visibleIdea) && !hidden;
  const latestMessage = messages.at(-1);

  const responseComplete =
    latestMessage?.role === "assistant" && latestMessage.status === "success";

  const showAddressPrompt =
    Boolean(idea) &&
    !connection.hasCart &&
    (connection.cartPending ||
      Boolean(connection.cartError) ||
      (!working && responseComplete && idea?.productsStatus === "needs_address"));

  const compactIdea = ideas.at(-1) ?? idea;

  return {
    question,
    hidden,
    setHidden,
    mobileOpen,
    setMobileOpen,
    desktop,
    visibleIdea,
    showIdea,
    showAddressPrompt,
    compactIdea,
  };
}
