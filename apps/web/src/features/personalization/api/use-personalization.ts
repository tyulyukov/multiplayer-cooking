import type { SessionId } from "convex-helpers/server/sessions";
import { useMutation, useQuery } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { AgentSettings, Memory } from "@/features/personalization/model/types";

const defaultAgentSettings: AgentSettings = {
  tone: "friendly",
  customInstructions: "",
  about: "",
};

export function usePersonalization(sessionId: SessionId | undefined) {
  const data = useQuery(api.personalization.get, sessionId ? { sessionId } : "skip");
  const removeMemoryMutation = useMutation(api.personalization.removeMemory);
  const saveSettingsMutation = useMutation(api.personalization.saveSettings);

  return {
    memories: data?.memories ?? [],
    settings: data?.settings ?? defaultAgentSettings,
    loading: data === undefined,
    async removeMemory(memoryId: Memory["_id"]) {
      if (!sessionId) return;
      await removeMemoryMutation({ sessionId, memoryId });
    },
    async saveSettings(settings: AgentSettings) {
      if (!sessionId) return;
      await saveSettingsMutation({ sessionId, settings });
    },
  };
}
