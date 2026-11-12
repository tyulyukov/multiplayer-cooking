import { colors, radii } from "@multiplayer-cooking/theme";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { GlassSurface } from "@/shared/ui/glass-surface";

type CloseButtonProps = { onPress: () => void; label?: string; size?: number; onDark?: boolean };

export function CloseButton({
  onPress,
  label = "Закрити",
  size = 30,
  onDark = false,
}: CloseButtonProps) {
  const slop = Math.max(0, (44 - size) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={slop}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassSurface
        interactive
        dark={onDark}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <SymbolView
          name="xmark"
          size={size * 0.43}
          weight="semibold"
          tintColor={onDark ? colors.card : colors.foreground}
        />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", borderRadius: radii.full },
  pressed: { opacity: 0.7 },
});
