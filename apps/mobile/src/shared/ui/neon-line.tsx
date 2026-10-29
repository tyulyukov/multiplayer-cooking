import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

// 2pt neon tube; the glow is a wider line behind it at 25% opacity.
export function NeonLine({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible={false} style={[styles.line, style]}>
      <View style={styles.glow} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { height: 2, backgroundColor: colors.neonBlue, zIndex: 1 },
  glow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -2,
    height: 6,
    backgroundColor: colors.neonBlue,
    opacity: 0.25,
  },
});
