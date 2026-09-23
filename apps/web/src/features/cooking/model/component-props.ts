import type { SessionId } from "convex-helpers/server/sessions";

import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { CookingCredential } from "../lib/cooking-session";
import type { CookingRoomData, CookingSetup } from "./types";

export type CooksFormProps = {
  initial: number;
  initialServings?: number;
  initialName?: string;
  suggestedName?: string;
  disabled?: boolean;
  onGenerate: (setup: CookingSetup) => Promise<void> | void;
};

export type JoinRoomProps = {
  roomId: Id<"cookingRooms">;
  sessionId: SessionId | undefined;
  inviteToken?: string;
  onJoined: (credential: CookingCredential) => void;
  onRecoverHost: (sessionId: SessionId, participantToken: string) => Promise<unknown>;
  onJoin: (inviteToken: string, participantToken: string, name: string) => Promise<unknown>;
};

export type PeopleProps = {
  disabled: boolean;
  error: string | null;
  open: boolean;
  room: CookingRoomData;
  onOpenChange: (open: boolean) => void;
  onCloseInvite: () => void;
  onRotateInvite: () => void;
  onRemove: (memberId: Id<"cookingMembers">) => void;
  onTransfer: (memberId: Id<"cookingMembers">) => void;
  onContinueAlone: () => void;
  onLeave: () => void;
  onTakeover: (slot: number) => void;
  onSwap: (memberId: Id<"cookingMembers">) => void;
};
