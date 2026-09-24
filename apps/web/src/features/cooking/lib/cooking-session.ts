import { isPlainObject, isString } from "@/shared/lib/type-guards";

const keyPrefix = "multiplayer-cooking:room:";

export type CookingCredential = Readonly<{ participantToken: string; inviteToken?: string }>;

function isStoredCredential(value: unknown): value is CookingCredential {
  return (
    isPlainObject(value) &&
    "participantToken" in value &&
    isString(value.participantToken) &&
    (!("inviteToken" in value) || isString(value.inviteToken))
  );
}

function roomKey(roomId: string) {
  return `${keyPrefix}${roomId}`;
}

function makeToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export function createCookingCredential(inviteToken?: string): CookingCredential {
  return { participantToken: makeToken(), inviteToken };
}

export function readCookingCredential(roomId: string): CookingCredential | null {
  try {
    const raw = localStorage.getItem(roomKey(roomId));

    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (isStoredCredential(parsed)) {
      return { participantToken: parsed.participantToken, inviteToken: parsed.inviteToken };
    }
  } catch {
    // A malformed local value is treated as a guest without a saved place.
  }

  return null;
}

export function saveCookingCredential(roomId: string, credential: CookingCredential) {
  localStorage.setItem(roomKey(roomId), JSON.stringify(credential));
}

export function clearCookingCredential(roomId: string) {
  localStorage.removeItem(roomKey(roomId));
}

export function inviteFromHash() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get("invite");

  return value?.trim() || undefined;
}
