import { useLocalSearchParams } from "expo-router";

import { SettingsSheet } from "@/features/personalization/ui/settings-sheet";

export default function SettingsRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  return <SettingsSheet initialTab={tab === "memories" ? "memories" : "agent"} />;
}
