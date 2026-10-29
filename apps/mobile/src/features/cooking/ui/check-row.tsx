import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { haptics } from "@/shared/lib/haptics";
import { durations, easings } from "@/shared/lib/motion";
import { Text } from "@/shared/ui/text";

type CheckRowProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

// A 48pt row that toggles as a whole; the tick grows in from 0.6.
export function CheckRow({ label, checked, disabled = false, onChange }: CheckRowProps) {
  const scale = useSharedValue(checked ? 1 : 0.6);
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  useEffect(() => {
    scale.set(
      checked
        ? withTiming(1, {
            duration: durations.disclosure,
            easing: easings.disclosure,
            reduceMotion: ReduceMotion.System,
          })
        : 0.6,
    );
  }, [checked, scale]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.selection();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <Animated.View style={tickStyle}>
            <HugeiconsIcon
              icon={Tick02Icon}
              size={16}
              color={colors.foreground}
              strokeWidth={2.5}
            />
          </Animated.View>
        ) : null}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pressed: { backgroundColor: colors.muted },
  disabled: { opacity: 0.5 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.teal },
  label: { flex: 1 },
  labelChecked: { color: colors.mutedForeground },
});
