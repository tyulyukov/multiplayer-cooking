import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Remove01Icon from "@hugeicons/core-free-icons/Remove01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Pressable, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { fonts } from "@/shared/fonts";
import { Text } from "@/shared/ui/text";

type StepperProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
  disabled?: boolean;
};

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  format = String,
  disabled = false,
}: StepperProps) {
  const change = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));

    if (clamped === value || disabled) return;
    haptics.selection();
    onChange(clamped);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        change(event.nativeEvent.actionName === "increment" ? value + 1 : value - 1)
      }
      style={styles.stepper}
    >
      <StepButton
        icon={Remove01Icon}
        disabled={disabled || value <= min}
        onPress={() => change(value - 1)}
      />
      <Text maxFontSizeMultiplier={1.3} style={styles.value}>
        {format(value)}
      </Text>
      <StepButton
        icon={Add01Icon}
        disabled={disabled || value >= max}
        onPress={() => change(value + 1)}
      />
    </View>
  );
}

type StepButtonProps = { icon: IconSvgElement; disabled: boolean; onPress: () => void };

function StepButton({ icon, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      importantForAccessibility="no"
      accessibilityElementsHidden
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <HugeiconsIcon icon={icon} size={20} color={colors.foreground} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  pressed: { backgroundColor: colors.muted, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  value: {
    minWidth: 44,
    textAlign: "center",
    fontFamily: fonts.signBold,
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ["tabular-nums"],
  },
});
