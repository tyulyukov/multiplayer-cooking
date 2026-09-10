import { useEffect, useMemo, useRef, useState } from "react";
import AiBrain01Icon from "@hugeicons/core-free-icons/AiBrain01Icon";
import Delete01Icon from "@hugeicons/core-free-icons/Delete01Icon";
import LaptopIcon from "@hugeicons/core-free-icons/LaptopIcon";
import UserSettings02Icon from "@hugeicons/core-free-icons/UserSettings02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  clearSavedCookName,
  normalizeCookName,
  readSavedCookName,
  saveCookName,
} from "@/lib/cook-name";
import { useComposerShortcut } from "@/lib/use-composer-shortcut";
import { useMediaQuery } from "@/lib/use-media-query";

import "./personal-settings.css";

export type Memory = {
  _id: string;
  kind: "allergy" | "dislike" | "preference";
  text: string;
  updatedAt: number;
};
export type AgentSettings = {
  tone: "friendly" | "concise" | "playful";
  customInstructions: string;
  about: string;
};
type Tab = "memories" | "settings" | "interface";
type SaveState = "idle" | "saving" | "saved" | "error";

const saveDelayMs = 500;

const memoryLabels: Record<Memory["kind"], string> = {
  allergy: "Алергія",
  dislike: "Не подобається",
  preference: "Вподобання",
};
const tones: Array<{ value: AgentSettings["tone"]; label: string; description: string }> = [
  { value: "friendly", label: "Теплий", description: "Пояснює спокійно і по-людськи" },
  { value: "concise", label: "Лаконічний", description: "Каже тільки потрібне" },
  { value: "playful", label: "Грайливий", description: "Додає трохи настрою" },
];

function sameSettings(first: AgentSettings, second: AgentSettings) {
  return (
    first.tone === second.tone &&
    first.customInstructions === second.customInstructions &&
    first.about === second.about
  );
}

