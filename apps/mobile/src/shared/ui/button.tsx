import type { IconSvgElement } from "@hugeicons/react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { haptics } from "@/shared/lib/haptics";
import type { HapticKind } from "@/shared/lib/haptics";
import { pressTo } from "@/shared/lib/motion";
import { Text } from "@/shared/ui/text";

export type ButtonVariant = "lime" | "ghost" | "ghostOnInk" | "tag" | "danger" | "text";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  icon?: IconSvgElement;
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  haptic?: HapticKind;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "ghost",
  compact = false,
  icon,
  trailing,
  selected = false,
  disabled = false,
  busy = false,
  busyLabel,
  haptic,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const tone = tones[variant];
  const textColor = selected ? colors.card : tone.text;
  const iconColor = selected ? colors.primary : tone.icon;
  const inactive = disabled || busy;

  return (
    <Animated.View style={[pressStyle, inactive && styles.disabled, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: inactive,
          busy,
          selected: variant === "tag" ? selected : undefined,
        }}
        disabled={inactive}
        hitSlop={variant === "tag" || compact ? 4 : undefined}
        onPressIn={() => {
          scale.set(pressTo(true));
        }}
        onPressOut={() => {
          scale.set(pressTo(false));
        }}
        onPress={() => {
          if (haptic) haptics[haptic]();
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.base,
          sizes[variant],
          compact && styles.compact,
          tone.surface,
          selected && styles.selected,
          pressed && variant === "lime" && styles.limePressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={textColor} style={styles.spinner} />
        ) : icon ? (
          <HugeiconsIcon
            icon={icon}
            size={variant === "tag" ? 18 : 20}
            color={iconColor}
            strokeWidth={1.5}
          />
        ) : null}
        <Text
          variant={variant === "lime" ? "button" : variant === "tag" ? "tag" : "secondary"}
          color={textColor}
          numberOfLines={2}
          style={styles.label}
        >
          {busy && busyLabel ? busyLabel : label}
        </Text>
        {trailing ? <View>{trailing}</View> : null}
      </Pressable>
    </Animated.View>
  );
}

const limeShade = "inset 0 -3px 0 rgba(0, 0, 0, 0.15)";

const tones = {
  lime: {
    surface: {
      backgroundColor: colors.primary,
      borderColor: colors.foreground,
      borderWidth: 2,
      boxShadow: limeShade,
    },
    text: colors.primaryForeground,
    icon: colors.primaryForeground,
  },
  ghost: {
    surface: { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 },
    text: colors.foreground,
    icon: colors.tealDeep,
  },
  ghostOnInk: {
    surface: { backgroundColor: "transparent", borderColor: colors.card, borderWidth: 2 },
    text: colors.card,
    icon: colors.primary,
  },
  tag: {
    surface: { backgroundColor: colors.card, borderColor: colors.foreground, borderWidth: 2 },
    text: colors.foreground,
    icon: colors.tealDeep,
  },
  danger: {
    surface: {
      backgroundColor: colors.card,
      borderColor: `${colors.destructive}4d`,
      borderWidth: 2,
    },
    text: colors.destructive,
    icon: colors.destructive,
  },
  text: {
    surface: { backgroundColor: "transparent" },
    text: colors.foreground,
    icon: colors.tealDeep,
  },
} satisfies Record<ButtonVariant, { surface: ViewStyle; text: string; icon: string }>;

const sizes = StyleSheet.create({
  lime: { minHeight: 52, paddingHorizontal: 20, borderRadius: radii.button },
  ghost: { minHeight: 48, paddingHorizontal: 16, borderRadius: radii.button },
  ghostOnInk: { minHeight: 44, paddingHorizontal: 14, borderRadius: radii.button },
  tag: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10 },
  danger: { minHeight: 48, paddingHorizontal: 16, borderRadius: radii.button },
  text: { minHeight: 44, paddingHorizontal: 12, borderRadius: radii.button },
});

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  compact: { minHeight: 40, paddingHorizontal: 12 },
  selected: { backgroundColor: colors.foreground },
  limePressed: { boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.15)" },
  disabled: { opacity: 0.4 },
  spinner: { width: 16, height: 16, transform: [{ scale: 0.8 }] },
  label: { flexShrink: 1, textAlign: "center" },
});
