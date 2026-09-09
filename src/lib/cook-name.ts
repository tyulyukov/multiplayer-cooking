const storageKey = "multiplayer-cooking.cook-name";
const maxCookNameLength = 80;

export function normalizeCookName(value: string) {
  const name = value.trim();

  return name.length > 0 && name.length <= maxCookNameLength ? name : "";
}

export function readSavedCookName() {
  if (typeof window === "undefined") return "";

  try {
    return normalizeCookName(window.localStorage.getItem(storageKey) ?? "");
  } catch {
    return "";
  }
}

export function saveCookName(value: string) {
  const name = normalizeCookName(value);

  if (!name || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, name);
  } catch {
    return;
  }
}
