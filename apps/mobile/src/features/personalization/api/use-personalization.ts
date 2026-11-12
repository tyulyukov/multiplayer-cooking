import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { AgentSettings, Memory } from "@multiplayer-cooking/core/personalization/types";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";

const defaultAgentSettings: AgentSettings = { tone: "friendly", customInstructions: "", about: "" };

export const usePersonalization = () => {
  const [sessionId] = useSessionId();
  const data = useQuery(api.personalization.get, sessionId ? { sessionId } : "skip");
  const removeMemoryMutation = useMutation(api.personalization.removeMemory);
  const saveSettingsMutation = useMutation(api.personalization.saveSettings);

  return {
    memories: data?.memories ?? [],
    settings: data?.settings ?? defaultAgentSettings,
    loading: data === undefined,
    async removeMemory(memoryId: Memory["_id"]) {
      if (sessionId) await removeMemoryMutation({ sessionId, memoryId });
    },
    async saveSettings(settings: AgentSettings) {
      if (sessionId) await saveSettingsMutation({ sessionId, settings });
    },
  };
};
