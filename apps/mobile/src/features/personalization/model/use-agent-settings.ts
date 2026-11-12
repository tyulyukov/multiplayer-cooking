import type { AgentSettings } from "@multiplayer-cooking/core/personalization/types";
import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

const saveDelayMs = 500;

const sameSettings = (first: AgentSettings, second: AgentSettings) => {
  return (
    first.tone === second.tone &&
    first.customInstructions === second.customInstructions &&
    first.about === second.about
  );
};

type AgentSettingsOptions = {
  settings: AgentSettings;
  loading: boolean;
  onSave: (settings: AgentSettings) => Promise<void>;
};

// Debounced autosave that coalesces overlapping saves, adopts server changes only while the
// draft has no unsaved edits, and flushes when the sheet closes. Ported from the web dialog.
export const useAgentSettings = ({ settings, loading, onSave }: AgentSettingsOptions) => {
  const [draft, setDraft] = useState<AgentSettings>(settings);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const savedRef = useRef(settings);
  const onSaveRef = useRef(onSave);
  const loadingRef = useRef(loading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const versionRef = useRef(0);

  useEffect(() => {
    onSaveRef.current = onSave;
    loadingRef.current = loading;
  }, [onSave, loading]);

  useEffect(() => {
    if (!loading && !savingRef.current && sameSettings(draftRef.current, savedRef.current)) {
      draftRef.current = settings;
      savedRef.current = settings;
      setDraft(settings);
    }
  }, [loading, settings]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const save = async (): Promise<void> => {
    clearTimer();

    if (loadingRef.current) return;

    if (savingRef.current) {
      saveAgainRef.current = true;

      return;
    }

    if (sameSettings(draftRef.current, savedRef.current)) {
      setSaveState("saved");

      return;
    }

    const snapshot = draftRef.current;
    const version = versionRef.current;
    savingRef.current = true;
    setSaveState("saving");
    setSaveError(null);

    try {
      await onSaveRef.current(snapshot);
      savedRef.current = snapshot;

      if (versionRef.current === version && sameSettings(draftRef.current, snapshot)) {
        setSaveState("saved");
      } else {
        saveAgainRef.current = true;
      }
    } catch {
      setSaveState("error");
      setSaveError("Не вдалося зберегти налаштування. Спробуй ще раз.");
    } finally {
      savingRef.current = false;

      if (saveAgainRef.current) {
        saveAgainRef.current = false;
        void save();
      }
    }
  };

  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => () => void saveRef.current(), []);

  const change = (changes: Partial<AgentSettings>) => {
    const next = { ...draftRef.current, ...changes };
    draftRef.current = next;
    versionRef.current += 1;
    setDraft(next);
    setSaveState("saving");
    setSaveError(null);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, saveDelayMs);
  };

  return { draft, change, saveState, saveError, retry: () => void save() };
};
