const storageKey = "multiplayer-cooking.cook-name";

const maxCookNameLength = 80;

export const normalizeCookName = (value: string) => {
  const name = value.trim();

  return name.length > 0 && name.length <= maxCookNameLength ? name : "";
};

export const resolveCookName = (initialName: string, savedName: string, suggestedName: string) => {
  return (
    normalizeCookName(savedName) ||
    normalizeCookName(initialName) ||
    normalizeCookName(suggestedName)
  );
};

export const readSavedCookName = () => {
  if (typeof window === "undefined") return "";

  try {
    return normalizeCookName(window.localStorage.getItem(storageKey) ?? "");
  } catch {
    return "";
  }
};

export const saveCookName = (value: string) => {
  const name = normalizeCookName(value);

  if (!name || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, name);
  } catch {
    return;
  }
};

export const clearSavedCookName = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    return;
  }
};
