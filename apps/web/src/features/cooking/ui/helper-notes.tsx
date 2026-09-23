import type { FC } from "react";
import styles from "@/features/cooking/ui/cooking-helper.module.scss";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

import type { CookingHelperProps } from "../model/helper-types";
import type { useCookingHelper } from "../model/use-cooking-helper";
type HelperNotesProps = Pick<CookingHelperProps, "notes"> &
  Pick<
    ReturnType<typeof useCookingHelper>,
    "disabled" | "error" | "note" | "setNote" | "saveNote" | "deleteNote"
  >;
export const HelperNotes: FC<HelperNotesProps> = ({
  notes,
  disabled,
  error,
  note,
  saveNote,
  deleteNote,
  setNote,
}) => {
  return (
    <div className={styles["helper-notes"]}>
      <div className={styles["helper-note-list"]}>
        {notes.length === 0 && (
          <p className={styles["helper-muted"]}>
            Збережи тут те, що варто пам’ятати під час готування.
          </p>
        )}
        {notes.map((item) => (
          <article key={item._id}>
            <p>{item.text}</p>
            {item.canDelete && (
              <Button
                variant="ghost"
                size="chip"
                disabled={disabled}
                onClick={() => void deleteNote(item._id)}
              >
                Прибрати
              </Button>
            )}
          </article>
        ))}
      </div>
      {error && (
        <p className={styles["helper-error"]} role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveNote();
        }}
      >
        <label htmlFor="helper-note">Нотатка для кухні</label>
        <Textarea
          id="helper-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Наприклад, наступного разу менше солі"
        />
        <Button variant="outline" disabled={disabled || !note.trim()}>
          Зберегти нотатку
        </Button>
      </form>
    </div>
  );
};
