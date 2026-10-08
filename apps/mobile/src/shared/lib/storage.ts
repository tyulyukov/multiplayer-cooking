import {
  cookingCredentialKey,
  parseCookingCredential,
  type CookingCredential,
} from "@multiplayer-cooking/core/cooking/cooking-session";
import { cookNameStorageKey, normalizeCookName } from "@multiplayer-cooking/core/cooking/cook-name";
import type { UseStorage } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

type StoredSession = SessionId | undefined;

const timerSoundKey = "multiplayer-cooking.timer-sound";

// SecureStore keys allow only letters, digits, ".", "-" and "_".
const roomKey = (roomId: string) => cookingCredentialKey(roomId).replaceAll(":", ".");

const remove = (key: string) => {
  void SecureStore.deleteItemAsync(key);
};

// Synchronous reads let the first render use the saved session instead of minting a new one.
export const useSecureSessionStorage: UseStorage<StoredSession> = (key, initialValue) => {
  const [value, setValueInternal] = useState<StoredSession>(() => {
    const existing = SecureStore.getItem(key);

    if (existing) {
      // SAFETY: this key is only ever written below, by setValue, with a SessionId string.
      return existing as SessionId;
    }

    if (initialValue !== undefined) {
      SecureStore.setItem(key, initialValue);
    }

    return initialValue;
  });

  const setValue = (next: StoredSession) => {
    if (next === undefined) {
      remove(key);
    } else {
      SecureStore.setItem(key, next);
    }

    setValueInternal(next);
  };

  return [value, setValue] as const;
};

export const readCookingCredential = (roomId: string) => {
  return parseCookingCredential(SecureStore.getItem(roomKey(roomId)));
};

export const saveCookingCredential = (roomId: string, credential: CookingCredential) => {
  SecureStore.setItem(roomKey(roomId), JSON.stringify(credential));
};

export const clearCookingCredential = (roomId: string) => {
  remove(roomKey(roomId));
};

export const readSavedCookName = () => {
  return normalizeCookName(SecureStore.getItem(cookNameStorageKey) ?? "");
};

export const saveCookName = (value: string) => {
  const name = normalizeCookName(value);

  if (name) SecureStore.setItem(cookNameStorageKey, name);
};

export const clearSavedCookName = () => {
  remove(cookNameStorageKey);
};

export const readTimerSound = () => {
  return SecureStore.getItem(timerSoundKey) !== "off";
};

export const saveTimerSound = (enabled: boolean) => {
  SecureStore.setItem(timerSoundKey, enabled ? "on" : "off");
};
