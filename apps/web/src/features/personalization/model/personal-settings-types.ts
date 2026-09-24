import type { AgentSettings, Memory } from "@/features/personalization/model/types";

export type Tab = "memories" | "settings" | "interface";

export type PersonalSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: Tab;
  memories: Memory[];
  settings: AgentSettings;
  onDelete: (id: Memory["_id"]) => Promise<void>;
  onSave: (settings: AgentSettings) => Promise<void>;
  loading?: boolean;
};
