import { colors } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Text } from "@/shared/ui/text";

import { useHelperChat } from "../model/use-helper-chat";
import { HelperChat } from "./helper-chat";
import { HelperNotes } from "./helper-notes";
import { SelectMenu } from "./tools-select";

type HelperSheetProps = { prompt?: string; stepKey?: string };

export function HelperSheet({ prompt, stepKey }: HelperSheetProps) {
  const model = useHelperChat({ prompt, stepKey });
  const [tab, setTab] = useState<"chat" | "notes">("chat");
  const notesCount = model.notes.length;

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Помічник">
        <View style={styles.tabs}>
          <SegmentedControl
            values={["Чат", notesCount ? `Нотатки (${notesCount})` : "Нотатки"]}
            selectedIndex={tab === "chat" ? 0 : 1}
            onChange={(index) => setTab(index === 0 ? "chat" : "notes")}
            style={styles.segmented}
          />
          <Text variant="meta" color={colors.mutedForeground}>
            Для всіх на кухні
          </Text>
        </View>
        {tab === "chat" && model.steps.length > 0 ? (
          <SelectMenu
            label="Про що говоримо"
            inline
            value={model.context?.id ?? ""}
            options={[
              { value: "", label: "Уся страва" },
              ...model.steps.map((step, index) => ({
                value: step.id,
                label: `${index + 1}. ${step.title}`,
              })),
            ]}
            onChange={model.selectStep}
          />
        ) : null}
      </SheetHeader>
      {tab === "chat" ? <HelperChat model={model} /> : <HelperNotes model={model} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: "row", alignItems: "center", gap: 12 },
  segmented: { flex: 1 },
});
