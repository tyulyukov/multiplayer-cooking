import { colors, radii } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { durations } from "@/shared/lib/motion";

type SkeletonProps = {
  width?: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height, radius = radii.card, style }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    if (reducedMotion) {
      opacity.set(1);

      return;
    }

    opacity.set(
      withRepeat(
        withTiming(0.6, { duration: durations.skeleton, reduceMotion: ReduceMotion.System }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );

    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.muted }, pulse, style]}
    />
  );
}
