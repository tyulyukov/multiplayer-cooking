import type { RoomTimer } from "../model/types";

export const timerLabel = (
  timer: Pick<RoomTimer, "status" | "deadline" | "remainingMs" | "durationMs">,
  now: number,
) => {
  const remaining =
    timer.status === "acknowledged"
      ? 0
      : timer.status === "running" && timer.deadline
        ? timer.deadline - now
        : (timer.remainingMs ?? timer.durationMs);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
