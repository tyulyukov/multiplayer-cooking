import { useCallback, useSyncExternalStore } from "react";

import type { ComposerSendShortcut } from "@/shared/lib/composer-shortcut";

const storageKey = "multiplayer-cooking.composer-send-shortcut";
const changeEvent = "multiplayer-cooking:composer-send-shortcut";
const defaultShortcut: ComposerSendShortcut = "enter";

const readShortcut = (): ComposerSendShortcut => {
  if (typeof window === "undefined") {
    return defaultShortcut;
  }

  try {
    return window.localStorage.getItem(storageKey) === "shift-enter"
      ? "shift-enter"
      : defaultShortcut;
  } catch {
    return defaultShortcut;
  }
};

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
};

export const useComposerShortcut = () => {
  const shortcut = useSyncExternalStore(subscribe, readShortcut, () => defaultShortcut);
  const setShortcut = useCallback((next: ComposerSendShortcut) => {
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      return;
    }

    window.dispatchEvent(new Event(changeEvent));
  }, []);

  return [shortcut, setShortcut] as const;
};
