import { useCookingAssistance } from "@/features/cooking/api/use-cooking-assistance";
import { useCookingRoom } from "@/features/cooking/api/use-cooking-room";
import { useCookingSteps } from "@/features/cooking/api/use-cooking-steps";
import { useCookingTimers } from "@/features/cooking/api/use-cooking-timers";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";

import type { CookingCredential } from "@/features/cooking/lib/cooking-session";
import type { CookingActions } from "@/features/cooking/model/types";
type ActionContext = {
  roomId: Id<"cookingRooms">;
  credential: CookingCredential | null;
  online: boolean;
  pending: boolean;
  pendingKeys: string[];
  roomApi: ReturnType<typeof useCookingRoom>;
  assistance: ReturnType<typeof useCookingAssistance>;
  invoke: (call: () => Promise<unknown>, key?: string) => Promise<void>;
  ask: CookingActions["ask"];
  setAgainOpen: (open: boolean) => void;
  setInviteOpen: (open: boolean) => void;
  setPeopleOpen: (open: boolean) => void;
};
export const useCookingActions = ({
  roomId,
  credential,
  online,
  pending,
  pendingKeys,
  roomApi,
  assistance,
  invoke,
  ask,
  setAgainOpen,
  setInviteOpen,
  setPeopleOpen,
}: ActionContext) => {
  const steps = useCookingSteps();
  const timers = useCookingTimers();
  const participantToken = credential?.participantToken;
  const actions: CookingActions = {
    online,
    busy: pending,
    pendingKeys,
    start: (stepKey: string) =>
      participantToken && invoke(() => steps.start({ roomId, participantToken, stepKey })),
    wait: (stepKey: string) =>
      participantToken && invoke(() => steps.wait({ roomId, participantToken, stepKey })),
    ready: (stepKey: string) =>
      participantToken && invoke(() => steps.ready({ roomId, participantToken, stepKey })),
    complete: (stepKey: string, confirmed: boolean, skipChecklist = false) =>
      participantToken &&
      invoke(() => steps.complete({ roomId, participantToken, stepKey, confirmed, skipChecklist })),
    undo: (stepKey: string) =>
      participantToken && invoke(() => steps.undo({ roomId, participantToken, stepKey })),
    toggleChecklist: (stepKey: string, itemId: string, checked: boolean) =>
      participantToken &&
      invoke(
        () => steps.toggleChecklist({ roomId, participantToken, stepKey, itemId, checked }),
        "checklist",
      ),
    toggleIngredient: (ingredientId: string, checked: boolean) =>
      participantToken &&
      invoke(() => steps.toggleIngredient({ roomId, participantToken, ingredientId, checked })),
    timer: (
      timer: { stepKey: string; timerKey: string },
      action: "start" | "pause" | "resume" | "cancel" | "acknowledge" | "restore" | "restart",
    ) =>
      participantToken &&
      invoke(
        () =>
          ({
            start: timers.start,
            pause: timers.pause,
            resume: timers.resume,
            cancel: timers.cancel,
            acknowledge: timers.acknowledge,
            restore: timers.restore,
            restart: timers.restart,
          })[action]({
            roomId,
            participantToken,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
      ),
    addTime: (timer: { stepKey: string; timerKey: string }) =>
      participantToken &&
      invoke(
        () =>
          timers.addTime({
            roomId,
            participantToken,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
            seconds: 60,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
      ),
    requestReference: (stepKey: string) =>
      participantToken &&
      invoke(() => assistance.requestReference({ roomId, participantToken, stepKey })),
    createTimer: (stepKey: string, label: string, seconds: number) =>
      participantToken &&
      invoke(() =>
        timers.create({
          roomId,
          participantToken,
          stepKey,
          timerKey: crypto.randomUUID().replaceAll("-", "").slice(0, 40),
          label,
          seconds,
        }),
      ),
    ask,
    startSession: () =>
      participantToken && invoke(() => roomApi.startSession({ roomId, participantToken })),
    finish: () => participantToken && invoke(() => roomApi.finish({ roomId, participantToken })),
    retryGeneration: () =>
      participantToken && invoke(() => roomApi.retryGeneration({ roomId, participantToken })),
    cookAgain: () => setAgainOpen(true),
    invite: () => setInviteOpen(true),
    managePeople: () => setPeopleOpen(true),
  };

  return { actions, steps };
};
