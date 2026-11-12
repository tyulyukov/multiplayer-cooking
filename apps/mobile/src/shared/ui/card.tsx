import { colors, radii } from "@multiplayer-cooking/theme";
import { Pressable, StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { pressTo } from "@/shared/lib/motion";

type CardProps = ViewProps & {
  active?: boolean;
  done?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({ active, done, onPress, style, children, ...props }: CardProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const cardStyle = [styles.card, active && styles.active, done && styles.done, style];

  if (!onPress) {
    return (
      <View {...props} style={cardStyle}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        {...props}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          scale.set(pressTo(true));
        }}
        onPressOut={() => {
          scale.set(pressTo(false));
        }}
        style={cardStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  active: { borderColor: colors.foreground },
  done: { opacity: 0.5 },
});
