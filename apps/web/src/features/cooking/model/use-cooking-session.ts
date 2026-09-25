import { useEffect, useRef, useState } from "react";
import type { CookingRoomData, RoomTimer } from "@/features/cooking/model/types";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";
import { preloadImages } from "@/shared/lib/images";

import type { PlanStep } from "./types";

export const useCookingSession = (data: CookingRoomData) => {
  const [now, setNow] = useState(Date.now);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [instructionsRoom, setInstructionsRoom] = useState<string | null>(null);
  const instructionsHeading = useRef<HTMLHeadingElement>(null);
  const showCompletion = data.room.state === "done" && instructionsRoom !== data.room._id;
  useEffect(() => {
    if (data.room.state !== "done" || showCompletion) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    instructionsHeading.current?.focus({ preventScroll: true });
  }, [data.room.state, showCompletion]);
  const offset = useRef(0);
  const sounded = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    offset.current = data.serverNow - Date.now();
  }, [data.serverNow]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + offset.current), 500);

    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (data.room.state !== "cooking" || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | undefined;
    let stopped = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || stopped || (lock && !lock.released)) return;

      try {
        const next = await navigator.wakeLock.request("screen");

        if (stopped) await next.release();
        else lock = next;
      } catch {
        /* The browser can refuse the screen lock. */
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [data.room.state]);
  useEffect(() => {
    for (const timer of data.timers) {
      const key = `${timer._id}:${timer.version}`;

      if (timer.status !== "fired" || sounded.current.has(key) || !sound || !audio.current)
        continue;
      sounded.current.add(key);
      const context = audio.current;
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.frequency.value = 660;
      volume.gain.setValueAtTime(0.12, context.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.8);
      tone.connect(volume);
      volume.connect(context.destination);
      tone.start();
      tone.stop(context.currentTime + 0.8);
    }
  }, [data.timers, sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );

  const toggleSound = () => {
    if (!sound) {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      } catch {
        return;
      }
    }

    setSound(!sound);
  };

  const plan = data.room.plan;

  const inLobby =
    data.room.lobbyCompletedAt === undefined &&
    data.room.state !== "cooking" &&
    data.room.state !== "done";

  const runtimes = new Map(data.steps.map((step) => [step.stepKey, step]));

  const own =
    plan?.steps.filter((step) =>
      (runtimes.get(step.id)?.slots ?? step.slots).some((slot) => data.me.slots.includes(slot)),
    ) ?? [];

  const available = (step: PlanStep) =>
    step.dependsOn.every((id) => runtimes.get(id)?.status === "done");

  const current =
    own.find((step) => runtimes.get(step.id)?.status === "active") ??
    own.find((step) => runtimes.get(step.id)?.status === "pending" && available(step)) ??
    own.find((step) => runtimes.get(step.id)?.status === "waiting") ??
    own.find((step) => runtimes.get(step.id)?.status === "pending");

  const currentId = current?.id;
  const expanded = expandedId ?? currentId;

  const ownImageUrls = own
    .flatMap((step) => runtimes.get(step.id)?.imageUrl ?? [])
    .map(proxyConvexStorageUrl)
    .join("\n");

  useEffect(() => {
    if (ownImageUrls) preloadImages(ownImageUrls.split("\n"));
  }, [ownImageUrls]);
  useEffect(() => {
    if (inLobby || expandedId !== null || !currentId) return;
    const element = document.getElementById(`step-${currentId}`);
    const top = element?.getBoundingClientRect().top;

    if (top !== undefined && (top > window.innerHeight * 0.65 || top < 0))
      element?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [currentId, expandedId, inLobby]);

  const allDone = Boolean(
    plan &&
    data.steps.length === plan.steps.length &&
    data.steps.every((step) => step.status === "done"),
  );

  const completed = data.steps.filter((step) => step.status === "done").length;

  const orderedTimers = [...data.timers].sort((a, b) => {
    const stepA = plan?.steps.findIndex((step) => step.id === a.stepKey) ?? -1;
    const stepB = plan?.steps.findIndex((step) => step.id === b.stepKey) ?? -1;

    if (stepA !== stepB) return stepA - stepB;
    const definitions = plan?.steps[stepA]?.timers ?? [];
    const orderA = definitions.findIndex((timer) => timer.id === a.timerKey);
    const orderB = definitions.findIndex((timer) => timer.id === b.timerKey);

    return (
      (orderA < 0 ? definitions.length : orderA) - (orderB < 0 ? definitions.length : orderB) ||
      a._id.localeCompare(b._id)
    );
  });

  const isMine = (timer: RoomTimer) =>
    timer.startedBy
      ? timer.startedBy === data.me._id
      : (runtimes.get(timer.stepKey)?.slots ?? []).some((slot) => data.me.slots.includes(slot));

  const running = orderedTimers
    .filter(
      (timer) =>
        timer.status === "running" || timer.status === "paused" || timer.status === "fired",
    )
    .sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  return {
    now,
    expanded,
    setExpandedId,
    sound,
    toggleSound,
    instructionsHeading,
    showCompletion,
    setInstructionsRoom,
    plan,
    inLobby,
    runtimes,
    current,
    allDone,
    completed,
    orderedTimers,
    isMine,
    running,
  };
};
