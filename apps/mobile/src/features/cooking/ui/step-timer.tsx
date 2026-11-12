import { timerLabel } from "@multiplayer-cooking/core/cooking/timer-label";
import type { RoomTimer } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
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
import { BlackBox } from "@/shared/ui/black-box";
import { Button } from "@/shared/ui/button";

import { timerStatusText } from "../lib/session-view";
import { useCookingRoom, useRoomNow } from "../model/room-context";

type StepTimerProps = { timer: RoomTimer; mine: boolean; disabled: boolean; controls: boolean };

const primaryAction = (status: RoomTimer["status"]) => {
  switch (status) {
    case "running":
      return { action: "pause", label: "Пауза" } as const;
    case "paused":
      return { action: "resume", label: "Продовжити" } as const;
    case "fired":
      return { action: "acknowledge", label: "Побачив" } as const;
    default:
      return { action: "start", label: "Старт" } as const;
  }
};

// A step timer as a black box: live numeral, status words and the web's three controls.
export function StepTimer({ timer, mine, disabled, controls }: StepTimerProps) {
  const { actions } = useCookingRoom();
  const now = useRoomNow();
  const ended = timer.status === "cancelled" || timer.status === "acknowledged";
  const fired = timer.status === "fired";

  const locked =
    disabled ||
    (actions.pendingKeys?.includes(`timer:${timer.stepKey}:${timer.timerKey}`) ?? false);

  const primary = primaryAction(timer.status);
  const status = timerStatusText(timer);
  const value = fired ? "0:00" : timerLabel(timer, now);
  const meta = [status, mine ? "Твій таймер" : ""].filter(Boolean).join(" · ");

  return (
    <FiredRing fired={fired}>
      <BlackBox
        label={timer.label}
        meta={meta || undefined}
        value={value}
        valueLabel={fired ? "Час перевірити" : `Залишилось ${value}`}
        paused={timer.status === "paused" || ended}
      >
        {controls ? (
          <>
            <Button
              variant="ghostOnInk"
              compact
              label={ended ? "Повернути" : primary.label}
              disabled={locked}
              onPress={() => actions.timer(timer, ended ? "restore" : primary.action)}
            />
            <Button
              variant="ghostOnInk"
              compact
              label={ended ? "Запустити знову" : "+1 хв"}
              accessibilityLabel={ended ? "Запустити знову" : "Додати 1 хвилину"}
              disabled={locked}
              onPress={() => (ended ? actions.timer(timer, "restart") : actions.addTime(timer))}
            />
            {ended ? null : (
              <Button
                variant="ghostOnInk"
                compact
                label="Зупинити"
                disabled={locked}
                onPress={() => actions.timer(timer, "cancel")}
              />
            )}
          </>
        ) : null}
      </BlackBox>
    </FiredRing>
  );
}

function FiredRing({ fired, children }: { fired: boolean; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    cancelAnimation(opacity);

    if (!fired) {
      opacity.set(0);

      return;
    }

    if (reducedMotion) {
      opacity.set(1);

      return;
    }

    opacity.set(
      withRepeat(
        withTiming(1, {
          duration: 500,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      ),
    );

    return () => cancelAnimation(opacity);
  }, [fired, opacity, reducedMotion]);

  return (
    <View>
      {children}
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    inset: 0,
    borderRadius: radii.composer,
    borderWidth: 3,
    borderColor: colors.primary,
  },
});
