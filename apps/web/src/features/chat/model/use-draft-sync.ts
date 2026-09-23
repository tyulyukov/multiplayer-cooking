import { useCallback, useEffect, useRef, useState } from "react";

import { DRAFT_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";

type RemoteDraft = { text: string; images: readonly { storageId: string; url: string }[] };

const draftKey = (text: string, imageIds: readonly string[]) => {
  return JSON.stringify([text, imageIds]);
};

const draftSaveDelayMs = 500;
const draftRetryDelayMs = 3000;
const emptyDraftKey = draftKey("", []);

// Keeps the composer and the drafts table in step. The server copy wins only while the local
// composer has no edits the server has not seen; a typing user is never overwritten.
// threadId is undefined until the active thread is known; nothing syncs before that.
export const useDraftSync = ({
  threadId,
  remote,
  text,
  imageIds,
  adopt,
  save,
}: {
  threadId: string | null | undefined;
  remote: RemoteDraft | null | undefined;
  text: string;
  imageIds: readonly string[];
  adopt: (draft: RemoteDraft) => void;
  save: (threadId: string | null, text: string, imageIds: readonly string[]) => Promise<boolean>;
}) => {
  // The last draft the server confirmed; null until the current thread's draft has loaded.
  const syncedRef = useRef<string | null>(null);
  const pendingRef = useRef<{ timer: number; run: () => void } | null>(null);
  const scheduleRef = useRef<((target: string | null, delay?: number) => void) | null>(null);
  const hadThreadRef = useRef(false);
  const sendThreadRef = useRef<string | null | undefined>(undefined);
  const createdThreadRef = useRef<string | undefined>(undefined);
  // State, not a ref: the sync effects must run again once a send finishes.
  const [sending, setSending] = useState(false);
  const adoptRef = useRef(adopt);
  const saveRef = useRef(save);
  // The server stores at most DRAFT_MAX_CHARACTERS; compare and save the same clipped text.
  const latest = { threadId, text: text.slice(0, DRAFT_MAX_CHARACTERS), imageIds };
  const latestRef = useRef(latest);
  const localKey = draftKey(latest.text, latest.imageIds);

  useEffect(() => {
    adoptRef.current = adopt;
    saveRef.current = save;
    latestRef.current = latest;
  });

  const cancel = useCallback(() => {
    if (pendingRef.current) {
      window.clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
  }, []);

  // Writes the latest composer state to `target` after `delay`. The state counts as synced only
  // once the server confirms; a refused or failed write is retried while the thread stays open.
  const schedule = useCallback(
    (target: string | null, delay = draftSaveDelayMs) => {
      cancel();
      const { text: draftText, imageIds: draftImageIds } = latestRef.current;

      const run = () => {
        cancel();

        const key = draftKey(draftText, draftImageIds);
        const retry = () => {
          if (latestRef.current.threadId === target && !pendingRef.current) {
            scheduleRef.current?.(target, draftRetryDelayMs);
          }
        };

        saveRef.current(target, draftText, draftImageIds).then((saved) => {
          if (saved && latestRef.current.threadId === target) {
            syncedRef.current = key;
          } else if (!saved) {
            retry();
          }
        }, retry);
      };

      pendingRef.current = { timer: window.setTimeout(run, delay), run };
    },
    [cancel],
  );

  useEffect(() => {
    scheduleRef.current = schedule;
    return () => {
      scheduleRef.current = null;
    };
  }, [schedule]);

  useEffect(() => {
    if (threadId === undefined) {
      return;
    }

    const createdBySend =
      sendThreadRef.current === null &&
      (createdThreadRef.current === undefined || createdThreadRef.current === threadId);

    if (createdBySend) {
      cancel();
    } else {
      pendingRef.current?.run();
    }
    syncedRef.current = null;

    if (createdBySend) {
      syncedRef.current = emptyDraftKey;
      sendThreadRef.current = undefined;
      createdThreadRef.current = undefined;
    } else if (hadThreadRef.current) {
      adoptRef.current({ text: "", images: [] });
    }

    hadThreadRef.current = true;
  }, [threadId, cancel]);

  useEffect(() => {
    if (!remote || threadId === undefined || sending) {
      return;
    }

    const remoteKey = draftKey(
      remote.text,
      remote.images.map((image) => image.storageId),
    );

    // Typed before the draft loaded and nothing is stored: keep the text and save it.
    if (syncedRef.current === null && localKey !== emptyDraftKey && remoteKey === emptyDraftKey) {
      syncedRef.current = remoteKey;
      schedule(threadId);
      return;
    }

    if (syncedRef.current === null || syncedRef.current === localKey) {
      if (remoteKey !== localKey) {
        adoptRef.current(remote);
      }

      syncedRef.current = remoteKey;
    }
  }, [remote, localKey, threadId, sending, schedule]);

  useEffect(() => {
    if (
      threadId === undefined ||
      sending ||
      syncedRef.current === null ||
      (threadId === null && createdThreadRef.current !== undefined)
    ) {
      return;
    }

    if (syncedRef.current === localKey) {
      cancel();
      return;
    }

    schedule(threadId);
  }, [localKey, threadId, sending, cancel, schedule]);

  useEffect(() => {
    // A reload or tab close inside the debounce window must not lose the last keystrokes.
    const flush = () => pendingRef.current?.run();

    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return {
    // No draft writes while a message is in flight: a late save would recreate the sent text.
    beginSend() {
      cancel();
      sendThreadRef.current = threadId;
      createdThreadRef.current = undefined;
      setSending(true);
    },
    // After a send the server has dropped that composer's draft. If the person moved to another
    // thread meanwhile, that thread's draft still has to load, so its synced state stays unset.
    endSend(sentThreadId: string | undefined) {
      if (sentThreadId && sendThreadRef.current === null) {
        createdThreadRef.current = sentThreadId;
      }

      if (
        sentThreadId &&
        (latestRef.current.threadId === sendThreadRef.current ||
          latestRef.current.threadId === sentThreadId)
      ) {
        syncedRef.current = emptyDraftKey;
      }

      if (!sentThreadId) {
        sendThreadRef.current = undefined;
      }

      setSending(false);
    },
  };
};
