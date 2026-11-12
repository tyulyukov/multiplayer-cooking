import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { entering, exiting, layout } from "@/shared/lib/motion";
import { Text } from "@/shared/ui/text";

export function OfflineBanner({ message }: { message: string }) {
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={entering.morph}
      exiting={exiting.fadeOut}
      layout={layout.morph}
      style={styles.banner}
    >
      <Text variant="tag" color={colors.card} numberOfLines={2} style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.foreground,
  },
  text: { textAlign: "center" },
});
