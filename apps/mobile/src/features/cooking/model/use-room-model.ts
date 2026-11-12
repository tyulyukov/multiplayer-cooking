import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { CookingCredential } from "@multiplayer-cooking/core/cooking/cooking-session";
import type { CookingActions, RoomTimer } from "@multiplayer-cooking/core/cooking/types";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useOnline } from "@/shared/hooks/use-online";
import { haptics } from "@/shared/lib/haptics";
import {
  readCookingCredential,
  readTimerSound,
  saveCookingCredential,
  saveTimerSound,
} from "@/shared/lib/storage";

import { useCookingSteps } from "../api/use-cooking-steps";
import { useCookingTimers } from "../api/use-cooking-timers";
import { useHelperFeed } from "../api/use-helper-feed";
import { useRoomApi } from "../api/use-room-api";
import { newCookingCredential, newInviteToken } from "../lib/credential";
import { inviteUrl } from "../lib/invite-url";
import { askTimerNotificationPermission } from "../lib/timer-notifications";
import { serverMessage, useRoomInvoke } from "./use-room-invoke";
import { useTimerAlerts } from "./use-timer-alerts";

type TimerAction = Parameters<CookingActions["timer"]>[1];

const inviteFailedMessage = "Не вдалося створити запрошення. Спробуй ще раз.";

