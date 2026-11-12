import { colors } from "@multiplayer-cooking/theme";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { timeTo } from "@/shared/lib/motion";
import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { maxFontScale, textVariants } from "@/shared/lib/type-scale";
import { Text } from "@/shared/ui/text";

const inkMeta = "#d4dae0";

const limeGlow = `${colors.primary}99`;

type BlackBoxProps = {
  label: string;
  value: string;
  meta?: string;
  paused?: boolean;
  valueLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BlackBox({
  label,
  value,
  meta,
  paused = false,
  valueLabel,
  children,
  style,
}: BlackBoxProps) {
  const pausedProgress = useSharedValue(paused ? 1 : 0);

  const numeralStyle = useAnimatedStyle(() => ({
    color: interpolateColor(pausedProgress.get(), [0, 1], [colors.primary, inkMeta]),
    textShadowColor: interpolateColor(pausedProgress.get(), [0, 1], [limeGlow, "transparent"]),
  }));

  useEffect(() => {
    pausedProgress.set(timeTo(paused ? 1 : 0, "fadeIn"));
  }, [paused, pausedProgress]);

  return (
    <ChromeFrame radius={22} fill="ink" style={style} contentStyle={styles.content}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="secondary" color={colors.card} numberOfLines={2}>
            {label}
          </Text>
          {meta ? (
            <Text variant="meta" color={inkMeta} numberOfLines={2}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Animated.Text
          accessibilityLabel={valueLabel}
          maxFontSizeMultiplier={maxFontScale.numeral}
          style={[textVariants.numeral, styles.numeral, numeralStyle]}
        >
          {value}
        </Animated.Text>
      </View>
      {children ? <View style={styles.controls}>{children}</View> : null}
    </ChromeFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  text: { flex: 1, gap: 2 },
  numeral: {
    padding: 10,
    margin: -10,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
