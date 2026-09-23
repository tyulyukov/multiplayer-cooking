import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Idea, IdeaVersions } from "@/features/ideas/model/types";

export const useIdeaVersions = (
  sessionId: SessionId | undefined,
  threadId: string | null,
  latest: Idea | null | undefined,
) => {
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const list = useQuery(api.ideas.listForThread, threadArgs) ?? [];
  const restore = useMutation(api.ideas.restore);
  const [selectedId, setSelectedId] = useState<Idea["_id"] | null>(null);
  const latestId = list.at(-1)?._id ?? null;
  const previousLatestId = useRef(latestId);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const selectedIndex = list.findIndex((idea) => idea._id === selectedId);
  const index = selectedIndex === -1 ? list.length - 1 : selectedIndex;
  const idea = index >= 0 ? list[index] : latest;

  useEffect(() => {
    if (previousLatestId.current && latestId && previousLatestId.current !== latestId) {
      setSelectedId(null);
    }
    previousLatestId.current = latestId;
  }, [latestId]);

  const restoreSelected = async () => {
    const target = idea;

    if (!sessionId || !target || restoring) {
      return;
    }

    setRestoring(true);
    setRestoreError(null);

    try {
      await restore({ sessionId, ideaId: target._id });
      setSelectedId(null);
    } catch {
      setRestoreError("Не вдалося повернути цю версію. Спробуй ще раз.");
    } finally {
      setRestoring(false);
    }
  };

  const versions: IdeaVersions = {
    index: Math.max(index, 0),
    count: list.length,
    onSelect: (next) => setSelectedId(list[next]?._id ?? null),
    onRestore: () => void restoreSelected(),
    restoring,
    restoreError,
  };

  return { idea, ideas: list, versions, reset: () => setSelectedId(null), select: setSelectedId };
};
