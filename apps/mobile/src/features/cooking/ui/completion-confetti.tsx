import { colors } from "@multiplayer-cooking/theme";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { durations } from "@/shared/lib/motion";

const particleCount = 72;

const palette = [colors.teal, colors.primary, colors.card, colors.foreground];

type Particle = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
}>;

const makeParticles = (width: number, height: number) =>
  Array.from({ length: particleCount }, (_, index): Particle => {
    const side = index % 2 === 0 ? 1 : -1;

    return {
      x: side === 1 ? width * 0.12 : width * 0.88,
      y: Math.min(height * 0.55, 440),
      vx: side * (70 + Math.random() * Math.min(width * 0.6, 480)),
      vy: -260 - Math.random() * 300,
      rotation: Math.random() * 180,
      spin: (Math.random() - 0.5) * 690,
      size: 5 + Math.random() * 5,
      color: palette[index % palette.length] ?? colors.teal,
    };
  });

// The web canvas confetti on Reanimated: 72 paper strips from both sides for two seconds.
// The caller skips it under Reduce Motion.
export function CompletionConfetti({ onDone }: { onDone: (playing: false) => void }) {
  const { width, height } = useWindowDimensions();
  const [particles] = useState(() => makeParticles(width, height));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: durations.confetti,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
    );
    const id = setTimeout(() => onDone(false), durations.confetti);

    return () => clearTimeout(id);
  }, [onDone, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      {particles.map((particle, index) => (
        <ConfettiPiece key={index} particle={particle} progress={progress} />
      ))}
    </View>
  );
}

type ConfettiPieceProps = { particle: Particle; progress: SharedValue<number> };

function ConfettiPiece({ particle, progress }: ConfettiPieceProps) {
  const { x, y, vx, vy, rotation, spin, size, color } = particle;

  const style = useAnimatedStyle(() => {
    const seconds = (progress.get() * durations.confetti) / 1000;

    return {
      opacity: Math.min(1, (2 - seconds) / 0.5),
      transform: [
        { translateX: x + vx * seconds * (1 - seconds * 0.15) },
        { translateY: y + vy * seconds + 340 * seconds * seconds },
        { rotate: `${rotation + spin * seconds}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: size, height: size / 2, marginLeft: -size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 0.5,
    borderColor: `${colors.foreground}33`,
  },
});
