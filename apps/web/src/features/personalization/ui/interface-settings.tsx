import styles from "@/features/personalization/ui/personal-settings.module.scss";
import type { usePersonalSettings } from "../model/use-personal-settings";

type Props = Pick<ReturnType<typeof usePersonalSettings>, "shortcut" | "setShortcut">;

export function InterfaceSettings({ shortcut, setShortcut }: Props) {
  return (
    <section className={styles["personal-settings__interface"]}>
      <fieldset>
        <legend>Надсилання повідомлень</legend>
        <div className={styles["personal-settings__shortcut-options"]}>
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
  );
}
