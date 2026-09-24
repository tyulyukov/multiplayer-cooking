import { useEffect, useMemo, useRef, useState } from "react";

import type { AgentSettings, Memory } from "@/features/personalization/model/types";
import {
  clearSavedCookName,
  normalizeCookName,
  readSavedCookName,
  saveCookName,
} from "@/features/cooking/lib/cook-name";
import { useComposerShortcut } from "@/shared/hooks/use-composer-shortcut";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

import type { PersonalSettingsProps, Tab } from "../model/personal-settings-types";

type SaveState = "idle" | "saving" | "saved" | "error";

const saveDelayMs = 500;

function sameSettings(first: AgentSettings, second: AgentSettings) {
  return (
    first.tone === second.tone &&
    first.customInstructions === second.customInstructions &&
    first.about === second.about
  );
}

export function usePersonalSettings({
  open,
  onOpenChange,
  initialTab,
  memories,
  settings,
  onDelete,
  onSave,
  loading = false,
}: PersonalSettingsProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [draft, setDraft] = useState<AgentSettings>(settings);
  const [cookName, setCookName] = useState(() => readSavedCookName());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shortcut, setShortcut] = useComposerShortcut();
  const desktopKeyboard = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const activeTab = !desktopKeyboard && tab === "interface" ? "settings" : tab;

  const sortedMemories = useMemo(
    () => [...memories].sort((first, second) => second.updatedAt - first.updatedAt),
    [memories],
  );

  const draftRef = useRef(draft);
  const savedDraftRef = useRef(settings);
  const onSaveRef = useRef(onSave);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const changeVersionRef = useRef(0);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const opening = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (opening) {
      setCookName(readSavedCookName());
      setTab(!desktopKeyboard && initialTab === "interface" ? "settings" : initialTab);
    }

    if (!loading && !savingRef.current && sameSettings(draftRef.current, savedDraftRef.current)) {
      draftRef.current = settings;
      savedDraftRef.current = settings;
      setDraft(settings);
    }
  }, [desktopKeyboard, initialTab, loading, open, settings]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  function isDirty() {
    return !sameSettings(draftRef.current, savedDraftRef.current);
  }

  function scheduleSave() {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveSettings();
    }, saveDelayMs);
  }

  async function saveSettings() {
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
  }

  function changeDraft(changes: Partial<AgentSettings>) {
    const next = { ...draftRef.current, ...changes };
    draftRef.current = next;
    changeVersionRef.current += 1;
    setDraft(next);
    setSaveState("saving");
    setSaveError(null);
    scheduleSave();
  }

  function changeCookName(value: string) {
    setCookName(value);
    const nextName = normalizeCookName(value);

    if (nextName) {
      saveCookName(nextName);
    } else if (!value.trim()) {
      clearSavedCookName();
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      void saveSettings();
    }

    onOpenChange(nextOpen);
  }

  async function deleteMemory(id: Memory["_id"]) {
    setDeletingId(id);
    setDeleteError(null);

    try {
      await onDelete(id);
    } catch {
      setDeleteError("Не вдалося видалити спогад. Спробуй ще раз.");
    } finally {
      setDeletingId(null);
    }
  }

  return {
    setTab,
    draft,
    cookName,
    deletingId,
    deleteError,
    saveError,
    saveState,
    shortcut,
    setShortcut,
    desktopKeyboard,
    activeTab,
    sortedMemories,
    saveSettings,
    changeDraft,
    changeCookName,
    handleOpenChange,
    deleteMemory,
  };
}
