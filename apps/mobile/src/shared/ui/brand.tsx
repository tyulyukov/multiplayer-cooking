import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/shared/fonts";

export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.dot} />
      <Text style={styles.name}>Multiplayer Cooking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    boxShadow: `0 0 0 2px ${colors.foreground}`,
  },
  name: {
    color: colors.foreground,
    fontFamily: fonts.sign,
    fontSize: 16,
    letterSpacing: 0.32,
  },
});
