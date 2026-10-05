import { useRoomInvite } from "./use-room-invite";
import { ConvexError } from "convex/values";
import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useRef, useState } from "react";

import { isString } from "@/shared/lib/type-guards";
import { useCookingRoom } from "@/features/cooking/api/use-cooking-room";
import type {
  CooksFormProps,
  JoinRoomProps,
  PeopleProps,
} from "@/features/cooking/model/component-props";
import {
  createCookingCredential,
  inviteFromHash,
  readCookingCredential,
  saveCookingCredential,
} from "@/features/cooking/lib/cooking-session";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";

import { useRoomHelper } from "./use-room-helper";
import { useCookingActions } from "./use-cooking-actions";

export const useCookingRoomPage = (roomId: Id<"cookingRooms">) => {
  const navigate = useNavigate();
  const [sessionId] = useSessionId();
  const [credential, setCredential] = useState(() => readCookingCredential(roomId));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingOperations = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [againOpen, setAgainOpen] = useState(false);
  const roomApi = useCookingRoom(roomId, credential);
  const read = roomApi.room;
  const online = roomApi.online;

  const invoke = async <T>(call: () => Promise<T>, key = "room") => {
    if (!online || pending || (key !== "checklist" && pendingOperations.current.has(key))) return;
    setError(null);

    if (key === "room") setPending(true);

    if (key !== "checklist") {
      pendingOperations.current.add(key);
      setPendingKeys([...pendingOperations.current]);
    }

    try {
      const result = await call();

      if (result === false || result === null)
        setError("Стан кухні змінився. Перевір крок і спробуй ще раз.");
    } catch (failure) {
      setError(
        failure instanceof ConvexError && isString(failure.data)
          ? failure.data
          : "Не вдалося синхронізувати зміну. Спробуй ще раз.",
      );
    } finally {
      if (key === "room") setPending(false);
      pendingOperations.current.delete(key);
      setPendingKeys([...pendingOperations.current]);
    }
  };

  const invite = useRoomInvite({
    roomId,
    credential,
    setCredential,
    roomApi,
    online,
    pending,
    setPending,
    setError,
  });

  const [peopleOpen, setPeopleOpen] = useState(false);
  const { assistance, ask, helperProps } = useRoomHelper(roomId, credential, roomApi);

  const { actions, steps } = useCookingActions({
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
    setInviteOpen: invite.setInviteOpen,
    setPeopleOpen,
  });

  const joinProps: JoinRoomProps = {
    roomId,
    sessionId,
    inviteToken: inviteFromHash(),
    onJoined: setCredential,
    onRecoverHost: (targetSessionId, newParticipantToken) =>
      roomApi.recoverHost({ sessionId: targetSessionId, roomId, newParticipantToken }),
    onJoin: (inviteToken, participantToken, name) =>
      roomApi.join({ roomId, inviteToken, participantToken, name }),
  };

  if (!credential || read === null) return { screen: "join" as const, joinProps };

  if (read === undefined) return { screen: "loading" as const };

  const setupProps: CooksFormProps = {
    disabled: !online || pending,
    initial: read.room.cookCount,
    initialServings: read.room.requestedServings,
    initialName: read.me.name,
    onGenerate: async (setup) => {
      if (!online) throw new Error("Немає з’єднання.");
      const next = createCookingCredential(createCookingCredential().participantToken);

      const result = await roomApi.cookAgain({
        roomId,
        participantToken: credential.participantToken,
        newParticipantToken: next.participantToken,
        inviteToken: next.inviteToken!,
        ...setup,
      });

      if (!result) throw new Error("Не вдалося почати заново.");
      saveCookingCredential(result.roomId, next);
      setAgainOpen(false);
      await navigate({ to: "/cook/$roomId", params: { roomId: result.roomId } });
    },
  };

  const peopleProps: PeopleProps = {
    open: peopleOpen,
    room: read,
    disabled: !online || pending,
    error,
    onOpenChange: setPeopleOpen,
    onCloseInvite: () =>
      invoke(() => roomApi.closeInvite({ roomId, participantToken: credential.participantToken })),
    onRotateInvite: () => {
      setPeopleOpen(false);
      invite.setInviteOpen(true);
    },
    onRemove: (memberId) =>
      invoke(() =>
        roomApi.removeMember({
          roomId,
          participantToken: credential.participantToken,
          memberId,
        }),
      ),
    onTransfer: (memberId) =>
      invoke(() =>
        roomApi.transferHost({
          roomId,
          participantToken: credential.participantToken,
          memberId,
        }),
      ),
    onContinueAlone: () =>
      invoke(() =>
        roomApi.continueAlone({ roomId, participantToken: credential.participantToken }),
      ),
    onLeave: () =>
      invoke(() => roomApi.leave({ roomId, participantToken: credential.participantToken })),
    onTakeover: (slot) =>
      invoke(() => steps.takeover({ roomId, participantToken: credential.participantToken, slot })),
    onSwap: (memberId) =>
      invoke(() =>
        steps.swapRoles({
          roomId,
          participantToken: credential.participantToken,
          memberId,
        }),
      ),
  };

  const inviteProps = {
    read,
    online,
    pending,
    error,
    inviteOpen: invite.inviteOpen,
    inviteUrl: invite.inviteUrl,
    inviteCopyState: invite.inviteCopyState,
    copyInvite: invite.copyInvite,
    rotateInviteLink: invite.rotateInviteLink,
    onOpenChange: invite.onOpenChange,
  };

  return {
    screen: "room" as const,
    read,
    actions,
    error,
    againOpen,
    setAgainOpen,
    setupProps,
    peopleOpen,
    peopleProps,
    helperProps,
    inviteProps,
  };
};
