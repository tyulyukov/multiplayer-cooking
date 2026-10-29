import { MaskedView } from "@expo/ui/community/masked-view";
import { colors } from "@multiplayer-cooking/theme";
import { useIsFocused } from "expo-router";
import { useEffect, useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useAppActive } from "@/shared/hooks/use-app-active";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { durations } from "@/shared/lib/motion";
import { Text } from "@/shared/ui/text";

const sweepWidth = 72;

const gradientStops = [
  [0, 0],
  [0.15, 0.12],
  [0.35, 0.55],
  [0.5, 1],
  [0.65, 0.55],
  [0.85, 0.12],
  [1, 0],
] as const;

type ShimmerTextProps = { text: string; style?: StyleProp<ViewStyle> };

// A status line with a highlight sweeping across it; static under Reduce Motion, in the
// background and when its screen is not focused.
export function ShimmerText({ text, style }: ShimmerTextProps) {
  const [width, setWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const appActive = useAppActive();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const gradientId = `shimmer-${useId().replaceAll(":", "")}`;
  const contentWidth = Math.min(width, Math.ceil(textWidth));
  const running = contentWidth > 0 && appActive && focused && !reducedMotion;

  useEffect(() => {
    cancelAnimation(progress);
    progress.set(0);

    if (!running) return;

    progress.set(
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: durations.shimmerSweep,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.Never,
          }),
          withDelay(
            durations.shimmerPause,
            withTiming(0, { duration: 0, reduceMotion: ReduceMotion.Never }),
          ),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.Never,
      ),
    );

    return () => cancelAnimation(progress);
  }, [progress, running]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -sweepWidth + progress.get() * (contentWidth + sweepWidth) }],
  }));

  const counterSweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepWidth - progress.get() * (contentWidth + sweepWidth) }],
  }));

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[styles.line, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Text
        variant="meta"
        color={colors.mutedForeground}
        numberOfLines={1}
        onTextLayout={(event) => setTextWidth(event.nativeEvent.lines[0]?.width ?? 0)}
      >
        {text}
      </Text>
      {running ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.sweep, sweepStyle]}
        >
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                    {gradientStops.map(([offset, opacity]) => (
                      <Stop key={offset} offset={offset} stopColor="white" stopOpacity={opacity} />
                    ))}
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
              </Svg>
            }
          >
            <Animated.View style={[{ width }, counterSweepStyle]}>
              <Text variant="meta" numberOfLines={1}>
                {text}
              </Text>
            </Animated.View>
          </MaskedView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { overflow: "hidden", alignSelf: "stretch" },
  sweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: sweepWidth,
    overflow: "hidden",
  },
});
