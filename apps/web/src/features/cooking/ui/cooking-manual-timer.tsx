import type { FC } from "react";
import cookingStyles from "./cooking-drawers.module.scss";
import type { CookingActions, CookingRoomData } from "../model/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { parseCookingQuantity } from "../lib/cooking-units";

type Props = {
  data: CookingRoomData;
  actions: Pick<CookingActions, "online" | "busy" | "createTimer">;
  stepKey: string;
  setStepKey: (value: string) => void;
  label: string;
  setLabel: (value: string) => void;
  minutes: string;
  setMinutes: (value: string) => void;
  onClose: () => void;
};

export const CookingManualTimer: FC<Props> = ({
  data,
  actions,
  stepKey,
  setStepKey,
  label,
  setLabel,
  minutes,
  setMinutes,
  onClose,
}) => {
  const allowedSteps = data.steps.filter(
    (step) =>
      step.startedAt &&
      step.status !== "done" &&
      (data.me.role === "host" || step.slots.some((slot) => data.me.slots.includes(slot))),
  );

  const selectedStep = stepKey || allowedSteps[0]?.stepKey;
  const duration = parseCookingQuantity(minutes);
  const validDuration = duration !== null && duration > 0 && duration <= 10080;

  return (
    <div className={cookingStyles["cooking-tool-panel"]}>
      {allowedSteps.length ? (
        <>
          <label htmlFor="manual-timer-step">Для якого кроку</label>
          <select
            id="manual-timer-step"
            value={selectedStep}
            onChange={(event) => setStepKey(event.target.value)}
          >
            {allowedSteps.map((step) => (
              <option key={step.stepKey} value={step.stepKey}>
                {data.room.plan?.steps.find((item) => item.id === step.stepKey)?.title}
              </option>
            ))}
          </select>
          <label htmlFor="manual-timer-label">Назва</label>
          <Input
            id="manual-timer-label"
            value={label}
            maxLength={140}
            placeholder="Наприклад, перевірити тісто"
            onChange={(event) => setLabel(event.target.value)}
          />
          <label htmlFor="manual-timer-minutes">Хвилини</label>
          <Input
            id="manual-timer-minutes"
            inputMode="decimal"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
          <Button
            size="xl"
            disabled={!actions.online || actions.busy || !validDuration || !label.trim()}
            onClick={() => {
              if (selectedStep && duration) {
                actions.createTimer(selectedStep, label.trim(), Math.round(duration * 60));
                onClose();
              }
            }}
          >
            Додати таймер
          </Button>
        </>
      ) : (
        <p>Спочатку почни крок, для якого потрібен таймер.</p>
      )}
    </div>
  );
};
