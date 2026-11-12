import { normalizeCookName } from "@multiplayer-cooking/core/cooking/cook-name";
import type { Memory } from "@multiplayer-cooking/core/personalization/types";
import { colors } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePersonalization } from "@/features/personalization/api/use-personalization";
import { useAgentSettings } from "@/features/personalization/model/use-agent-settings";
import type { SaveState } from "@/features/personalization/model/use-agent-settings";
import { AccountRows } from "@/features/personalization/ui/account-rows";
import { AgentSettingsForm } from "@/features/personalization/ui/agent-settings-form";
import { MemoriesList } from "@/features/personalization/ui/memories-list";
import { useOnline } from "@/shared/hooks/use-online";
import { clearSavedCookName, readSavedCookName, saveCookName } from "@/shared/lib/storage";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Text } from "@/shared/ui/text";

export type SettingsTab = "memories" | "agent";

const tabs: SettingsTab[] = ["memories", "agent"];

const titles: Record<SettingsTab, string> = {
  memories: "Що агент пам'ятає про тебе",
  agent: "Як агент говорить з тобою",
};

export function SettingsSheet({ initialTab }: { initialTab: SettingsTab }) {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const personal = usePersonalization();
  const [tab, setTab] = useState(initialTab);
  const [cookName, setCookName] = useState(readSavedCookName);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const agent = useAgentSettings({
    settings: personal.settings,
    loading: personal.loading,
    onSave: personal.saveSettings,
  });

  const changeCookName = (value: string) => {
    setCookName(value);
    const name = normalizeCookName(value);

    if (name) saveCookName(name);
    else if (!value.trim()) clearSavedCookName();
  };

  const deleteMemory = async (id: Memory["_id"]) => {
    setDeletingId(id);
    setDeleteError(null);

    try {
      await personal.removeMemory(id);

      return true;
    } catch {
      setDeleteError("Не вдалося видалити спогад. Спробуй ще раз.");

      return false;
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.sheet}>
      <SheetHeader title={titles[tab]}>
        <SegmentedControl
          values={["Спогади", "Агент"]}
          selectedIndex={tabs.indexOf(tab)}
          onChange={(index) => setTab(tabs[index] ?? "memories")}
        />
      </SheetHeader>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <AccountRows />
        {tab === "memories" ? (
          <MemoriesList
            memories={personal.memories}
            loading={personal.loading}
            deletingId={deletingId}
            error={deleteError}
            onDelete={deleteMemory}
          />
        ) : (
          <>
            <AgentSettingsForm
              cookName={cookName}
              onCookName={changeCookName}
              draft={agent.draft}
              onChange={agent.change}
              loading={personal.loading}
            />
            <SaveStatus
              state={agent.saveState}
              error={agent.saveError}
              online={online}
              onRetry={agent.retry}
            />
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

type SaveStatusProps = {
  state: SaveState;
  error: string | null;
  online: boolean;
  onRetry: () => void;
};

function SaveStatus({ state, error, online, onRetry }: SaveStatusProps) {
  if (state === "error" && error) {
    return <InlineAlert message={error} onRetry={onRetry} retryLabel="Повторити" />;
  }

  if (state === "saving") {
    return online ? (
      <ShimmerText text="Зберігаємо…" />
    ) : (
      <Text variant="meta" color={colors.mutedForeground}>
        Збережемо після підключення.
      </Text>
    );
  }

  return (
    <Text variant="meta" color={colors.mutedForeground} accessibilityLiveRegion="polite">
      {state === "saved" ? "Збережено" : "Зміни зберігаються автоматично"}
    </Text>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
});
