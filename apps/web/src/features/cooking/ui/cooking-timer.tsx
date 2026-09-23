import type { FC } from "react";
import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowTurnBackwardIcon from "@hugeicons/core-free-icons/ArrowTurnBackwardIcon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import StopIcon from "@hugeicons/core-free-icons/StopIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/shared/ui/button";
import type { CookingActions, RoomTimer } from "@/features/cooking/model/types";

import { timerLabel } from "../lib/timer-label";

type TimerProps = {
  timer: RoomTimer;
  now: number;
  disabled: boolean;
  actions: CookingActions;
};

export const Timer: FC<TimerProps> = ({ timer, now, disabled, actions }) => {
  disabled ||= actions.pendingKeys?.includes(`timer:${timer.stepKey}:${timer.timerKey}`) ?? false;
  const ended = timer.status === "cancelled" || timer.status === "acknowledged";
  const action =
    timer.status === "running"
      ? "pause"
      : timer.status === "paused"
        ? "resume"
        : timer.status === "fired"
          ? "acknowledge"
          : "start";
  const actionLabel =
    action === "acknowledge"
      ? "Побачив"
      : action === "pause"
        ? "Пауза"
        : action === "resume"
          ? "Продовжити"
          : "Старт";
  const status =
    timer.status === "fired"
      ? "Перевір страву"
      : timer.status === "cancelled"
        ? "Зупинено"
        : timer.status === "acknowledged"
          ? "Перевірено"
          : timer.status === "paused"
            ? "Пауза"
            : "";
  return (
    <div
      className={cookingStyles["cooking-timer"]}
      data-fired={timer.status === "fired"}
      data-ended={ended}
    >
      <div className={cookingStyles["cooking-timer-display"]}>
        <strong>{timerLabel(timer, now)}</strong>
        <span
          className={cookingStyles["cooking-timer-label"]}
          title={[status, timer.label].filter(Boolean).join(" · ")}
        >
          {status ? `${status} · ${timer.label}` : timer.label}
        </span>
        <span className="sr-only" role="status">
          {status}
        </span>
      </div>
      <div className={cookingStyles["cooking-timer-controls"]}>
        <Button
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label={ended ? "Повернути" : actionLabel}
          title={ended ? "Повернути" : actionLabel}
          onClick={() => actions.timer(timer, ended ? "restore" : action)}
        >
          <HugeiconsIcon
            icon={
              ended
                ? ArrowTurnBackwardIcon
                : action === "acknowledge"
                  ? CheckmarkCircle02Icon
                  : action === "pause"
                    ? PauseIcon
                    : PlayIcon
            }
            strokeWidth={1.5}
            aria-hidden
          />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label={ended ? "Запустити знову" : "Додати 1 хвилину"}
          title={ended ? "Запустити знову" : "Додати 1 хвилину"}
          onClick={() => (ended ? actions.timer(timer, "restart") : actions.addTime(timer))}
        >
          <HugeiconsIcon icon={ended ? RefreshIcon : Add01Icon} strokeWidth={1.5} aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={ended ? "invisible" : undefined}
          disabled={disabled || ended}
          aria-label="Зупинити"
          title="Зупинити"
          onClick={() => actions.timer(timer, "cancel")}
        >
          <HugeiconsIcon icon={StopIcon} strokeWidth={1.5} aria-hidden />
        </Button>
      </div>
    </div>
  );
};
