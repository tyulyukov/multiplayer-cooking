import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { cn } from "@/shared/lib/utils";
import { Fragment, useState } from "react";
import { CookingMarkdown } from "./cooking-markdown";
import type { CookingActions, CookingRoomData, RoomTimer } from "@/features/cooking/model/types";
import { CookingReference } from "./cooking-reference";

import { Timer } from "./cooking-timer";
import { timerLabel } from "../lib/timer-label";
import type { PlanStep, RuntimeStep } from "../model/types";

import { getCookingStepState } from "../lib/cooking-step-state";
import { StepControls } from "./cooking-step-controls";

export function StepCard({
  step,
  runtime,
  data,
  timers,
  now,
  actions,
  expanded,
  primary,
  index,
  onExpand,
  onAdvance,
}: {
  step: PlanStep;
  runtime?: RuntimeStep;
  data: CookingRoomData;
  timers: RoomTimer[];
  now: number;
  actions: CookingActions;
  expanded: boolean;
  primary: boolean;
  index: number;
  onExpand: () => void;
  onAdvance: () => void;
}) {
  const state = getCookingStepState({ step, runtime, data, timers, actions });
  const { done, active, waiting, people, blockers, title, canInteract } = state;
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationVersion, setConfirmationVersion] = useState(done);

  if (confirmationVersion !== done) {
    setConfirmationVersion(done);
    setConfirmed(false);
  }

  const [skipChecklistOpen, setSkipChecklistOpen] = useState(false);

  const complete = (skipChecklist = false) => {
    actions.complete(step.id, confirmed, skipChecklist);
    onAdvance();
  };

  return (
    <article
      id={`step-${step.id}`}
      className={cn(
        cookingStyles["cooking-step"],
        expanded && cookingStyles["cooking-step-active"],
      )}
      data-state={runtime?.status ?? "pending"}
    >
      <div className={cookingStyles["cooking-step-rail"]}>
        <span>{done ? "✓" : index}</span>
      </div>
      <div className={cookingStyles["cooking-step-content"]}>
        <button
          className={cookingStyles["cooking-step-heading"]}
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls={`step-body-${step.id}`}
        >
          <span className={cookingStyles["cooking-step-owner"]}>
            {title}
            {done ? " · Виконано" : active ? " · Готує" : waiting ? " · Очікує" : ""}
          </span>
          <h2>{step.title}</h2>
        </button>
        {expanded && (
          <div id={`step-body-${step.id}`}>
            {blockers.length > 0 && (
              <p className={cookingStyles["cooking-wait-reason"]}>Чекаємо: {blockers.join(", ")}</p>
            )}
            <CookingMarkdown text={step.body} className={cookingStyles["cooking-step-body"]} />
            {step.temperature && (
              <p className={cookingStyles["cooking-temperature"]}>
                {step.temperature.label}:{" "}
                <strong>
                  {step.temperature.value} °{step.temperature.unit}
                </strong>{" "}
                ·{" "}
                {Math.round(
                  step.temperature.unit === "C"
                    ? (step.temperature.value * 9) / 5 + 32
                    : ((step.temperature.value - 32) * 5) / 9,
                )}{" "}
                °{step.temperature.unit === "C" ? "F" : "C"}
              </p>
            )}
            {step.reference && (
              <CookingReference
                key={`${step.id}:${runtime?.imageUrl ?? "pending"}`}
                imageUrl={runtime?.imageUrl}
                status={runtime?.imageStatus}
                alt={step.reference.alt}
                disabled={!actions.online || actions.busy}
                onRetry={() => actions.requestReference(step.id)}
              />
            )}
            <div className={cookingStyles["cooking-checklist"]}>
              {timers
                .filter(
                  (timer) =>
                    !step.timers.find((item) => item.id === timer.timerKey)?.afterChecklistItemId,
                )
                .map((timer) => (
                  <Timer
                    key={timer._id}
                    timer={timer}
                    now={now}
                    disabled={!canInteract}
                    actions={actions}
                  />
                ))}
              {step.checklist.map((item) => (
                <Fragment key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={runtime?.checkedIds.includes(item.id) ?? false}
                      disabled={!canInteract}
                      onChange={(event) =>
                        actions.toggleChecklist(step.id, item.id, event.target.checked)
                      }
                    />
                    {item.label}
                  </label>
                  {timers
                    .filter(
                      (timer) =>
                        step.timers.find((definition) => definition.id === timer.timerKey)
                          ?.afterChecklistItemId === item.id,
                    )
                    .map((timer) => (
                      <Timer
                        key={timer._id}
                        timer={timer}
                        now={now}
                        disabled={!canInteract}
                        actions={actions}
                      />
                    ))}
                </Fragment>
              ))}
            </div>
            {step.confirmation && !done && (
              <label className={cookingStyles["cooking-confirm"]}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!canInteract}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                {step.confirmation}
              </label>
            )}
            {waiting && step.kind === "together" && (
              <p role="status">
                Готові:{" "}
                {people
                  .filter((member) => runtime?.readyMemberIds.includes(member._id))
                  .map((member) => member.name)
                  .join(", ") || "ще ніхто"}
                . Потрібні всі призначені кухарі.
              </p>
            )}
            <StepControls
              step={step}
              runtime={runtime}
              data={data}
              actions={actions}
              primary={primary}
              onAdvance={onAdvance}
              confirmed={confirmed}
              skipChecklistOpen={skipChecklistOpen}
              setSkipChecklistOpen={setSkipChecklistOpen}
              complete={complete}
              {...state}
            />
          </div>
        )}
        {!expanded &&
          timers
            .filter(
              (timer) =>
                timer.status === "running" || timer.status === "paused" || timer.status === "fired",
            )
            .map((timer) => (
              <p className={cookingStyles["cooking-inline-timer"]} key={timer._id}>
                {timer.label} ·{" "}
                {timer.status === "fired"
                  ? "Час перевірити"
                  : `${timerLabel(timer, now)}${timer.status === "paused" ? " · Пауза" : ""}`}
              </p>
            ))}
      </div>
    </article>
  );
}
