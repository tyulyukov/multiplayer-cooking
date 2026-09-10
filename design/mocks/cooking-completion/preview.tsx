import { createRoot } from "react-dom/client";
import { StrictMode, useMemo, useState } from "react";

import { CooksForm } from "../../../src/components/cook-together";
import type { CookingActions, CookingRoomData } from "../../../src/components/cooking/cooking-session";
import { CookingSession } from "../../../src/components/cooking/cooking-session";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../../src/components/ui/drawer";
import type { Id } from "../../../convex/_generated/dataModel";
import "../../../src/index.css";

type FixtureMode =
  | "done"
  | "cooking-all-done"
  | "no-image"
  | "broken-image"
  | "offline"
  | "guest"
  | "solo"
  | "long-title";

const mode = (new URLSearchParams(window.location.search).get("mode") ?? "done") as FixtureMode;
const withCredit = new URLSearchParams(window.location.search).get("credit") === "1";
const validModes = new Set<FixtureMode>([
  "done",
  "cooking-all-done",
  "no-image",
  "broken-image",
  "offline",
  "guest",
  "solo",
  "long-title",
]);
const fixtureMode = validModes.has(mode) ? mode : "done";
const now = Date.now();

const plan = {
  servings: 2,
  summary: "Рамьон готовий.",
  ingredients: [
    { id: "noodles", name: "Локшина рамен", amount: "180 г" },
    { id: "shrimp", name: "Креветки", amount: "250 г" },
  ],
  equipment: [{ id: "pot", name: "Каструля", capacity: 1 }],
  steps: [
    {
      id: "broth",
      title: "Зварити бульйон",
      body: "Доведи бульйон до кипіння та додай місо.",
      kind: "task" as const,
      slots: [1],
      dependsOn: [],
      activeMinutes: 8,
      equipment: ["pot"],
      checklist: [{ id: "miso", label: "Місо повністю розчинилося" }],
      timers: [
        {
          id: "broth-timer",
          label: "Бульйон настоявся",
          durationSeconds: 180,
          afterChecklistItemId: "miso",
        },
      ],
    },
    {
      id: "serve",
      title: "Зібрати рамен",
      body: "Розклади локшину, креветки й бульйон по двох мисках.",
      kind: "task" as const,
      slots: [2],
      dependsOn: ["broth"],
      activeMinutes: 4,
      equipment: [],
      checklist: [{ id: "shrimp", label: "Креветки прогрілися" }],
      timers: [],
    },
  ],
};

function member(index: number, role: "host" | "cook", name: string) {
  return {
    _id: `member-${index}` as Id<"cookingMembers">,
    name,
    role,
    status: "active" as const,
    slots: [index],
    lastSeenAt: now,
  };
}

function createData(name: FixtureMode): CookingRoomData {
  const solo = name === "solo";
  const guest = name === "guest";
  const title =
    name === "long-title"
      ? "Рамьон з креветками без грибів, з пряним бульйоном і хрусткою цибулею"
      : "Рамьон з креветками без грибів";
  const members = solo ? [member(1, "host", "Оля")] : [member(1, "host", "Оля"), member(2, "cook", "Аня")];
  const cooking = name === "cooking-all-done";
  const photoUrl =
    name === "no-image"
      ? undefined
      : name === "broken-image"
        ? "./missing-dish.jpg"
        : "./dish-reference.jpg";
  const dishImage = photoUrl
    ? {
        url: photoUrl,
        ...(withCredit
          ? { credit: "Фікстура: збережене фото страви", sourceUrl: "https://example.com/fixture" }
          : {}),
      }
    : undefined;

  return {
    serverNow: now,
    room: {
      _id: "room-completion-fixture" as Id<"cookingRooms">,
      source: {
        title,
        summary: "Рамьон для спільної вечері.",
        body: "Ароматний рамен із креветками.",
        ingredients: [{ name: "Креветки", amount: "250 г" }],
        servings: 2,
      },
      cookCount: solo ? 1 : 2,
      requestedServings: 2,
      constraints: "Без грибів",
      state: cooking ? "cooking" : "done",
      lobbyCompletedAt: now - 3_600_000,
      plan,
      planVersion: 1,
      inviteOpen: false,
      inviteExpiresAt: now,
      createdAt: now - 3_600_000,
      checkedIngredientIds: [],
      ...(dishImage ? { dishImage } : {}),
    },
    me: guest ? members[1]! : members[0]!,
    members,
    steps: [
      {
        stepKey: "broth",
        status: "done",
        slots: [1],
        readyMemberIds: [],
        checkedIds: ["miso"],
        completedAt: now - 600_000,
        completedBy: members[0]!._id,
      },
      {
        stepKey: "serve",
        status: "done",
        slots: solo ? [1] : [2],
        readyMemberIds: [],
        checkedIds: ["shrimp"],
        completedAt: now - 60_000,
        completedBy: solo ? members[0]!._id : members[1]!._id,
      },
    ],
    timers: [
      {
        _id: "timer-broth" as Id<"cookingTimers">,
        stepKey: "broth",
        timerKey: "broth-timer",
        label: "Бульйон настоявся",
        durationMs: 180_000,
        remainingMs: 0,
        status: "acknowledged",
        version: 1,
      },
    ],
  };
}

export function Fixture() {
  const [data, setData] = useState(() => createData(fixtureMode));
  const [againOpen, setAgainOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const online = fixtureMode !== "offline";
  const actions = useMemo<CookingActions>(
    () => ({
      online,
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
      startSession: () => {},
      finish: () => setData((current) => ({ ...current, room: { ...current.room, state: "done" } })),
      retryGeneration: () => setNotice("Спроба повторити створення плану у фікстурі."),
      invite: () => {},
      managePeople: () => {},
      ask: () => {},
      cookAgain: () => setAgainOpen(true),
    }),
    [online],
  );

  return (
    <>
      <p className="sr-only" aria-live="polite">
        Фікстура завершення: {fixtureMode}
      </p>
      <CookingSession data={data} actions={actions} />
      <Drawer autoFocus open={againOpen} onOpenChange={setAgainOpen}>
        <DrawerContent className="cooking-drawer" aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>Приготувати ще раз</DrawerTitle>
          </DrawerHeader>
          <div className="cooking-drawer-body">
            <CooksForm
              disabled={!online}
              initial={data.room.cookCount}
              initialServings={data.room.requestedServings}
              initialName={data.me.name}
              onGenerate={async () => {
                setNotice("Фікстура не створює кухню. У маршруті ця дія запускає наявний cookAgain.");
                setAgainOpen(false);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
      {notice && <p className="sr-only" role="status">{notice}</p>}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
