import type { RoomTimer } from "@multiplayer-cooking/core/cooking/types";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useRef } from "react";

import { haptics } from "@/shared/lib/haptics";

import { cancelTimerNotification, scheduleTimerNotification } from "../lib/timer-notifications";

const chime = require("@/assets/sounds/timer-chime.wav");

const keepAwakeTag = "cooking-room";

// Everything a running kitchen needs from the device: chime and haptic once per fired timer
// version, local notifications for deadlines while backgrounded, and an awake screen.
export const useTimerAlerts = (
  timers: readonly RoomTimer[] | undefined,
  cooking: boolean,
  sound: boolean,
  serverTime: () => number,
  title: string,
) => {
  const player = useAudioPlayer(chime);
  const alerted = useRef(new Set<string>());
  const scheduled = useRef(new Map<string, number>());

  useEffect(() => {
    if (!cooking) return;
    activateKeepAwakeAsync(keepAwakeTag).catch(() => undefined);

    return () => {
      deactivateKeepAwake(keepAwakeTag).catch(() => undefined);
    };
  }, [cooking]);

  useEffect(() => {
    for (const timer of timers ?? []) {
      const key = `${timer._id}:${timer.version}`;

      if (timer.status !== "fired" || alerted.current.has(key)) continue;
      alerted.current.add(key);

      if (!sound) continue;
      haptics.timerFired();
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" })
        .catch(() => undefined)
        .finally(() => {
          player.seekTo(0).catch(() => undefined);
          player.play();
        });
    }
  }, [player, sound, timers]);

  useEffect(() => {
    const wanted = new Map<string, { fireAt: number; label: string }>();

    for (const timer of timers ?? []) {
      if (timer.status === "running" && timer.deadline) {
        wanted.set(timer._id, {
          fireAt: timer.deadline - (serverTime() - Date.now()),
          label: timer.label,
        });
      }
    }

    for (const [timerId] of scheduled.current) {
      if (wanted.has(timerId)) continue;
      scheduled.current.delete(timerId);
      cancelTimerNotification(timerId).catch(() => undefined);
    }

    for (const [timerId, { fireAt, label }] of wanted) {
      const previous = scheduled.current.get(timerId);

      if (fireAt <= Date.now() || (previous !== undefined && Math.abs(previous - fireAt) < 1000))
        continue;
      scheduled.current.set(timerId, fireAt);
      scheduleTimerNotification(timerId, fireAt, label, `Час перевірити · ${title}`).catch(
        () => undefined,
      );
    }
  }, [serverTime, timers, title]);
};
