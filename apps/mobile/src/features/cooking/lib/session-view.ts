import type { CookingRoomData, PlanStep, RoomTimer } from "@multiplayer-cooking/core/cooking/types";

// Same derivations as the web `useCookingSession`, without the DOM effects.
export const sessionView = (data: CookingRoomData) => {
  const plan = data.room.plan;

  const inLobby =
    data.room.lobbyCompletedAt === undefined &&
    data.room.state !== "cooking" &&
    data.room.state !== "done";

  const runtimes = new Map(data.steps.map((step) => [step.stepKey, step]));

  const holdsSlot = (slots: readonly number[]) =>
    slots.some((slot) => data.me.slots.includes(slot));

  const own =
    plan?.steps.filter((step) => holdsSlot(runtimes.get(step.id)?.slots ?? step.slots)) ?? [];

  const available = (step: PlanStep) =>
    step.dependsOn.every((id) => runtimes.get(id)?.status === "done");

  const statusOf = (step: PlanStep) => runtimes.get(step.id)?.status;

  const current =
    own.find((step) => statusOf(step) === "active") ??
    own.find((step) => statusOf(step) === "pending" && available(step)) ??
    own.find((step) => statusOf(step) === "waiting") ??
    own.find((step) => statusOf(step) === "pending");

  const allDone = Boolean(
    plan &&
    data.steps.length === plan.steps.length &&
    data.steps.every((step) => step.status === "done"),
  );

  const completed = data.steps.filter((step) => step.status === "done").length;

  const stepIndex = (stepKey: string) => plan?.steps.findIndex((step) => step.id === stepKey) ?? -1;

  const orderedTimers = [...data.timers].sort((a, b) => {
    const stepA = stepIndex(a.stepKey);
    const stepB = stepIndex(b.stepKey);

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
      : holdsSlot(runtimes.get(timer.stepKey)?.slots ?? []);

  const running = orderedTimers
    .filter((timer) => isLiveTimer(timer))
    .sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  return { plan, inLobby, runtimes, current, allDone, completed, orderedTimers, isMine, running };
};

export const isLiveTimer = (timer: Pick<RoomTimer, "status">) =>
  timer.status === "running" || timer.status === "paused" || timer.status === "fired";

export const timerStatusText = (timer: Pick<RoomTimer, "status">) => {
  switch (timer.status) {
    case "fired":
      return "Перевір страву";
    case "cancelled":
      return "Зупинено";
    case "acknowledged":
      return "Перевірено";
    case "paused":
      return "Пауза";
    default:
      return "";
  }
};

// Hermes has no Intl.PluralRules; this is the Ukrainian rule for whole numbers.
export const pluralize = (count: number, one: string, few: string, many: string) => {
  const tens = count % 100;
  const units = count % 10;

  const form =
    units === 1 && tens !== 11
      ? one
      : units >= 2 && units <= 4 && (tens < 12 || tens > 14)
        ? few
        : many;

  return `${count} ${form}`;
};

export const convertTemperature = (value: number, unit: "C" | "F") => {
  return Math.round(unit === "C" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9);
};
