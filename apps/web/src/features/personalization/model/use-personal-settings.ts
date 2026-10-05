import { useAgentSettingsAutosave } from "./use-agent-settings-autosave";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Memory } from "@/features/personalization/model/types";
import {
  clearSavedCookName,
  normalizeCookName,
  readSavedCookName,
  saveCookName,
} from "@/features/cooking/lib/cook-name";
import { useComposerShortcut } from "@/shared/hooks/use-composer-shortcut";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

import type { PersonalSettingsProps, Tab } from "../model/personal-settings-types";

export const usePersonalSettings = ({
  open,
  onOpenChange,
  initialTab,
  memories,
  settings,
  onDelete,
  onSave,
  loading = false,
}: PersonalSettingsProps) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [cookName, setCookName] = useState(() => readSavedCookName());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [shortcut, setShortcut] = useComposerShortcut();
  const desktopKeyboard = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const activeTab = !desktopKeyboard && tab === "interface" ? "settings" : tab;

  const sortedMemories = useMemo(
    () => [...memories].sort((first, second) => second.updatedAt - first.updatedAt),
    [memories],
  );

  const { draft, saveError, saveState, saveSettings, changeDraft, syncSettings } =
    useAgentSettingsAutosave({ settings, onSave, loading });

  const wasOpenRef = useRef(open);

  useEffect(() => {
    const opening = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (opening) {
      setCookName(readSavedCookName());
      setTab(!desktopKeyboard && initialTab === "interface" ? "settings" : initialTab);
    }

    syncSettings();
  }, [desktopKeyboard, initialTab, loading, open, settings, syncSettings]);

  const changeCookName = (value: string) => {
    setCookName(value);
    const nextName = normalizeCookName(value);

    if (nextName) {
      saveCookName(nextName);
    } else if (!value.trim()) {
      clearSavedCookName();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void saveSettings();
    }

    onOpenChange(nextOpen);
  };

  const deleteMemory = async (id: Memory["_id"]) => {
    setDeletingId(id);
    setDeleteError(null);

    try {
      await onDelete(id);
    } catch {
      setDeleteError("Не вдалося видалити спогад. Спробуй ще раз.");
    } finally {
      setDeletingId(null);
    }
  };

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
};
