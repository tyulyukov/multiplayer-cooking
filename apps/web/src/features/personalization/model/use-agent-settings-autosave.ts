import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentSettings } from "./types";
import type { PersonalSettingsProps } from "./personal-settings-types";

type SaveState = "idle" | "saving" | "saved" | "error";

const saveDelayMs = 500;

const sameSettings = (first: AgentSettings, second: AgentSettings) => {
  return (
    first.tone === second.tone &&
    first.customInstructions === second.customInstructions &&
    first.about === second.about
  );
};

type Props = Pick<PersonalSettingsProps, "settings" | "onSave"> & { loading: boolean };

export const useAgentSettingsAutosave = ({ settings, onSave, loading }: Props) => {
  const [draft, setDraft] = useState<AgentSettings>(settings);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const draftRef = useRef(draft);
  const savedDraftRef = useRef(settings);
  const onSaveRef = useRef(onSave);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const changeVersionRef = useRef(0);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const syncSettings = useCallback(() => {
    if (!loading && !savingRef.current && sameSettings(draftRef.current, savedDraftRef.current)) {
      draftRef.current = settings;
      savedDraftRef.current = settings;
      setDraft(settings);
    }
  }, [loading, settings]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const isDirty = () => {
    return !sameSettings(draftRef.current, savedDraftRef.current);
  };

  const scheduleSave = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveSettings();
    }, saveDelayMs);
  };

  const saveSettings = async () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (loading) return;

    if (savingRef.current) {
      saveAgainRef.current = true;

      return;
    }

    if (!isDirty()) {
      setSaveState("saved");

      return;
    }

    const snapshot = draftRef.current;
    const version = changeVersionRef.current;
    savingRef.current = true;
    setSaveState("saving");
    setSaveError(null);

    try {
      await onSaveRef.current(snapshot);
      savedDraftRef.current = snapshot;

      if (changeVersionRef.current === version && sameSettings(draftRef.current, snapshot)) {
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
        void saveSettings();
      }
    }
  };

  const changeDraft = (changes: Partial<AgentSettings>) => {
    const next = { ...draftRef.current, ...changes };
    draftRef.current = next;
    changeVersionRef.current += 1;
    setDraft(next);
    setSaveState("saving");
    setSaveError(null);
    scheduleSave();
  };

  return { draft, saveError, saveState, saveSettings, changeDraft, syncSettings };
};
