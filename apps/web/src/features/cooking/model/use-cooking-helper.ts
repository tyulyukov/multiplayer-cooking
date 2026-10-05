import { useHelperScroll } from "./use-helper-scroll";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

import type { CookingHelperProps } from "../model/helper-types";

export const useCookingHelper = ({
  plan,
  contextStepKey,
  chatRequestKey = 0,
  messages,
  proposals,
  helperBusy,
  open,
  prompt,
  onPromptChange,
  online,
  finished,
  attachments,
  onAsk,
  onNote,
  onDeleteNote,
}: CookingHelperProps) => {
  const mobile = useMediaQuery("(max-width: 639px)");

  const [tabSelection, setTabSelection] = useState<{ requestKey: number; tab: "chat" | "notes" }>({
    requestKey: chatRequestKey,
    tab: "chat",
  });

  const tab = tabSelection.requestKey === chatRequestKey ? tabSelection.tab : "chat";
  const setTab = (tab: "chat" | "notes") => setTabSelection({ requestKey: chatRequestKey, tab });
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const [seenAt, setSeenAt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentPrompt = useRef(prompt);
  const currentNote = useRef(note);

  const latestReplyAt = Math.max(
    0,
    ...messages.filter((item) => item.role === "assistant").map((item) => item.createdAt),
    ...proposals.map((item) => item.createdAt),
  );

  const unread = latestReplyAt > seenAt;
  const busy = helperBusy || pending;

  const { nearBottom, setNearBottom, scrollRef, contentRef, scrollToLatest } = useHelperScroll({
    open,
    tab,
    chatRequestKey,
    mobile,
    messages,
    proposals,
    busy,
  });

  const disabled = !online || pending;
  const context = plan.steps.find((step) => step.id === contextStepKey);
  const attachmentError = attachments.items.some((item) => item.state === "error");
  const uploading = attachments.items.some((item) => item.state === "uploading");

  const entries = [
    ...messages.map((message) => ({
      kind: "message" as const,
      createdAt: message.createdAt,
      value: message,
    })),
    ...proposals.map((proposal) => ({
      kind: "proposal" as const,
      createdAt: proposal.createdAt,
      value: proposal,
    })),
  ].sort((left, right) => left.createdAt - right.createdAt);

  useEffect(() => {
    currentPrompt.current = prompt;
  }, [prompt]);
  useEffect(() => {
    currentNote.current = note;
  }, [note]);

  const run = async <T>(call: () => Promise<T>, failure: string) => {
    if (pendingRef.current || !online) return false;
    pendingRef.current = true;
    setPending(true);
    setError(undefined);

    try {
      const result = await call();

      if (result === false || result === null) throw new Error(failure);

      return true;
    } catch {
      setError(failure);

      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const send = async (text: string) => {
    if (helperBusy || finished || uploading || attachmentError) return;
    scrollToLatest();

    if (await run(() => onAsk(text), "Не вдалося надіслати повідомлення. Спробуй ще раз.")) {
      if (currentPrompt.current.trim() === text) onPromptChange("");
      attachments.clear();
    }
  };

  const saveNote = async () => {
    const text = note.trim();

    if (!text) return;
    const ok = await run(() => onNote(text), "Не вдалося зберегти нотатку. Спробуй ще раз.");

    if (ok && currentNote.current.trim() === text) setNote("");
  };

  const deleteNote = (id: Parameters<CookingHelperProps["onDeleteNote"]>[0]) => {
    return run(() => onDeleteNote(id), "Не вдалося прибрати нотатку. Спробуй ще раз.");
  };

  return {
    mobile,
    tab,
    setTab,
    note,
    setNote,
    pending,
    error,
    nearBottom,
    setNearBottom,
    setSeenAt,
    scrollRef,
    contentRef,
    closeRef,
    saveNote,
    deleteNote,
    latestReplyAt,
    unread,
    busy,
    disabled,
    context,
    attachmentError,
    uploading,
    entries,
    scrollToLatest,
    run,
    send,
  };
};
