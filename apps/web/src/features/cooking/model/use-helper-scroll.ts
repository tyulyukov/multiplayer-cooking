import { useEffect, useRef, useState } from "react";
import type { CookingHelperProps } from "./helper-types";

type Props = Pick<CookingHelperProps, "open" | "messages" | "proposals"> & {
  tab: "chat" | "notes";
  chatRequestKey: number;
  mobile: boolean;
  busy: boolean;
};

export const useHelperScroll = ({
  open,
  tab,
  chatRequestKey,
  mobile,
  messages,
  proposals,
  busy,
}: Props) => {
  const previousChatRequest = useRef(chatRequestKey);
  const [nearBottom, setNearBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    const requested = previousChatRequest.current !== chatRequestKey;
    previousChatRequest.current = chatRequestKey;

    const frame = requestAnimationFrame(() => {
      const scroll = scrollRef.current;

      if (scroll && (nearBottom || requested)) scroll.scrollTop = scroll.scrollHeight;

      if (requested) {
        setNearBottom(true);

        if (!mobile) contentRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [open, tab, messages, proposals, busy, nearBottom, chatRequestKey, mobile]);
  useEffect(() => {
    const scroll = scrollRef.current;

    if (!open || tab !== "chat" || !scroll) return;

    const observer = new ResizeObserver(() => {
      if (nearBottom) scroll.scrollTop = scroll.scrollHeight;
    });

    observer.observe(scroll);

    return () => observer.disconnect();
  }, [open, tab, nearBottom]);
  useEffect(() => {
    if (!open || !mobile || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const content = contentRef.current;

    const update = () => {
      const content = contentRef.current;
      content?.style.setProperty("--helper-viewport-height", `${viewport.height}px`);
      content?.style.setProperty("--helper-viewport-top", `${viewport.offsetTop}px`);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      content?.style.removeProperty("--helper-viewport-height");
      content?.style.removeProperty("--helper-viewport-top");
    };
  }, [open, mobile]);

  const scrollToLatest = () => {
    const scroll = scrollRef.current;

    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    setNearBottom(true);
  };

  return { nearBottom, setNearBottom, scrollRef, contentRef, scrollToLatest };
};
