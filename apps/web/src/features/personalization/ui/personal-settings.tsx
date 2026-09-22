import AiBrain01Icon from "@hugeicons/core-free-icons/AiBrain01Icon";
import LaptopIcon from "@hugeicons/core-free-icons/LaptopIcon";
import UserSettings02Icon from "@hugeicons/core-free-icons/UserSettings02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

import "./personal-settings.css";
import type { PersonalSettingsProps } from "../model/personal-settings-types";
import { usePersonalSettings } from "../model/use-personal-settings";
import { PersonalMemories } from "./personal-memories";
import { AgentSettingsForm } from "./agent-settings-form";
import { InterfaceSettings } from "./interface-settings";
export function PersonalSettings(props: PersonalSettingsProps) {
  const { open, loading = false } = props;
  const model = usePersonalSettings(props);
  const {
    handleOpenChange,
    activeTab,
    setTab,
    desktopKeyboard,
    saveState,
    saveError,
    saveSettings,
  } = model;
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
            <PersonalMemories loading={loading} {...model} />
          ) : activeTab === "settings" ? (
            <AgentSettingsForm loading={loading} {...model} />
          ) : (
            <InterfaceSettings {...model} />
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
