import { ConvexError } from "convex/values";
import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useRef, useState } from "react";

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopyState, setInviteCopyState] = useState<"copied" | "manual" | null>(null);
  const roomApi = useCookingRoom(roomId, credential);
  const read = roomApi.room;
  const online = roomApi.online;
  const invoke = async (call: () => Promise<unknown>, key = "room") => {
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
        failure instanceof ConvexError && typeof failure.data === "string"
          ? failure.data
          : "Не вдалося синхронізувати зміну. Спробуй ще раз.",
      );
    } finally {
      if (key === "room") setPending(false);
      pendingOperations.current.delete(key);
      setPendingKeys([...pendingOperations.current]);
    }
  };
  const rotateInviteLink = async () => {
    if (!credential || !online || pending) return;
    const inviteToken = createCookingCredential().participantToken;
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
        setError("Не вдалося створити запрошення. Спробуй ще раз.");
        return;
      }
      const saved = { ...credential, inviteToken };
      saveCookingCredential(roomId, saved);
      setCredential(saved);
      setInviteCopyState(null);
    } catch (failure) {
      setError(
        failure instanceof ConvexError && typeof failure.data === "string"
          ? failure.data
          : "Не вдалося створити запрошення. Спробуй ще раз.",
      );
    } finally {
      setPending(false);
    }
  };
  const inviteUrl = credential?.inviteToken
    ? `${window.location.origin}/cook/${roomId}#invite=${credential.inviteToken}`
    : null;
  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopyState("copied");
    } catch {
      setInviteCopyState("manual");
    }
  };
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
    setInviteOpen,
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
      setInviteOpen(true);
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
    inviteOpen,
    inviteUrl,
    inviteCopyState,
    copyInvite,
    rotateInviteLink,
    onOpenChange: (open: boolean) => {
      setInviteOpen(open);
      if (!open) setInviteCopyState(null);
    },
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
