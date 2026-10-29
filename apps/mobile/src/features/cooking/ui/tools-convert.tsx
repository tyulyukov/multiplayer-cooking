import {
  convertCookingQuantity,
  cookingUnits,
  isCookingUnit,
  parseCookingQuantity,
} from "@multiplayer-cooking/core/cooking/cooking-units";
import type { CookingUnit } from "@multiplayer-cooking/core/cooking/cooking-units";
import { colors } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { NeonLine } from "@/shared/ui/neon-line";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Text } from "@/shared/ui/text";

import { ToolsField } from "./tools-field";
import { SelectMenu } from "./tools-select";

const quantity = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 3 });

const unitOptions = Object.entries(cookingUnits).map(([value, unit]) => ({
  value,
  label: unit.label,
}));

export function ToolsConvert() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<CookingUnit>("g");
  const [to, setTo] = useState<CookingUnit>("oz");
  const value = parseCookingQuantity(amount);
  const result = value === null ? null : convertCookingQuantity(value, from, to);

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Конвертер" />
      <View style={styles.form}>
        <ToolsField
          label="Кількість"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <View style={styles.units}>
          <SelectMenu
            label="З"
            value={from}
            options={unitOptions}
            onChange={(unit) => {
              if (isCookingUnit(unit)) setFrom(unit);
            }}
            style={styles.unit}
          />
          <SelectMenu
            label="У"
            value={to}
            options={unitOptions}
            onChange={(unit) => {
              if (isCookingUnit(unit)) setTo(unit);
            }}
            style={styles.unit}
          />
        </View>
        <NeonLine />
        <Text
          accessibilityLiveRegion="polite"
          variant={result === null ? "body" : "title"}
          color={result === null ? colors.mutedForeground : colors.foreground}
        >
          {result === null
            ? "Введи кількість та обери сумісні одиниці."
            : `${quantity.format(result)} ${cookingUnits[to].label}`}
        </Text>
        <Text variant="meta" color={colors.mutedForeground}>
          Об’єм у масу залежить від інгредієнта. Для такої заміни запитай помічника.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 16 },
  form: { gap: 16, paddingHorizontal: 16 },
  units: { flexDirection: "row", gap: 12 },
  unit: { flex: 1 },
});
