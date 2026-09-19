import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Id } from "../../convex/_generated/dataModel";
import {
  CookingSession,
  type CookingActions,
  type CookingRoomData,
} from "../../src/components/cooking/cooking-session";
import { Button } from "../../src/components/ui/button";
import "../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "pending";
const now = Date.now();
const me = {
  _id: "member-host" as Id<"cookingMembers">,
  name: "Оля",
  role: "host" as const,
  status: "active" as const,
  slots: [1],
  lastSeenAt: now,
};
const plan = {
  servings: 2,
  summary: "Курка з овочами на вечерю.",
  ingredients: [{ id: "garlic", name: "Часник", amount: "2 зубчики" }],
  equipment: [],
  steps: [
    {
      id: "prep",
      title: "Подрібни часник",
      body: "Дрібно наріж часник. Змішай його з олією для запікання курки та овочів.",
      kind: "task" as const,
      slots: [1],
      dependsOn: [],
      activeMinutes: 5,
      equipment: [],
      checklist: [{ id: "cut", label: "Часник нарізаний" }],
      timers: [],
      reference: {
        prompt: "Нарізаний часник на дошці",
        alt: "Дрібно нарізаний часник на дошці",
        style: "illustration" as const,
      },
    },
    {
      id: "oven",
      title: "Розігрій духовку",
      body: "Увімкни духовку на 200 °C.",
      kind: "task" as const,
      slots: [2],
      dependsOn: [],
      activeMinutes: 1,
      equipment: [],
      checklist: [],
      timers: [],
    },
  ],
};
const initialData: CookingRoomData = {
  serverNow: now,
  room: {
    _id: "room-fixture" as Id<"cookingRooms">,
    source: {
      title: "Курка з овочами",
      summary: plan.summary,
      body: plan.summary,
      ingredients: plan.ingredients,
      servings: 2,
    },
    cookCount: 2,
    requestedServings: 2,
    constraints: "",
    state: "cooking",
    lobbyCompletedAt: now - 10000,
    plan,
    planVersion: 1,
    inviteOpen: true,
    inviteExpiresAt: now + 86400000,
    createdAt: now,
    checkedIngredientIds: [],
    generationError: undefined,
    helperBusy: false,
    helperError: undefined,
    helperFailedPromptMessageId: undefined,
  },
  me,
  members: [
    me,
    {
      ...me,
      _id: "member-guest" as Id<"cookingMembers">,
      name: "Максим",
      role: "cook",
      slots: [2],
    },
  ],
  steps: plan.steps.map((step) => ({
    stepKey: step.id,
    status: "active",
    slots: step.slots,
    readyMemberIds: [],
    checkedIds: [],
    startedAt: now - 10000,
    imageUrl: undefined,
  })),
  timers: [],
};

export function Fixture() {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState(mode);
  useEffect(() => {
    if (state !== "replay") return;
    const timer = window.setTimeout(() => setState("ready"), 6000);
    return () => window.clearTimeout(timer);
  }, [state]);
  const actions: CookingActions = {
    online: state !== "offline",
    busy: false,
    start: () => {},
    wait: () => {},
    ready: () => {},
    complete: () => {},
    undo: () => {},
    toggleChecklist: (key, id, checked) =>
      setData((current) => ({
        ...current,
        steps: current.steps.map((step) =>
          step.stepKey === key
            ? {
                ...step,
                checkedIds: checked
                  ? [...step.checkedIds, id]
                  : step.checkedIds.filter((item) => item !== id),
              }
            : step,
        ),
      })),
    toggleIngredient: () => {},
    timer: () => {},
    addTime: () => {},
    createTimer: () => {},
    requestReference: () => setState("replay"),
    startSession: () => {},
    finish: () => {},
    retryGeneration: () => {},
    invite: () => {},
    managePeople: () => {},
    ask: () => {},
    cookAgain: () => {},
  };
  const steps: CookingRoomData["steps"] = data.steps.map((step) =>
    step.stepKey === "prep"
      ? {
          ...step,
          imageStatus: ["ready", "broken"].includes(state)
            ? "ready"
            : ["error", "offline"].includes(state)
              ? "error"
              : state === "idle"
                ? undefined
                : "pending",
          imageUrl:
            state === "ready"
              ? "/images/cooking-prep-3d.webp"
              : state === "broken"
                ? "/images/missing-reference.webp"
                : undefined,
        }
      : step,
  );
  return (
    <>
      <CookingSession data={{ ...data, steps }} actions={actions} />
      <nav
        aria-label="Стани для перевірки"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 16,
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        {[
          ["replay", "Повторити генерацію"],
          ["pending", "Генерація"],
          ["ready", "Готове"],
          ["error", "Помилка"],
          ["broken", "Помилка завантаження"],
          ["offline", "Без мережі"],
          ["idle", "Без зображення"],
        ].map(([value, label]) => (
          <Button key={value} variant="outline" size="chip" onClick={() => setState(value!)}>
            {label}
          </Button>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
