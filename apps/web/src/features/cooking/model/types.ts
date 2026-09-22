import type { FunctionReturnType } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type CookingSetup = Readonly<{
  cookCount: number;
  servings: number;
  name: string;
  constraints: string;
}>;

export type CookingRoomData = NonNullable<FunctionReturnType<typeof api.cookingRooms.read>>;
export type RoomTimer = CookingRoomData["timers"][number];
export type PlanStep = NonNullable<CookingRoomData["room"]["plan"]>["steps"][number];
export type RuntimeStep = CookingRoomData["steps"][number];
export type HelperProposal = FunctionReturnType<typeof api.cookingAssistance.listProposals>[number];

export type CookingActions = Readonly<{
  online: boolean;
  busy: boolean;
  pendingKeys?: readonly string[];
  start: (stepKey: string) => void;
  wait: (stepKey: string) => void;
  ready: (stepKey: string) => void;
  complete: (stepKey: string, confirmed: boolean, skipChecklist?: boolean) => void;
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
