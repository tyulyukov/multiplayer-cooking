import { useState, type Dispatch, type SetStateAction } from "react";
import { ConvexError } from "convex/values";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { useCookingRoom } from "@/features/cooking/api/use-cooking-room";
import {
  createCookingCredential,
  saveCookingCredential,
  type CookingCredential,
} from "@/features/cooking/lib/cooking-session";
import { isString } from "@/shared/lib/type-guards";

type RotateInvite = ReturnType<typeof useCookingRoom>["rotateInvite"];

type Props = {
  roomId: Id<"cookingRooms">;
  credential: CookingCredential | null;
  setCredential: Dispatch<SetStateAction<CookingCredential | null>>;
  roomApi: { rotateInvite: (...args: Parameters<RotateInvite>) => ReturnType<RotateInvite> };
  online: boolean;
  pending: boolean;
  setPending: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export const useRoomInvite = ({
  roomId,
  credential,
  setCredential,
  roomApi,
  online,
  pending,
  setPending,
  setError,
}: Props) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopyState, setInviteCopyState] = useState<"copied" | "manual" | null>(null);

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
        failure instanceof ConvexError && isString(failure.data)
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

  const onOpenChange = (open: boolean) => {
    setInviteOpen(open);

    if (!open) setInviteCopyState(null);
  };

  return {
    inviteOpen,
    setInviteOpen,
    inviteCopyState,
    inviteUrl,
    copyInvite,
    rotateInviteLink,
    onOpenChange,
  };
};
