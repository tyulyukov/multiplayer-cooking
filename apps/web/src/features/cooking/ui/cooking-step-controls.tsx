import type { FC } from "react";
import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { CookingActions, CookingRoomData } from "@/features/cooking/model/types";

import type { PlanStep, RuntimeStep } from "../model/types";

import type { getCookingStepState } from "../lib/cooking-step-state";

type StepControlsProps = Pick<
  ReturnType<typeof getCookingStepState>,
  | "active"
  | "waiting"
  | "canAct"
  | "recipient"
  | "sender"
  | "canInteract"
  | "canComplete"
  | "checked"
  | "timerPending"
  | "blockers"
  | "done"
> & {
  step: PlanStep;
  runtime?: RuntimeStep;
  data: CookingRoomData;
  actions: CookingActions;
  primary: boolean;
  onAdvance: () => void;
  confirmed: boolean;
  skipChecklistOpen: boolean;
  setSkipChecklistOpen: (open: boolean) => void;
  complete: (skipChecklist?: boolean) => void;
};

export const StepControls: FC<StepControlsProps> = ({
  step,
  runtime,
  data,
  actions,
  primary,
  onAdvance,
  confirmed,
  skipChecklistOpen,
  setSkipChecklistOpen,
  complete,
  active,
  waiting,
  canAct,
  recipient,
  sender,
  canInteract,
  canComplete,
  checked,
  timerPending,
  blockers,
  done,
}) => {
  const actionVariant = primary ? "default" : "outline";

  return (
    <>
      <div className={cookingStyles["cooking-step-actions"]}>
        {runtime?.status === "pending" && step.kind === "together" && canAct && (
          <Button
            size="xl"
            variant={actionVariant}
            disabled={actions.busy || blockers.length > 0 || Boolean(recipient && !sender)}
            onClick={() => actions.start(step.id)}
          >
            Я готовий
          </Button>
        )}
        {waiting && step.kind === "together" && canAct && (
          <Button
            size="xl"
            variant={actionVariant}
            disabled={runtime?.readyMemberIds.includes(data.me._id)}
            onClick={() => actions.ready(step.id)}
          >
            Я готовий
          </Button>
        )}
        {(active || runtime?.status === "pending") && sender && canAct && (
          <Button
            size="xl"
            variant={actionVariant}
            disabled={!canInteract}
            onClick={() => actions.ready(step.id)}
          >
            Передаю, забирай
          </Button>
        )}
        {canComplete && canAct && (
          <Button
            size="xl"
            variant={actionVariant}
            disabled={actions.busy || Boolean(step.confirmation && !confirmed) || timerPending}
            onClick={() => {
              if (!checked) {
                setSkipChecklistOpen(true);

                return;
              }

              complete();
            }}
          >
            {timerPending ? "Дочекайся таймера" : recipient ? "Отримав, далі" : "Готово, далі"}
          </Button>
        )}
        {active && canAct && step.canWait && step.kind === "task" && (
          <Button
            variant="outline"
            size="chip"
            onClick={() => {
              actions.wait(step.id);
              onAdvance();
            }}
          >
            Поки готується, до іншого кроку
          </Button>
        )}
        {waiting && step.kind === "task" && canAct && (
          <Button variant="outline" size="chip" onClick={() => actions.start(step.id)}>
            Повернутися до кроку
          </Button>
        )}
        {done &&
          actions.online &&
          data.room.state === "cooking" &&
          (runtime?.completedBy === data.me._id || data.me.role === "host") && (
            <Button variant="outline" size="chip" onClick={() => actions.undo(step.id)}>
              Скасувати завершення
            </Button>
          )}
        <Button variant="ghost" size="chip" onClick={() => actions.ask(undefined, step.id)}>
          Є питання?
        </Button>
      </div>
      {step.choices?.map((choice) => (
        <Button
          key={choice.id}
          variant="outline"
          size="chip"
          onClick={() => actions.ask(choice.prompt, step.id)}
        >
          {choice.label}
        </Button>
      ))}
      <Dialog open={skipChecklistOpen} onOpenChange={setSkipChecklistOpen}>
        <DialogContent
          className={cookingStyles["cooking-skip-dialog"]}
          aria-describedby="skip-checklist-description"
        >
          <DialogHeader>
            <DialogTitle>Пропустити пункти?</DialogTitle>
            <DialogDescription id="skip-checklist-description">
              Непозначені пункти залишаться без позначки. Перевір, чи крок справді можна завершити.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="xl" variant="outline" onClick={() => setSkipChecklistOpen(false)}>
              Повернутися
            </Button>
            <Button
              size="xl"
              disabled={
                !canComplete ||
                !canAct ||
                actions.busy ||
                timerPending ||
                Boolean(step.confirmation && !confirmed)
              }
              onClick={() => {
                setSkipChecklistOpen(false);
                complete(true);
              }}
            >
              Пропустити пункти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
