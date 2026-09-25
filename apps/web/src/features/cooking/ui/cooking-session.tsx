import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import Home01Icon from "@hugeicons/core-free-icons/Home01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { CookingTools } from "./cooking-tools";
import { Button } from "@/shared/ui/button";
import type { CookingActions, CookingRoomData } from "@/features/cooking/model/types";
import { CookingLobby } from "./cooking-lobby";
import { CookingCompletion } from "./cooking-completion";

import { useCookingSession } from "../model/use-cooking-session";
import { StepCard } from "./cooking-step-card";
import { CookingStatus } from "./cooking-status";
import { timerLabel } from "../lib/timer-label";

export { Timer } from "./cooking-timer";

type CookingSessionProps = {
  data: CookingRoomData;
  actions: CookingActions;
};

export const CookingSession: FC<CookingSessionProps> = ({ data, actions }) => {
  const {
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
  } = useCookingSession(data);

  return (
    <main
      className={cookingStyles["cooking-shell"]}
      data-lobby={inLobby}
      data-completion={showCompletion}
    >
      <div className="checker-band" aria-hidden />
      <header className={cn(cookingStyles["cooking-header"], "page-frame topbar")}>
        <a href="/" className={cn(cookingStyles["cooking-brand"], "brand")}>
          <i aria-hidden /> Multiplayer Cooking
        </a>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="chip" className="min-h-12 min-w-12">
            <a href="/" aria-label="На головну" title="На головну">
              <HugeiconsIcon icon={Home01Icon} strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">На головну</span>
            </a>
          </Button>
          {!inLobby && data.room.cookCount > 1 && (
            <Button
              variant="outline"
              size="chip"
              className={cookingStyles["member-chip"]}
              onClick={actions.managePeople}
              aria-label="Кухарі"
            >
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} aria-hidden />
              {data.members.length}
            </Button>
          )}
        </div>
      </header>
      {showCompletion ? (
        <CookingCompletion
          key={data.room._id}
          data={data}
          actions={actions}
          onInstructions={() => setInstructionsRoom(data.room._id)}
        />
      ) : (
        <>
          <section className={cookingStyles["cooking-title"]}>
            <div className="sign">
              <h1 ref={instructionsHeading} tabIndex={-1}>
                {data.room.source.title}
              </h1>
            </div>
          </section>
          {!actions.online && (
            <p className={cookingStyles["cooking-offline"]} role="status">
              Немає зв’язку. План і відлік доступні. Спільні дії стануть доступні після підключення.
            </p>
          )}
          {!inLobby && (
            <div className={cookingStyles["cooking-tools-row"]}>
              {data.room.state === "done" && (
                <Button variant="outline" size="chip" onClick={() => setInstructionsRoom(null)}>
                  До завершення
                </Button>
              )}
              <CookingTools data={data} actions={actions} sound={sound} onSound={toggleSound} />
            </div>
          )}
          {inLobby ? (
            <CookingLobby data={data} actions={actions} />
          ) : data.room.state === "generating" ? (
            <CookingStatus
              loading
              title="Складаємо план"
              body={
                data.room.cookCount === 1
                  ? "Готуємо покрокові інструкції для тебе."
                  : "Розподіляємо роботу між кухарями."
              }
              image="cooking-preparing.webp"
            />
          ) : data.room.state === "error" ? (
            <CookingStatus
              title="План не створився"
              body={data.room.generationError ?? "Спробуй ще раз."}
              action={data.me.role === "host" ? "Спробувати ще раз" : undefined}
              onAction={actions.retryGeneration}
              disabled={!actions.online || actions.busy}
            />
          ) : !plan ? (
            <CookingStatus title="План ще готується" body="Інструкції з’являться тут." />
          ) : (
            <>
              <section className={cookingStyles["cooking-timeline"]} aria-label="Увесь рецепт">
                <div className={cookingStyles["cooking-progress"]}>
                  <span>
                    {completed} з {plan.steps.length} кроків
                  </span>
                  <progress
                    value={completed}
                    max={plan.steps.length}
                    aria-label="Спільний прогрес"
                  />
                </div>
                {plan.steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    runtime={runtimes.get(step.id)}
                    data={data}
                    timers={orderedTimers.filter((timer) => timer.stepKey === step.id)}
                    now={now}
                    actions={actions}
                    expanded={expanded === step.id}
                    primary={current?.id === step.id && data.room.state === "cooking"}
                    index={index + 1}
                    onExpand={() => setExpandedId(expanded === step.id ? "" : step.id)}
                    onAdvance={() => setExpandedId(null)}
                  />
                ))}
              </section>
              {data.room.state === "cooking" && allDone && (
                <Button
                  className={cookingStyles["cooking-finish"]}
                  size="xl"
                  disabled={!actions.online || actions.busy}
                  onClick={actions.finish}
                >
                  Завершити сесію
                </Button>
              )}
              {running.length > 0 && (
                <aside
                  className={cookingStyles["cooking-timer-dock"]}
                  data-timer-dock
                  aria-label="Активні таймери"
                >
                  {running.map((timer) => (
                    <button
                      key={timer._id}
                      data-mine={isMine(timer)}
                      onClick={() => {
                        setExpandedId(timer.stepKey);
                        document
                          .getElementById(`step-${timer.stepKey}`)
                          ?.scrollIntoView({ behavior: "instant", block: "center" });
                      }}
                    >
                      <span>
                        {isMine(timer) && <small>Твій таймер</small>}
                        {timer.label}
                      </span>{" "}
                      <strong>
                        {timer.status === "fired"
                          ? "Час перевірити"
                          : `${timerLabel(timer, now)}${timer.status === "paused" ? " · Пауза" : ""}`}
                      </strong>
                    </button>
                  ))}
                </aside>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
};
