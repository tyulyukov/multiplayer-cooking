import { cookNameStorageKey, normalizeCookName } from "@multiplayer-cooking/core/cooking/cook-name";

export const readSavedCookName = () => {
  if (typeof window === "undefined") return "";

  try {
    return normalizeCookName(window.localStorage.getItem(cookNameStorageKey) ?? "");
  } catch {
    return "";
  }
};

export const saveCookName = (value: string) => {
  const name = normalizeCookName(value);

  if (!name || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(cookNameStorageKey, name);
  } catch {
    return;
  }
};

export const clearSavedCookName = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(cookNameStorageKey);
  } catch {
    return;
  }
};
