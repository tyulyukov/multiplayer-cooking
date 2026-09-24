import type {
  CookingActions,
  CookingRoomData,
  PlanStep,
  RoomTimer,
  RuntimeStep,
} from "../model/types";

export function getCookingStepState({
  step,
  runtime,
  data,
  timers,
  actions,
}: {
  step: PlanStep;
  runtime?: RuntimeStep;
  data: Pick<CookingRoomData, "me" | "members" | "steps"> & {
    room: Pick<CookingRoomData["room"], "state" | "plan">;
  };
  timers: RoomTimer[];
  actions: Pick<CookingActions, "online" | "busy">;
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

  return {
    done,
    active,
    waiting,
    people,
    blockers,
    canAct,
    title,
    recipient,
    sender,
    canInteract,
    canComplete,
    checked,
    timerPending,
  };
}
