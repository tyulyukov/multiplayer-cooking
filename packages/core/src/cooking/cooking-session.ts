import { isPlainObject, isString } from "../shared/type-guards";

export type CookingCredential = Readonly<{ participantToken: string; inviteToken?: string }>;

const isStoredCredential = (value: unknown): value is CookingCredential => {
  return (
    isPlainObject(value) &&
    "participantToken" in value &&
    isString(value.participantToken) &&
    (!("inviteToken" in value) || isString(value.inviteToken))
  );
};

export const cookingCredentialKey = (roomId: string) => {
  return `multiplayer-cooking:room:${roomId}`;
};

export const createCookingCredential = (
  randomUUID: () => string,
  inviteToken?: string,
): CookingCredential => {
  const participantToken = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");

  return { participantToken, inviteToken };
};

export const parseCookingCredential = (raw: string | null): CookingCredential | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isStoredCredential(parsed)) {
      return { participantToken: parsed.participantToken, inviteToken: parsed.inviteToken };
    }
  } catch {
    // A malformed local value is treated as a guest without a saved place.
  }

  return null;
};

export const inviteFromFragment = (fragment: string) => {
  const value = new URLSearchParams(fragment.replace(/^#/, "")).get("invite");

  return value?.trim() || undefined;
};
