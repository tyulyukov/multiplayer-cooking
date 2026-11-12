import type { UIMessage } from "@convex-dev/agent";
import { useEffect, useRef } from "react";

import {
  markdownBlocks,
  splitBufferedText,
} from "@multiplayer-cooking/core/chat/split-buffered-text";
import { haptics } from "@/shared/lib/haptics";

const blockHapticIntervalMs = 320;

const streamingAssistant = (messages: readonly UIMessage[]) => {
  const last = messages.at(-1);

  if (last?.role !== "assistant" || last.status !== "streaming") return null;

  return { key: last.key, blocks: markdownBlocks(splitBufferedText(last.text).ready).length };
};

// Selection ticks when a reply starts streaming and as new paragraphs appear (at most one per
// 320ms), and Success once when a new idea version arrives. The first data a thread loads with
// is hydration, not news, so it never buzzes.
export const useChatHaptics = (
  threadId: string | undefined,
  messages: readonly UIMessage[],
  loaded: boolean,
  latestIdeaId: string | null | undefined,
) => {
  const hydratedThread = useRef<string | undefined>(undefined);
  const stream = useRef<{ key: string; blocks: number } | null>(null);
  const lastTickAt = useRef(0);
  const ideaThread = useRef<string | undefined>(undefined);
  const ideaId = useRef<string | null>(null);
  const current = streamingAssistant(messages);
  const streamKey = current?.key ?? null;
  const blocks = current?.blocks ?? 0;

  useEffect(() => {
    if (!loaded || !threadId) return;
    const next = streamKey === null ? null : { key: streamKey, blocks };
    const previous = stream.current;

    stream.current = next;

    if (hydratedThread.current !== threadId) {
      hydratedThread.current = threadId;

      return;
    }

    if (!next) return;

    const started = previous?.key !== next.key;
    const grew = !started && next.blocks > (previous?.blocks ?? 0);
    const now = Date.now();

    if (started || (grew && now - lastTickAt.current >= blockHapticIntervalMs)) {
      lastTickAt.current = now;
      haptics.selection();
    }
  }, [threadId, loaded, streamKey, blocks]);

  useEffect(() => {
    if (latestIdeaId === undefined || !threadId) return;

    if (ideaThread.current === threadId && latestIdeaId && latestIdeaId !== ideaId.current) {
      haptics.success();
    }

    ideaThread.current = threadId;
    ideaId.current = latestIdeaId;
  }, [threadId, latestIdeaId]);
};
