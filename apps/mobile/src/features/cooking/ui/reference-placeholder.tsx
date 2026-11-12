import { MaskedView } from "@expo/ui/community/masked-view";
import { colors } from "@multiplayer-cooking/theme";
import { useIsFocused } from "expo-router";
import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

import { useAppActive } from "@/shared/hooks/use-app-active";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";

const driftMs = 3600;

// Native take on the web dither canvas: an ink dot grid on cream with a soft dense spot that
// drifts while the model draws, and holds still while a stored image downloads.
export function ReferencePlaceholder({ animate }: { animate: boolean }) {
  const id = useId().replaceAll(":", "");
  const appActive = useAppActive();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const running = animate && appActive && focused && !reducedMotion;

  useEffect(() => {
    cancelAnimation(drift);

    if (!running) return;

    drift.set(
      withRepeat(
        withTiming(1, {
          duration: driftMs,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      ),
    );

    return () => cancelAnimation(drift);
  }, [drift, running]);

  const spotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${-20 + drift.get() * 40}%` },
      { translateY: `${10 - drift.get() * 20}%` },
    ],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${20 - drift.get() * 40}%` },
      { translateY: `${-10 + drift.get() * 20}%` },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} accessible={false}>
      <DotGrid id={`${id}-base`} radius={0.8} opacity={0.2} />
      <Animated.View style={[StyleSheet.absoluteFill, spotStyle]}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id={`${id}-spot`} cx="50%" cy="50%" rx="34%" ry="46%">
                  <Stop offset="0" stopColor="white" stopOpacity={1} />
                  <Stop offset="1" stopColor="white" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}-spot)`} />
            </Svg>
          }
        >
          <Animated.View style={[StyleSheet.absoluteFill, counterStyle]}>
            <DotGrid id={`${id}-dense`} radius={1.7} opacity={0.75} transparent />
          </Animated.View>
        </MaskedView>
      </Animated.View>
    </View>
  );
}

type DotGridProps = { id: string; radius: number; opacity: number; transparent?: boolean };

function DotGrid({ id, radius, opacity, transparent = false }: DotGridProps) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse">
          <Circle cx={4} cy={4} r={radius} fill={colors.foreground} fillOpacity={opacity} />
        </Pattern>
      </Defs>
      {transparent ? null : <Rect width="100%" height="100%" fill={colors.background} />}
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
