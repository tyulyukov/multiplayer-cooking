import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Idea, IdeaVersions } from "@multiplayer-cooking/core/ideas/types";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

export const useIdeas = (threadId: string, initialIdeaId: string | undefined) => {
  const [sessionId] = useSessionId();
  const threadArgs = sessionId ? { sessionId, threadId } : ("skip" as const);
  const latest = useQuery(api.ideas.latest, threadArgs);
  const versionList = useQuery(api.ideas.listForThread, threadArgs);
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const restore = useMutation(api.ideas.restore);
  const addToCartMutation = useMutation(api.ideas.addToCart);
  const list = versionList ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(initialIdeaId ?? null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const latestId = list.at(-1)?._id ?? null;
  const previousLatestId = useRef(latestId);
  const selectedIndex = list.findIndex((idea) => idea._id === selectedId);
  const index = selectedIndex === -1 ? list.length - 1 : selectedIndex;
  const idea: Idea | null | undefined = index >= 0 ? list[index] : latest;

  useEffect(() => {
    if (previousLatestId.current && latestId && previousLatestId.current !== latestId) {
      setSelectedId(null);
    }

    previousLatestId.current = latestId;
  }, [latestId]);

  const restoreSelected = async () => {
    if (!sessionId || !idea || restoring) return;
    setRestoring(true);
    setRestoreError(null);

    try {
      await restore({ sessionId, ideaId: idea._id });
      setSelectedId(null);
    } catch {
      setRestoreError("Не вдалося повернути цю версію. Спробуй ще раз.");
    } finally {
      setRestoring(false);
    }
  };

  const addToCart = async () => {
    if (!sessionId || !idea) return;
    setCartError(null);

    try {
      const result = await addToCartMutation({ sessionId, ideaId: idea._id });

      if (!result.ok) setCartError(result.message);
    } catch {
      setCartError("Не вдалося додати в кошик. Спробуй ще раз.");
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

  return {
    idea,
    versions,
    canAddToCart: connection?.hasCart === true,
    cartError,
    addToCart: () => void addToCart(),
  };
};