export const useRoomModel = (roomId: Id<"cookingRooms">) => {
  const online = useOnline();
  const [credential, setCredential] = useState(() => readCookingCredential(roomId));
  const participantToken = credential?.participantToken;
  const roomApi = useRoomApi(roomId, participantToken, online);
  const read = roomApi.read;
  const steps = useCookingSteps();
  const timers = useCookingTimers();

  const { invoke, error, setError, pending, setPending, pendingScope, pendingKeys } =
    useRoomInvoke(online);

  const helperFeed = useHelperFeed(roomId, participantToken, Boolean(read) && online);
  const [helperSeenAt, setHelperSeenAt] = useState(0);
  const [sound, setSound] = useState(readTimerSound);
  const offset = useRef(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const serverNow = read?.serverNow;

  useEffect(() => {
    if (serverNow !== undefined) offset.current = serverNow - Date.now();
  }, [serverNow]);

  // Server-aligned time; call it from effects and callbacks, never during render.
  const serverTime = () => Date.now() + offset.current;

  useTimerAlerts(
    read?.timers,
    read?.room.state === "cooking",
    sound,
    serverTime,
    read?.room.source.title ?? "",
  );

  const saveCredential = (next: CookingCredential) => {
    saveCookingCredential(roomId, next);
    setCredential(next);
  };

  const call = <T>(run: (token: string) => Promise<T>, key?: string, scope?: string) =>
    participantToken ? invoke(() => run(participantToken), key, scope) : Promise.resolve(false);

  const member = { roomId };

  const timerAction = (timer: RoomTimer, action: TimerAction) => {
    if (action === "start" || action === "resume" || action === "restart") {
      void askTimerNotificationPermission();
    }

    return call(
      (token) =>
        timers[action]({
          ...member,
          participantToken: token,
          stepKey: timer.stepKey,
          timerKey: timer.timerKey,
        }),
      `timer:${timer.stepKey}:${timer.timerKey}`,
      timer.stepKey,
    );
  };

  const stepCall = (
    stepKey: string,
    run: (token: string) => Promise<boolean>,
    onAccepted?: () => void,
  ) => {
    void call(run, "room", stepKey).then((accepted) => {
      if (accepted) onAccepted?.();
      else if (online) haptics.error();
    });
  };

  const actions: CookingActions = {
    online,
    busy: pending,
    pendingKeys,
    start: (stepKey) =>
      stepCall(stepKey, (token) => steps.start({ ...member, participantToken: token, stepKey })),
    wait: (stepKey) =>
      stepCall(stepKey, (token) => steps.wait({ ...member, participantToken: token, stepKey })),
    ready: (stepKey) =>
      stepCall(stepKey, (token) => steps.ready({ ...member, participantToken: token, stepKey })),
    complete: (stepKey, confirmed, skipChecklist = false) =>
      stepCall(
        stepKey,
        (token) =>
          steps.complete({
            ...member,
            participantToken: token,
            stepKey,
            confirmed,
            skipChecklist,
          }),
        haptics.success,
      ),
    undo: (stepKey) =>
      stepCall(stepKey, (token) => steps.undo({ ...member, participantToken: token, stepKey })),
    toggleChecklist: (stepKey, itemId, checked) =>
      void call(
        (token) =>
          steps.toggleChecklist({ ...member, participantToken: token, stepKey, itemId, checked }),
        "checklist",
        stepKey,
      ),
    toggleIngredient: (ingredientId, checked) =>
      void call((token) =>
        steps.toggleIngredient({ ...member, participantToken: token, ingredientId, checked }),
      ),
    timer: (timer, action) => void timerAction(timer, action),
    addTime: (timer) =>
      void call(
        (token) =>
          timers.addTime({
            ...member,
            participantToken: token,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
            seconds: 60,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
        timer.stepKey,
      ),
    createTimer: (stepKey, label, seconds) => {
      void askTimerNotificationPermission();
      void call((token) =>
        timers.create({
          ...member,
          participantToken: token,
          stepKey,
          timerKey: newInviteToken().slice(0, 40),
          label,
          seconds,
        }),
      );
    },
    requestReference: (stepKey) =>
      void call(
        (token) => roomApi.requestReference({ ...member, participantToken: token, stepKey }),
        "room",
        stepKey,
      ),
    startSession: () =>
      void call((token) => roomApi.startSession({ ...member, participantToken: token })),
    finish: () => void call((token) => roomApi.finish({ ...member, participantToken: token })),
    retryGeneration: () =>
      void call((token) => roomApi.retryGeneration({ ...member, participantToken: token })),
    invite: () => router.push({ pathname: "/cook/[roomId]/invite", params: { roomId } }),
    managePeople: () => router.push({ pathname: "/cook/[roomId]/people", params: { roomId } }),
    ask: (prompt, stepKey) =>
      router.push({
        pathname: "/cook/[roomId]/helper",
        params: { roomId, prompt: prompt ?? "", stepKey: stepKey ?? "" },
      }),
    cookAgain: () => router.push({ pathname: "/cook-together", params: { roomId } }),
  };

  const rotateInviteLink = async () => {
    if (!credential || !online || pending) return false;
    const inviteToken = newInviteToken();
    setError(null);
    setPending(true);

    try {
      if (
        !(await roomApi.rotateInvite({
          roomId,
          participantToken: credential.participantToken,
          inviteToken,
        }))
      ) {
        setError({ message: inviteFailedMessage });

        return false;
      }

      saveCredential({ ...credential, inviteToken });
      haptics.warning();

      return true;
    } catch (failure) {
      setError({
        message:
          failure instanceof Error
            ? serverMessage(failure, inviteFailedMessage)
            : inviteFailedMessage,
      });

      return false;
    } finally {
      setPending(false);
    }
  };

  const latestHelperReplyAt = Math.max(
    0,
    ...(helperFeed.messages ?? []).flatMap((item) =>
      item.role === "assistant" ? [item.createdAt] : [],
    ),
    ...(helperFeed.proposals ?? []).map((item) => item.createdAt),
  );

  return {
    roomId,
    credential,
    saveCredential,
    newCredential: newCookingCredential,
    read,
    online,
    api: roomApi,
    steps,
    timers,
    invoke: call,
    pending,
    pendingScope,
    pendingKeys,
    error,
    setError,
    actions,
    rotateInviteLink,
    inviteUrl: credential?.inviteToken ? inviteUrl(roomId, credential.inviteToken) : null,
    serverTime,
    helper: {
      ...helperFeed,
      seenAt: helperSeenAt,
      unread: latestHelperReplyAt > helperSeenAt,
      markSeen: () => setHelperSeenAt(Math.max(latestHelperReplyAt, Date.now())),
    },
    sound,
    toggleSound: () => {
      saveTimerSound(!sound);
      setSound(!sound);
    },
    showInstructions,
    setShowInstructions,
    celebrated,
    setCelebrated,
  };
};
