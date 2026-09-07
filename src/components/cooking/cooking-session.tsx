import "./cooking.css";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import { CookingMarkdown } from "./cooking-markdown";
import { CookingTools } from "./cooking-tools";
import { Button } from "@/components/ui/button";

export type CookingRoomData = NonNullable<FunctionReturnType<typeof api.cookingRooms.read>>;
type PlanStep = NonNullable<CookingRoomData["room"]["plan"]>["steps"][number];
type RuntimeStep = CookingRoomData["steps"][number];
export type RoomTimer = CookingRoomData["timers"][number];
export type CookingActions = Readonly<{
  online: boolean;
  busy: boolean;
  start: (stepKey: string) => void;
  wait: (stepKey: string) => void;
  ready: (stepKey: string) => void;
  complete: (stepKey: string, confirmed: boolean) => void;
  undo: (stepKey: string) => void;
  toggleChecklist: (stepKey: string, itemId: string, checked: boolean) => void;
  toggleIngredient: (ingredientId: string, checked: boolean) => void;
  timer: (
    timer: RoomTimer,
    action: "start" | "pause" | "resume" | "cancel" | "acknowledge",
  ) => void;
  addTime: (timer: RoomTimer) => void;
  createTimer: (stepKey: string, label: string, seconds: number) => void;
  requestReference: (stepKey: string) => void;
  startSession: () => void;
  finish: () => void;
  retryGeneration: () => void;
  invite: () => void;
  managePeople: () => void;
  ask: (prompt?: string) => void;
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
    if (expandedId !== null || !currentId) return;
    const element = document.getElementById(`step-${currentId}`);
    const top = element?.getBoundingClientRect().top;
    if (top !== undefined && (top > window.innerHeight * 0.65 || top < 0))
      element?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [currentId, expandedId]);
  const allDone = Boolean(
    plan &&
    data.steps.length === plan.steps.length &&
    data.steps.every((step) => step.status === "done"),
  );
  const completed = data.steps.filter((step) => step.status === "done").length;
  const running = data.timers.filter(
    (timer) => timer.status === "running" || timer.status === "fired",
  );
  return (
    <main className="cooking-shell">
      <div className="checker-band" aria-hidden />
      <header className="cooking-header">
        <a href="/" className="cooking-brand">
          <span className="brand-dot" aria-hidden /> Готуємо разом
        </a>
        <Button variant="outline" size="chip" onClick={actions.managePeople} aria-label="Кухарі">
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} aria-hidden />
          {data.members.length}
        </Button>
      </header>
      <section className="cooking-title">
        <div className="sign">
          <h1>{data.room.source.title}</h1>
        </div>
        <p>
          {data.room.requestedServings} порцій · {data.me.name}
          {data.members
            .filter((member) => member._id !== data.me._id)
            .map((member) => `, ${member.name}`)
            .join("")}
        </p>
      </section>
      {!actions.online && (
        <p className="cooking-offline" role="status">
          Немає зв’язку. План і відлік доступні. Спільні дії стануть доступні після підключення.
        </p>
      )}
      <div className="cooking-tools-row">
        <CookingTools data={data} actions={actions} sound={sound} onSound={toggleSound} />
        {data.room.inviteOpen && (
          <Button variant="outline" size="chip" onClick={actions.invite}>
            Запросити
          </Button>
        )}
      </div>
      {data.room.state === "generating" ? (
        <CookingStatus
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
          {data.room.state === "ready" && (
            <section className="cooking-ready chrome">
              <strong>План готовий</strong>
              <span>
                {data.members.length} з {data.room.cookCount} кухарів приєдналися
              </span>
              {data.me.role === "host" ? (
                <Button
                  size="xl"
                  disabled={!actions.online || actions.busy}
                  onClick={actions.startSession}
                >
                  Почати готувати
                </Button>
              ) : (
                <p>Чекаємо, поки господар почне готування.</p>
              )}
            </section>
          )}
          {data.room.state === "done" && (
            <CookingStatus
              title="Смачного!"
              body="Спільна вечеря готова."
              image="oven-mitts.webp"
              action="Приготувати ще раз"
              onAction={actions.cookAgain}
              disabled={!actions.online || actions.busy}
            />
          )}
          <section className="cooking-timeline" aria-label="Увесь рецепт">
            <div className="cooking-progress">
              <span>
                {completed} з {plan.steps.length} кроків
              </span>
              <progress value={completed} max={plan.steps.length} aria-label="Спільний прогрес" />
            </div>
            {plan.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                runtime={runtimes.get(step.id)}
                data={data}
                timers={data.timers.filter((timer) => timer.stepKey === step.id)}
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
                  onClick={() => {
                    setExpandedId(timer.stepKey);
                    document
                      .getElementById(`step-${timer.stepKey}`)
                      ?.scrollIntoView({ behavior: "instant", block: "center" });
                  }}
                >
                  {timer.label}{" "}
                  <strong>
                    {timer.status === "fired" ? "Час перевірити" : timerLabel(timer, now)}
                  </strong>
                </button>
              ))}
            </aside>
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
}: {
  title: string;
  body: string;
  image?: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
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
      <h2>{title}</h2>
      <p>{body}</p>
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
  const canAct = mine && data.room.state === "cooking" && actions.online && !actions.busy;
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationVersion, setConfirmationVersion] = useState(runtime?.startedAt);
  if (confirmationVersion !== runtime?.startedAt) {
    setConfirmationVersion(runtime?.startedAt);
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
  const canComplete =
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
            {step.checklist.length > 0 && (
              <div className="cooking-checklist">
                {step.checklist.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={runtime?.checkedIds.includes(item.id) ?? false}
                      disabled={!canAct || done}
                      onChange={(event) =>
                        actions.toggleChecklist(step.id, item.id, event.target.checked)
                      }
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            )}
            {timers.map((timer) => (
              <Timer
                key={timer._id}
                timer={timer}
                now={now}
                disabled={!canAct || !runtime?.startedAt || done}
                actions={actions}
              />
            ))}
            {step.confirmation && !done && (
              <label className="cooking-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!canAct}
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
              {runtime?.status === "pending" && canAct && (
                <Button
                  size="xl"
                  variant={actionVariant}
                  disabled={blockers.length > 0 || Boolean(recipient && !sender)}
                  onClick={() => actions.start(step.id)}
                >
                  {step.kind === "together" ? "Я готовий" : "Почати"}
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
              {active && sender && canAct && (
                <Button size="xl" variant={actionVariant} onClick={() => actions.ready(step.id)}>
                  Передаю, забирай
                </Button>
              )}
              {canComplete && canAct && (
                <Button
                  size="xl"
                  variant={actionVariant}
                  disabled={!checked || Boolean(step.confirmation && !confirmed) || timerPending}
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
                  Залишити й перейти далі
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
              <Button
                variant="ghost"
                size="chip"
                onClick={() => actions.ask(`Поясни крок «${step.title}».`)}
              >
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
                onClick={() => actions.ask(choice.prompt)}
              >
                {choice.label}
              </Button>
            ))}
          </div>
        )}
        {!expanded &&
          timers
            .filter((timer) => timer.status === "running" || timer.status === "fired")
            .map((timer) => (
              <p className="cooking-inline-timer" key={timer._id}>
                {timer.label} ·{" "}
                {timer.status === "fired" ? "Час перевірити" : timerLabel(timer, now)}
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
          src={imageUrl}
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
    timer.status === "running" && timer.deadline
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
  if (timer.status === "cancelled" || timer.status === "acknowledged")
    return (
      <p className="cooking-timer-ended">
        {timer.label}: {timer.status === "cancelled" ? "зупинено" : "перевірено"}
      </p>
    );
  const action =
    timer.status === "running"
      ? "pause"
      : timer.status === "paused"
        ? "resume"
        : timer.status === "fired"
          ? "acknowledge"
          : "start";
  return (
    <div className="cooking-timer" data-fired={timer.status === "fired"}>
      <div>
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.5} aria-hidden />
        <span>{timer.label}</span>
        <strong role={timer.status === "fired" ? "status" : undefined}>
          {timer.status === "fired" ? "Перевір страву" : timerLabel(timer, now)}
        </strong>
      </div>
      <div>
        <Button
          size="chip"
          variant="outline"
          disabled={disabled}
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
          disabled={disabled}
          onClick={() => actions.addTime(timer)}
        >
          +1 хв
        </Button>
        <Button
          size="chip"
          variant="ghost"
          disabled={disabled}
          onClick={() => actions.timer(timer, "cancel")}
        >
          Зупинити
        </Button>
      </div>
    </div>
  );
}