export function PersonalSettings({
  open,
  onOpenChange,
  initialTab,
  memories,
  settings,
  onDelete,
  onSave,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: Tab;
  memories: Memory[];
  settings: AgentSettings;
  onDelete: (id: string) => Promise<void>;
  onSave: (settings: AgentSettings) => Promise<void>;
  loading?: boolean;
}) {
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

  function changeDraft(next: AgentSettings) {
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

  async function deleteMemory(id: string) {
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
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="personal-settings" aria-describedby={undefined}>
        <DialogHeader className="personal-settings__header">
          <DialogTitle>
            {activeTab === "memories"
              ? "Що агент пам'ятає про тебе"
              : activeTab === "settings"
                ? "Як агент говорить з тобою"
                : "Клавіатура в чаті"}
          </DialogTitle>
        </DialogHeader>
        <div className="personal-settings__tabs" aria-label="Профіль">
          <button
            type="button"
            aria-pressed={activeTab === "memories"}
            onClick={() => setTab("memories")}
          >
            <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={1.5} aria-hidden />
            Спогади
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "settings"}
            onClick={() => setTab("settings")}
          >
            <HugeiconsIcon icon={UserSettings02Icon} strokeWidth={1.5} aria-hidden />
            Агент
          </button>
          {desktopKeyboard ? (
            <button
              type="button"
              aria-pressed={activeTab === "interface"}
              onClick={() => setTab("interface")}
            >
              <HugeiconsIcon icon={LaptopIcon} strokeWidth={1.5} aria-hidden />
              Інтерфейс
            </button>
          ) : null}
        </div>
        <div className="personal-settings__body">
          {activeTab === "memories" ? (
            <section className="personal-settings__memories" aria-live="polite">
              {loading ? <p className="personal-settings__quiet">Завантажуємо спогади…</p> : null}
              {!loading && sortedMemories.length === 0 ? (
                <div className="personal-settings__empty illustrated-empty">
                  <KitchenIllustration name="memory-fridge" />
                  <p>Щойно щось стане для тебе важливим, агент збереже це тут.</p>
                </div>
              ) : null}
              {sortedMemories.map((memory) => (
                <article className="personal-settings__memory" key={memory._id}>
                  <div>
                    <span
                      className={`personal-settings__memory-kind personal-settings__memory-kind--${memory.kind}`}
                    >
                      {memoryLabels[memory.kind]}
                    </span>
                    <p>{memory.text}</p>
                    <time dateTime={new Date(memory.updatedAt).toISOString()}>
                      {new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(
                        memory.updatedAt,
                      )}
                    </time>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Видалити спогад: ${memory.text}`}
                    disabled={deletingId === memory._id}
                    onClick={() => void deleteMemory(memory._id)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} strokeWidth={1.5} aria-hidden />
                  </Button>
                </article>
              ))}
              {deleteError ? (
                <p className="personal-settings__error" role="alert">
                  {deleteError}
                </p>
              ) : null}
            </section>
          ) : activeTab === "settings" ? (
            <section className="personal-settings__form">
              <label>
                Твоє ім’я на кухні
                <Input
                  value={cookName}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Наприклад, Аня"
                  disabled={loading}
                  onChange={(event) => changeCookName(event.target.value)}
                />
              </label>
              <fieldset>
                <legend>Тон агента</legend>
                <div className="personal-settings__tone-options">
                  {tones.map((tone) => (
                    <label key={tone.value} data-selected={draft.tone === tone.value}>
                      <input
                        type="radio"
                        name="tone"
                        value={tone.value}
                        checked={draft.tone === tone.value}
                        disabled={loading}
                        onChange={() => changeDraft({ ...draftRef.current, tone: tone.value })}
                      />
                      <span>{tone.label}</span>
                      <small>{tone.description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Що ще враховувати
                <Textarea
                  value={draft.customInstructions}
                  maxLength={1000}
                  rows={4}
                  placeholder="Наприклад, завжди пропонуй простішу альтернативу"
                  disabled={loading}
                  onChange={(event) =>
                    changeDraft({ ...draftRef.current, customInstructions: event.target.value })
                  }
                />
                <small>{draft.customInstructions.length}/1000</small>
              </label>
              <label>
                Розкажи про себе
                <Textarea
                  value={draft.about}
                  maxLength={600}
                  rows={3}
                  placeholder="Наприклад, готую для двох і не люблю довго стояти біля плити"
                  disabled={loading}
                  onChange={(event) =>
                    changeDraft({ ...draftRef.current, about: event.target.value })
                  }
                />
                <small>{draft.about.length}/600</small>
              </label>
            </section>
          ) : (
            <section className="personal-settings__interface">
              <fieldset>
                <legend>Надсилання повідомлень</legend>
                <div className="personal-settings__shortcut-options">
                  <label data-selected={shortcut === "enter"}>
                    <input
                      type="radio"
                      name="composer-shortcut"
                      checked={shortcut === "enter"}
                      onChange={() => setShortcut("enter")}
                    />
                    <span>Enter надсилає</span>
                    <small>Shift + Enter додає новий рядок</small>
                  </label>
                  <label data-selected={shortcut === "shift-enter"}>
                    <input
                      type="radio"
                      name="composer-shortcut"
                      checked={shortcut === "shift-enter"}
                      onChange={() => setShortcut("shift-enter")}
                    />
                    <span>Shift + Enter надсилає</span>
                    <small>Enter додає новий рядок</small>
                  </label>
                </div>
                <small>Зберігається лише у цьому браузері.</small>
              </fieldset>
            </section>
          )}
        </div>
        <div
          className="personal-settings__save-status"
          data-state={saveState}
          aria-live={activeTab === "settings" ? "polite" : undefined}
        >
          {activeTab === "settings" ? (
            <>
              {saveState === "idle" ? "Зміни зберігаються автоматично" : null}
              {saveState === "saving" ? <span className="t-shimmer">Зберігаємо…</span> : null}
              {saveState === "saved" ? "Збережено" : null}
              {saveState === "error" && saveError ? (
                <>
                  <span role="alert">{saveError}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void saveSettings()}
                  >
                    Повторити
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
