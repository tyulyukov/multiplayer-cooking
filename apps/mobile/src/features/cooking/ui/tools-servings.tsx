import { colors } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/shared/ui/button";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Stepper } from "@/shared/ui/stepper";
import { Text } from "@/shared/ui/text";

import { pluralize } from "../lib/session-view";
import { useRoomData } from "../model/room-context";
import { useDismissThen } from "../model/use-dismiss-then";

export function ToolsServings() {
  const { read, actions } = useRoomData();
  const dismissThen = useDismissThen();
  const [servings, setServings] = useState(read.room.requestedServings);
  const disabled = !actions.online || actions.busy || read.room.state === "done";

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Порції" />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="secondary" style={styles.label}>
            Нова кількість порцій
          </Text>
          <Stepper
            value={servings}
            min={1}
            max={24}
            onChange={setServings}
            label="Нова кількість порцій"
            format={String}
          />
        </View>
        <Text color={colors.mutedForeground}>
          Помічник запропонує зміни з урахуванням уже виконаної роботи. Переглянь їх перед
          підтвердженням.
        </Text>
        <Button
          variant="lime"
          label="Переглянути зміну порцій"
          accessibilityHint={`Відкриває помічника з запитом на ${pluralize(servings, "порцію", "порції", "порцій")}`}
          disabled={disabled}
          onPress={() =>
            dismissThen(() =>
              actions.ask(
                `Запропонуй зміну на ${servings} порцій. Урахуй уже використані продукти.`,
              ),
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 16 },
  body: { gap: 16, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { flex: 1 },
});
