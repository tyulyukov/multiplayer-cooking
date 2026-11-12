import { MenuView } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Text } from "@/shared/ui/text";

type SelectOption = Readonly<{ value: string; label: string }>;

type SelectMenuProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A labelled ink tag that opens a native pull-down menu with a checkmark on the current value.
export function SelectMenu({
  label,
  value,
  options,
  onChange,
  disabled = false,
  inline = false,
  style,
}: SelectMenuProps) {
  const current = options.find((option) => option.value === value)?.label ?? "";

  const trigger = (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${current}`}
      accessibilityState={{ disabled }}
      style={[styles.tag, disabled && styles.disabled]}
    >
      <Text variant="tag" numberOfLines={1} style={styles.value}>
        {current}
      </Text>
      <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.tealDeep} strokeWidth={1.5} />
    </View>
  );

  return (
    <View style={[inline ? styles.inline : styles.field, style]}>
      <Text variant="label" color={colors.mutedForeground} style={inline && styles.inlineLabel}>
        {label}
      </Text>
      {disabled ? (
        trigger
      ) : (
        <MenuView
          title={label}
          style={inline ? styles.inlineMenu : undefined}
          actions={options.map((option) => ({
            id: option.value || "__all",
            title: option.label,
            state: option.value === value ? "on" : "off",
          }))}
          onPressAction={({ nativeEvent }) =>
            onChange(nativeEvent.event === "__all" ? "" : nativeEvent.event)
          }
        >
          {trigger}
        </MenuView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, alignItems: "flex-start" },
  inline: { flexDirection: "row", alignItems: "center", gap: 10 },
  tag: {
    minHeight: 44,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  value: { flexShrink: 1 },
  inlineLabel: { flexShrink: 0 },
  inlineMenu: { flexShrink: 1 },
  disabled: { opacity: 0.4 },
});
