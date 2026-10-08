import { createCookingCredential } from "@multiplayer-cooking/core/cooking/cooking-session";
import * as Crypto from "expo-crypto";

export const newCookingCredential = (inviteToken?: string) => {
  return createCookingCredential(Crypto.randomUUID, inviteToken);
};

export const newInviteToken = () => newCookingCredential().participantToken;

export const isRoomId = (value: string) => /^[a-zA-Z0-9]{16,}$/.test(value);
