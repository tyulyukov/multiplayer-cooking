import { colors, radii } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { haptics } from "@/shared/lib/haptics";
import type { IllustrationName } from "@/shared/lib/illustrations";
import { durations } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";

// Post-lobby states without a timeline: the plan is being written, failed, or missing.
export function CookingStatus() {
  const { read, actions } = useRoomData();
  const state = read.room.state;

  useEffect(() => {
    if (state === "error") haptics.error();
  }, [state]);

  if (state === "generating") {
    return (
      <StatusLayout
        illustration="cooking-preparing"
        size={120}
        title="Складаємо план"
        body={
          read.room.cookCount === 1
            ? "Готуємо покрокові інструкції для тебе."
            : "Розподіляємо роботу між кухарями."
        }
        loading
      />
    );
  }

  if (state === "error") {
    return (
      <View style={styles.status}>
        <Illustration name="cooking-waiting" size={96} />
        <InlineAlert
          message={`План не створився. ${read.room.generationError ?? "Спробуй ще раз."}`}
          style={styles.alert}
        />
        {read.me.role === "host" ? (
          <Button
            variant="ghost"
            label="Спробувати ще раз"
            busy={actions.busy}
            busyLabel="Пробуємо…"
            disabled={!actions.online}
            onPress={actions.retryGeneration}
          />
        ) : null}
      </View>
    );
  }

  return (
    <StatusLayout
      illustration="cooking-preparing"
      size={96}
      title="План ще готується"
      body="Інструкції з’являться тут."
    />
  );
}

type StatusLayoutProps = {
  illustration: IllustrationName;
  size: number;
  title: string;
  body: string;
  loading?: boolean;
};

function StatusLayout({ illustration, size, title, body, loading = false }: StatusLayoutProps) {
  return (
    <View
      style={styles.status}
      accessibilityRole={loading ? "progressbar" : undefined}
      accessibilityLiveRegion="polite"
    >
      <Illustration name={illustration} size={size} />
      <Text variant="sheetTitle" role="heading" style={styles.center}>
        {title}
      </Text>
      <Text color={colors.mutedForeground} style={[styles.center, styles.body]}>
        {body}
      </Text>
      {loading ? <WorkingDots /> : null}
    </View>
  );
}

function WorkingDots() {
  return (
    <View style={styles.dots} accessible={false}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} />
      ))}
    </View>
  );
}

function Dot({ index }: { index: number }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    if (reducedMotion) return;
    const stagger = (durations.skeleton / 3) * index;

    opacity.set(
      withDelay(
        stagger,
        withRepeat(
          withTiming(0.6, { duration: durations.skeleton, reduceMotion: ReduceMotion.System }),
          -1,
          true,
          undefined,
          ReduceMotion.System,
        ),
        ReduceMotion.System,
      ),
    );

    return () => cancelAnimation(opacity);
  }, [index, opacity, reducedMotion]);

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  status: { alignItems: "center", gap: 12, paddingTop: 24, paddingBottom: 32 },
  alert: { alignSelf: "stretch" },
  center: { textAlign: "center" },
  body: { maxWidth: 300, fontSize: 15, lineHeight: 21 },
  dots: { flexDirection: "row", gap: 8, paddingTop: 8 },
  dot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.teal },
});
