import type { UIMessage } from "@convex-dev/agent";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { generationStatus } from "@multiplayer-cooking/core/chat/generation-status";
import { colors } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
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

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { entering } from "@/shared/lib/motion";
import { ShimmerText } from "@/shared/ui/shimmer-text";

const rockDegrees = 7;

const rockMs = 700;

export function WorkingRow({ messages }: { messages: readonly UIMessage[] }) {
  const { label } = generationStatus(messages);
  const reducedMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const rockStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));

  useEffect(() => {
    if (reducedMotion) return;

    angle.set(-rockDegrees);
    angle.set(
      withRepeat(
        withTiming(rockDegrees, {
          duration: rockMs,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );

    return () => {
      cancelAnimation(angle);
      angle.set(0);
    };
  }, [angle, reducedMotion]);

  return (
    <Animated.View entering={entering.fadeIn} style={styles.row}>
      <Animated.View style={[styles.pot, rockStyle]}>
        <HugeiconsIcon icon={CookingPotIcon} size={20} color={colors.tealDeep} strokeWidth={1.5} />
      </Animated.View>
      <View style={styles.label}>
        <ShimmerText text={label} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  pot: { transformOrigin: "50% 90%" },
  label: { flex: 1 },
});
