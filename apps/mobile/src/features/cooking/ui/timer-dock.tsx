import { timerLabel } from "@multiplayer-cooking/core/cooking/timer-label";
import type { RoomTimer } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/shared/fonts";
import { entering, exiting } from "@/shared/lib/motion";
import { GlassSurface } from "@/shared/ui/glass-surface";
import { Text } from "@/shared/ui/text";

import { useRoomNow } from "../model/room-context";

export const timerDockHeight = 64;

type TimerDockProps = {
  timers: RoomTimer[];
  isMine: (timer: RoomTimer) => boolean;
  onSelect: (stepKey: string) => void;
};

// Floating glass dock with every running, paused or fired timer; mine come first.
export function TimerDock({ timers, isMine, onSelect }: TimerDockProps) {
  const bottom = useSafeAreaInsets().bottom;
  const now = useRoomNow();

  return (
    <Animated.View
      entering={entering.morph}
      exiting={exiting.fadeOut}
      style={[styles.dock, { bottom: bottom + 8 }]}
      accessibilityLabel="Активні таймери"
    >
      <GlassSurface interactive style={styles.glass}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {timers.map((timer) => {
            const mine = isMine(timer);
            const fired = timer.status === "fired";
            const paused = timer.status === "paused";
            const value = fired ? "Час перевірити" : timerLabel(timer, now);

            return (
              <Animated.View key={timer._id} entering={entering.float}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${mine ? "Твій таймер, " : ""}${timer.label}, ${value}${paused ? ", пауза" : ""}`}
                  accessibilityHint="Відкриває крок"
                  onPress={() => onSelect(timer.stepKey)}
                  style={({ pressed }) => [
                    styles.chip,
                    fired && styles.fired,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.chipText}>
                    {mine ? (
                      <Text style={styles.eyebrow} color={colors.teal} maxFontSizeMultiplier={1.2}>
                        Твій таймер
                      </Text>
                    ) : null}
                    <Text variant="meta" color={colors.card} numberOfLines={1} style={styles.label}>
                      {paused ? `${timer.label} · Пауза` : timer.label}
                    </Text>
                  </View>
                  <Text
                    variant={fired ? "tag" : "numeralSmall"}
                    color={fired ? colors.primary : paused ? colors.border : colors.primary}
                  >
                    {value}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", left: 16, right: 16 },
  glass: { height: timerDockHeight, borderRadius: radii.composer, overflow: "hidden" },
  chips: { alignItems: "center", gap: 8, paddingHorizontal: 8 },
  chip: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radii.card,
    backgroundColor: colors.foreground,
  },
  fired: { borderWidth: 2, borderColor: colors.primary },
  pressed: { opacity: 0.85 },
  chipText: { maxWidth: 140 },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 13 },
  label: { fontFamily: fonts.sansSemiBold },
});
