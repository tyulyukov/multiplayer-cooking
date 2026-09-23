import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { fn } from "storybook/test";

import type { CookingActions, CookingRoomData, RoomTimer } from "../model/types";

export const storyNow = Date.UTC(2026, 8, 23, 12, 0, 0);

const hostId = "story-host" as Id<"cookingMembers">;
const guestId = "story-guest" as Id<"cookingMembers">;

export const storyPlan = {
  servings: 4,
  summary: "Паста з овочами для спільного готування.",
  ingredients: [
    { id: "pasta", name: "Паста", amount: "300 г" },
    { id: "tomatoes", name: "Помідори", amount: "2 шт." },
    { id: "pepper", name: "Перець", amount: "1 шт." },
  ],
  equipment: [{ id: "pan", name: "Пательня", capacity: 1 }],
  steps: [
    {
      id: "prep",
      title: "Підготуй овочі",
      body: "Помий овочі й наріж їх невеликими шматочками.",
      kind: "task",
      slots: [1],
      dependsOn: [],
      activeMinutes: 8,
      equipment: [],
      checklist: [
        { id: "wash", label: "Помити овочі" },
        { id: "cut", label: "Нарізати овочі" },
      ],
      timers: [],
    },
    {
      id: "fry",
      title: "Обсмаж овочі",
      body: "Розігрій пательню та обсмаж овочі до м’якості.",
      kind: "task",
      slots: [1],
      dependsOn: ["prep"],
      activeMinutes: 10,
      canWait: true,
      equipment: ["pan"],
      checklist: [
        { id: "heat", label: "Розігріти пательню" },
        { id: "add", label: "Додати овочі" },
      ],
      timers: [{ id: "fry-timer", label: "Овочі на пательні", durationSeconds: 300 }],
      confirmation: "Овочі стали м’якими",
    },
    {
      id: "serve",
      title: "Змішайте пасту з овочами",
      body: "З’єднайте готову пасту з овочами й подавайте разом.",
      kind: "together",
      slots: [1, 2],
      dependsOn: ["fry"],
      activeMinutes: 4,
      equipment: [],
      checklist: [{ id: "mix", label: "Змішати пасту та овочі" }],
      timers: [],
    },
  ],
} satisfies NonNullable<CookingRoomData["room"]["plan"]>;

export const storyTimer = {
  _id: "story-fry-timer" as Id<"cookingTimers">,
  stepKey: "fry",
  timerKey: "fry-timer",
  label: "Овочі на пательні",
  status: "running",
  durationMs: 300_000,
  deadline: storyNow + 180_000,
  version: 1,
  startedBy: hostId,
} satisfies RoomTimer;

const baseRoom = {
  serverNow: storyNow,
  room: {
    _id: "story-cooking-room" as Id<"cookingRooms">,
    source: {
      title: "Паста з овочами",
      summary: "Проста вечеря, яку зручно готувати разом.",
      body: "Змішай пасту з обсмаженими овочами.",
      ingredients: [
        { name: "Паста", amount: "300 г" },
        { name: "Помідори", amount: "2 шт." },
      ],
      servings: 4,
    },
    cookCount: 2,
    requestedServings: 4,
    constraints: "",
    state: "cooking",
    lobbyCompletedAt: storyNow - 600_000,
    plan: storyPlan,
    planVersion: 1,
    inviteOpen: true,
    inviteExpiresAt: storyNow + 86_400_000,
    createdAt: storyNow - 900_000,
    checkedIngredientIds: [],
    generationError: undefined,
    helperBusy: undefined,
    helperError: undefined,
    helperFailedPromptMessageId: undefined,
  },
  me: {
    _id: hostId,
    name: "Аня",
    role: "host",
    status: "active",
    slots: [1],
    lastSeenAt: storyNow,
  },
  members: [
    {
      _id: hostId,
      name: "Аня",
      role: "host",
      status: "active",
      slots: [1],
      lastSeenAt: storyNow,
    },
    {
      _id: guestId,
      name: "Марко",
      role: "cook",
      status: "active",
      slots: [2],
      lastSeenAt: storyNow,
    },
  ],
  steps: [
    {
      stepKey: "prep",
      status: "done",
      slots: [1],
      readyMemberIds: [],
      checkedIds: ["wash", "cut"],
      startedAt: storyNow - 600_000,
      completedAt: storyNow - 300_000,
      completedBy: hostId,
      imageUrl: undefined,
    },
    {
      stepKey: "fry",
      status: "active",
      slots: [1],
      readyMemberIds: [],
      checkedIds: ["heat"],
      startedAt: storyNow - 180_000,
      imageUrl: undefined,
    },
    {
      stepKey: "serve",
      status: "pending",
      slots: [1, 2],
      readyMemberIds: [],
      checkedIds: [],
      imageUrl: undefined,
    },
  ],
  timers: [storyTimer],
} satisfies CookingRoomData;

export function cookingRoomFixture(
  overrides: Partial<Omit<CookingRoomData, "room">> & {
    room?: Partial<CookingRoomData["room"]>;
  } = {},
): CookingRoomData {
  const { room, ...rest } = overrides;
  return { ...baseRoom, ...rest, room: { ...baseRoom.room, ...room } };
}

export const cookingActions = {
  online: true,
  busy: false,
  start: fn(),
  wait: fn(),
  ready: fn(),
  complete: fn(),
  undo: fn(),
  toggleChecklist: fn(),
  toggleIngredient: fn(),
  timer: fn(),
  addTime: fn(),
  createTimer: fn(),
  requestReference: fn(),
  startSession: fn(),
  finish: fn(),
  retryGeneration: fn(),
  invite: fn(),
  managePeople: fn(),
  ask: fn(),
  cookAgain: fn(),
} satisfies CookingActions;
