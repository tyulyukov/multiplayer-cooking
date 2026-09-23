import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/shared/ui/composer/composer.module.scss";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { AI_REQUEST_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { shouldSubmitComposerShortcut } from "@/shared/lib/composer-shortcut";

import type { ComposerProps } from "./types";
import { useComposer } from "./use-composer";
import { ComposerAttachments } from "./composer-attachments";
import { ComposerSubmit } from "./composer-submit";
export const Composer: FC<ComposerProps> = (props) => {
  const {
    mode,
    value,
    busy,
    attachments,
    onChange,
    onRemoveAttachment,
    questionnaire,
    questionnaireKey,
  } = props;
  const model = useComposer(props);
  const {
    inputId,
    composerRef,
    textareaRef,
    fileInputRef,
    dismissedQuestionnaireKey,
    setDismissedQuestionnaireKey,
    shortcut,
    desktopKeyboard,
    overLimit,
    showCounter,
    canAttach,
    handleSubmit,
    submitWithShortcut,
    pickFiles,
  } = model;
  if (questionnaire && questionnaireKey !== dismissedQuestionnaireKey) {
    return (
      <div className={cn(styles["composer"], "chrome")} data-mode={mode}>
        {questionnaire}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDismissedQuestionnaireKey(questionnaireKey)}
        >
          Написати повідомлення
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={composerRef}
      className={cn(styles["composer"], styles["t-input"], "chrome")}
      data-mode={mode}
      data-over-limit={overLimit}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={inputId}>
        {mode === "helper" ? "Повідомлення помічнику" : "Що хочеш приготувати"}
      </label>
      <Textarea
        ref={textareaRef}
        id={inputId}
        name="request"
        variant="ghost"
        value={value}
        aria-invalid={overLimit}
        placeholder={
          mode === "home"
            ? "Опиши страву або напиши, що є вдома"
            : mode === "helper"
              ? "Запитай або додай фото…"
              : "Уточни або попроси інше"
        }
        className={styles["request-textarea"]}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (shouldSubmitComposerShortcut(event.nativeEvent, shortcut, desktopKeyboard)) {
            event.preventDefault();
            submitWithShortcut();
          }
        }}
      />

      <ComposerAttachments
        attachments={attachments}
        busy={busy}
        onRemoveAttachment={onRemoveAttachment}
      />

      <div className={styles["composer-actions"]} data-composer-actions>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => pickFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className={styles["attach-button"]}
          aria-label="Додати фото"
          disabled={!canAttach}
          onClick={() => fileInputRef.current?.click()}
        >
          <HugeiconsIcon icon={ImageAdd01Icon} className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
        <span className={styles["character-count"]} data-over-limit={overLimit} aria-live="polite">
          {showCounter ? `${value.length}/${AI_REQUEST_MAX_CHARACTERS}` : null}
          {overLimit && <span className="sr-only">, забагато знаків</span>}
        </span>
        <ComposerSubmit mode={mode} busy={busy} value={value} {...model} />
      </div>
    </form>
  );
};
