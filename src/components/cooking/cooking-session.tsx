import "./cooking.css";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import { Fragment, useEffect, useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import { CookingMarkdown } from "./cooking-markdown";
import { CookingTools } from "./cooking-tools";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { proxyConvexStorageUrl } from "@/lib/convex-url";
import { CookingLobby } from "./cooking-lobby";
import { CookingCompletion } from "./cooking-completion";

export type CookingRoomData = NonNullable<FunctionReturnType<typeof api.cookingRooms.read>>;
type PlanStep = NonNullable<CookingRoomData["room"]["plan"]>["steps"][number];
type RuntimeStep = CookingRoomData["steps"][number];
export type RoomTimer = CookingRoomData["timers"][number];
export type CookingActions = Readonly<{
  online: boolean;
  busy: boolean;
  pendingKeys?: readonly string[];
  start: (stepKey: string) => void;
  wait: (stepKey: string) => void;
  ready: (stepKey: string) => void;
  complete: (stepKey: string, confirmed: boolean) => void;
  undo: (stepKey: string) => void;
  toggleChecklist: (stepKey: string, itemId: string, checked: boolean) => void;
  toggleIngredient: (ingredientId: string, checked: boolean) => void;
  timer: (
    timer: RoomTimer,
    action: "start" | "pause" | "resume" | "cancel" | "acknowledge" | "restore" | "restart",
  ) => void;
  addTime: (timer: RoomTimer) => void;
  createTimer: (stepKey: string, label: string, seconds: number) => void;
  requestReference: (stepKey: string) => void;
  startSession: () => void;
  finish: () => void;
  retryGeneration: () => void;
  invite: () => void;
  managePeople: () => void;
  ask: (prompt?: string, stepKey?: string) => void;
  cookAgain: () => void;
}>;

export function CookingSession({
  data,
  actions,
}: {
  data: CookingRoomData;
  actions: CookingActions;
}) {
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
  return (
    <main className="cooking-shell" data-lobby={inLobby} data-completion={showCompletion}>
      <div className="checker-band" aria-hidden />
      <header className="cooking-header">
        <a href="/" className="cooking-brand">
          <span className="brand-dot" aria-hidden /> Готуємо разом
        </a>
        {!inLobby && (
          <Button variant="outline" size="chip" onClick={actions.managePeople} aria-label="Кухарі">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} aria-hidden />
            {data.members.length}
          </Button>
        )}
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
          <section className="cooking-title">
            <div className="sign">
              <h1 ref={instructionsHeading} tabIndex={-1}>
                {data.room.source.title}
              </h1>
            </div>
          </section>
          {!actions.online && (
            <p className="cooking-offline" role="status">
              Немає зв’язку. План і відлік доступні. Спільні дії стануть доступні після підключення.
            </p>
          )}
          {!inLobby && (
            <div className="cooking-tools-row">
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
              body="Розподіляємо роботу між кухарями."
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
              <section className="cooking-timeline" aria-label="Увесь рецепт">
                <div className="cooking-progress">
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
                  className="cooking-finish"
                  size="xl"
                  disabled={!actions.online || actions.busy}
                  onClick={actions.finish}
                >
                  Завершити сесію
                </Button>
              )}
              {running.length > 0 && (
                <aside className="cooking-timer-dock" aria-label="Активні таймери">
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
}

function CookingStatus({
  title,
  body,
  image,
  action,
  onAction,
  disabled,
  loading = false,
}: {
  title: string;
  body: string;
  image?: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <section className="cooking-status">
      {image && !failed && (
        <img
          src={`/images/${image}`}
          alt=""
          width={112}
          height={112}
          onError={() => setFailed(true)}
        />
      )}
      <div role={loading ? "status" : undefined}>
        {loading && <Spinner className="cooking-generation-spinner" />}
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {action && (
        <Button size="xl" disabled={disabled} onClick={onAction}>
          {action}
        </Button>
      )}
    </section>
  );
}

function StepCard({
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
  const slots = runtime?.slots ?? step.slots;
  const mine = slots.some((slot) => data.me.slots.includes(slot));
  const done = runtime?.status === "done";
  const active = runtime?.status === "active";
  const waiting = runtime?.status === "waiting";
  const people = data.members.filter((member) => member.slots.some((slot) => slots.includes(slot)));
  const blockers = step.dependsOn
    .filter((id) => data.steps.find((item) => item.stepKey === id)?.status !== "done")
    .map((id) => data.room.plan?.steps.find((item) => item.id === id)?.title ?? id);
  const canAct = mine && data.room.state === "cooking" && actions.online;
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationVersion, setConfirmationVersion] = useState(done);
  if (confirmationVersion !== done) {
    setConfirmationVersion(done);
    setConfirmed(false);
  }
  const title =
    step.kind === "together"
      ? "Разом"
      : step.kind === "handoff"
        ? "Передача"
        : mine
          ? "Твоє завдання"
          : people.map((member) => member.name).join(", ") || "Місце вільне";
  const recipient = step.kind === "handoff" && data.me.slots.includes(slots[1]);
  const sender = step.kind === "handoff" && data.me.slots.includes(slots[0]);
  const canInteract =
    canAct &&
    !actions.busy &&
    blockers.length === 0 &&
    !done &&
    (step.kind !== "together" || active) &&
    (!recipient || sender || waiting);
  const canComplete =
    (step.kind === "task" && runtime?.status === "pending" && blockers.length === 0) ||
    (active && step.kind !== "handoff") ||
    (waiting && step.kind === "task") ||
    (waiting && recipient);
  const checked = step.checklist.every((item) => runtime?.checkedIds.includes(item.id));
  const timerPending = timers.some(
    (timer) => timer.status === "running" || timer.status === "paused",
  );
  const actionVariant = primary ? "default" : "outline";
  return (
    <article
      id={`step-${step.id}`}
      className={`cooking-step ${expanded ? "cooking-step-active" : ""}`}
      data-state={runtime?.status ?? "pending"}
    >
      <div className="cooking-step-rail">
        <span>{done ? "✓" : index}</span>
      </div>
      <div className="cooking-step-content">
        <button
          className="cooking-step-heading"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls={`step-body-${step.id}`}
        >
          <span className="cooking-step-owner">
            {title}
            {done ? " · Виконано" : active ? " · Готує" : waiting ? " · Очікує" : ""}
          </span>
          <h2>{step.title}</h2>
        </button>
        {expanded && (
          <div id={`step-body-${step.id}`}>
            {blockers.length > 0 && (
              <p className="cooking-wait-reason">Чекаємо: {blockers.join(", ")}</p>
            )}
            <CookingMarkdown text={step.body} className="cooking-step-body" />
            {step.temperature && (
              <p className="cooking-temperature">
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
              <Reference
                key={runtime?.imageUrl ?? step.id}
                imageUrl={runtime?.imageUrl}
                status={runtime?.imageStatus}
                alt={step.reference.alt}
                disabled={!actions.online || actions.busy}
                onRetry={() => actions.requestReference(step.id)}
              />
            )}
            <div className="cooking-checklist">
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
              <label className="cooking-confirm">
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
            <div className="cooking-step-actions">
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
                  disabled={
                    actions.busy ||
                    !checked ||
                    Boolean(step.confirmation && !confirmed) ||
                    timerPending
                  }
                  onClick={() => {
                    actions.complete(step.id, confirmed);
                    onAdvance();
                  }}
                >
                  {recipient ? "Отримав, далі" : "Готово, далі"}
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
            {timerPending && canAct && (
              <p className="cooking-wait-reason">
                Таймер ще працює. Дочекайся сигналу або зупини його, якщо вже перевірив результат.
              </p>
            )}
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
          </div>
        )}
        {!expanded &&
          timers
            .filter(
              (timer) =>
                timer.status === "running" || timer.status === "paused" || timer.status === "fired",
            )
            .map((timer) => (
              <p className="cooking-inline-timer" key={timer._id}>
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

function Reference({
  imageUrl,
  status,
  alt,
  disabled,
  onRetry,
}: {
  imageUrl?: string;
  status?: string;
  alt: string;
  disabled: boolean;
  onRetry: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed)
    return (
      <figure className="cooking-reference-figure">
        <img
          className="cooking-reference"
          src={proxyConvexStorageUrl(imageUrl)}
          alt={alt}
          loading="lazy"
          width={600}
          height={400}
          onError={() => setFailed(true)}
        />
        <figcaption>{alt}</figcaption>
      </figure>
    );
  if (status === "pending")
    return (
      <p className="cooking-reference-pending" role="status">
        Готуємо зображення… Інструкція вже доступна.
      </p>
    );
  if (failed)
    return (
      <p className="cooking-image-error">
        Зображення не завантажилось.{" "}
        <Button size="chip" variant="ghost" onClick={() => setFailed(false)}>
          Завантажити ще раз
        </Button>
      </p>
    );
  return (
    <p className="cooking-image-error">
      {status === "error"
        ? "Не вдалося створити зображення."
        : "Для цього кроку є візуальна підказка."}{" "}
      <Button size="chip" variant="ghost" disabled={disabled} onClick={onRetry}>
        {status === "error" ? "Спробувати ще раз" : "Створити зображення"}
      </Button>
    </p>
  );
}

function timerLabel(timer: RoomTimer, now: number): string {
  const remaining =
    timer.status === "acknowledged"
      ? 0
      : timer.status === "running" && timer.deadline
        ? timer.deadline - now
        : (timer.remainingMs ?? timer.durationMs);
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Timer({
  timer,
  now,
  disabled,
  actions,
}: {
  timer: RoomTimer;
  now: number;
  disabled: boolean;
  actions: CookingActions;
}) {
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
  return (
    <div className="cooking-timer" data-fired={timer.status === "fired"} data-ended={ended}>
      <div>
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.5} aria-hidden />
        <span>{timer.label}</span>
        <strong role={timer.status === "fired" ? "status" : undefined}>
          {timer.status === "fired" ? "Перевір страву" : timerLabel(timer, now)}
          {ended && <small>{timer.status === "cancelled" ? "Зупинено" : "Перевірено"}</small>}
        </strong>
      </div>
      <div>
        {!ended && (
          <>
            <Button
              size="chip"
              variant="outline"
              disabled={disabled || ended}
              onClick={() => actions.timer(timer, action)}
            >
              {timer.status === "fired"
                ? "Побачив"
                : action === "pause"
                  ? "Пауза"
                  : action === "resume"
                    ? "Продовжити"
                    : "Старт"}
            </Button>
            <Button
              size="chip"
              variant="ghost"
              disabled={disabled || ended}
              onClick={() => actions.addTime(timer)}
            >
              +1 хв
            </Button>
            <Button
              size="chip"
              variant="ghost"
              disabled={disabled || ended}
              onClick={() => actions.timer(timer, "cancel")}
            >
              Зупинити
            </Button>
          </>
        )}
        {ended && (
          <>
            <Button
              size="chip"
              variant="outline"
              disabled={disabled}
              onClick={() => actions.timer(timer, "restore")}
            >
              Повернути
            </Button>
            <Button
              size="chip"
              variant="ghost"
              disabled={disabled}
              onClick={() => actions.timer(timer, "restart")}
            >
              Запустити знову
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
