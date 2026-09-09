import { createRoot } from "react-dom/client";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

import type { CookingActions, CookingRoomData } from "../../src/components/cooking/cooking-session";
import { CookingSession } from "../../src/components/cooking/cooking-session";
import "../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "lobby-waiting";
const now = Date.now();

const plan = {
  servings: 2,
  summary: "Готуємо разом.",
  ingredients: [{ id: "tomatoes", name: "Помідори", amount: "4 шт." }],
  equipment: [],
  steps: [
    {
      id: "prep",
      title: "Підготувати овочі",
      body: "Помий помідори та наріж їх великими шматочками.",
      kind: "task" as const,
      slots: [1],
      dependsOn: [],
      activeMinutes: 5,
      equipment: [],
      checklist: [],
      timers: [],
    },
  ],
};

function member(index: number, role: "host" | "cook" = "cook") {
  return {
    _id: `member-${index}` as Id<"cookingMembers">,
    name: index === 1 ? "Оля" : `Кухар ${index}`,
    role,
    status: "active" as const,
    slots: [index],
    lastSeenAt: now,
  };
}

function createData(name: string): CookingRoomData {
  const cookCount = name === "solo" ? 1 : name === "12cooks" ? 12 : name === "long-title" ? 2 : 3;
  const full = ["lobby-full-generating", "lobby-ready", "guest", "solo", "12cooks"].includes(name);
  const started = ["started-generating", "error-afterstart"].includes(name);
  const error = name.startsWith("error-");
  const generating = name === "lobby-full-generating" || name === "started-generating";
  const guests = full
    ? Array.from({ length: cookCount }, (_, index) => member(index + 1, index === 0 ? "host" : "cook"))
    : [member(1, "host")];
  const me = name === "guest" ? guests[1]! : guests[0]!;
  const members = guests;
  const state = error ? "error" : generating ? "generating" : started ? "error" : "ready";

  return {
    serverNow: now,
    room: {
      _id: "room-fixture" as Id<"cookingRooms">,
      source: {
        title: name === "long-title" ? "Курка теріякі з жасминовим рисом" : "Томатна вечеря",
        summary: "Легка вечеря для друзів.",
        body: "Помідори з пряним соусом.",
        ingredients: [{ name: "Помідори", amount: "4 шт." }],
        servings: 2,
      },
      cookCount,
      requestedServings: 2,
      constraints: "",
      state,
      lobbyCompletedAt: started ? now : undefined,
      plan: name === "lobby-ready" || name === "guest" || name === "solo" || name === "12cooks" ? plan : undefined,
      planVersion: 1,
      inviteOpen: true,
      inviteExpiresAt: now + 86_400_000,
      createdAt: now,
      generationError: error ? "Спробуй створити план ще раз." : undefined,
      checkedIngredientIds: [],
    },
    me,
    members,
    steps: [],
    timers: [],
  };
}

export function Fixture() {
  const [data, setData] = useState(() => createData(mode));
  const actions: CookingActions = {
    online: true,
    busy: false,
    start: () => {},
    wait: () => {},
    ready: () => {},
    complete: () => {},
    undo: () => {},
    toggleChecklist: () => {},
    toggleIngredient: () => {},
    timer: () => {},
    addTime: () => {},
    createTimer: () => {},
    requestReference: () => {},
    startSession: () => {
      setData((current) => ({
        ...current,
        room: { ...current.room, lobbyCompletedAt: Date.now(), state: "generating" },
      }));
      window.setTimeout(showReadyPlan, 3_000);
    },
    finish: () => {},
    retryGeneration: () => {},
    invite: () => {},
    managePeople: () => {},
    ask: () => {},
    cookAgain: () => {},
  };
  const showReadyPlan = () =>
    setData((current) => ({
      ...current,
      room: { ...current.room, state: "cooking", plan },
      steps: [{ stepKey: "prep", status: "pending", slots: [1], readyMemberIds: [], checkedIds: [] }],
    }));

  return (
    <>
      <div className="sr-only" aria-live="polite">Фікстура: {mode}</div>
      <CookingSession data={data} actions={actions} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
