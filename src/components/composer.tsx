import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tooltip } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { AI_MAX_IMAGES, AI_REQUEST_MAX_CHARACTERS } from "../../convex/lib/ai_config";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
  AttachmentMedia,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { shouldSubmitComposerShortcut } from "@/lib/composer-shortcut";
import { useComposerShortcut } from "@/lib/use-composer-shortcut";
import { useMediaQuery } from "@/lib/use-media-query";

export type ComposerAttachment = Readonly<{
  id: string;
  previewUrl: string;
  state: "uploading" | "done" | "error";
}>;

const counterThreshold = Math.floor(AI_REQUEST_MAX_CHARACTERS * 0.8);
const shakeDurationMs = 300;

function isOverLimit(text: string) {
  return text.length > AI_REQUEST_MAX_CHARACTERS;
}

export function Composer({
  mode,
  value,
  busy,
  autoFocus,
  attachments,
  onChange,
  onSubmit,
  onAttach,
  onRemoveAttachment,
  questionnaire,
  questionnaireKey,
}: {
  questionnaire?: ReactNode;
  questionnaireKey?: string;
  mode: "home" | "chat";
  value: string;
  busy: boolean;
  autoFocus: boolean;
  attachments: readonly ComposerAttachment[];
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}) {
  const composerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittedWithShortcutRef = useRef(false);
  const [dismissedQuestionnaireKey, setDismissedQuestionnaireKey] = useState<string>();
  const [shortcut] = useComposerShortcut();
  const desktopKeyboard = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const overLimit = isOverLimit(value);
  const showCounter = value.length >= counterThreshold;
  const readyAttachments = attachments.filter((item) => item.state === "done");
  const uploading = attachments.some((item) => item.state === "uploading");
  const canAttach = attachments.length < AI_MAX_IMAGES && !busy;

  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || CSS.supports("field-sizing", "content")) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  function shake() {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    composer.classList.remove("is-shaking");
    void composer.offsetWidth;
    composer.classList.add("is-shaking");
    window.setTimeout(() => composer.classList.remove("is-shaking"), shakeDurationMs);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedWithShortcut = submittedWithShortcutRef.current;
    submittedWithShortcutRef.current = false;

    if (busy) {
      return;
    }

    if (overLimit) {
      shake();
      textareaRef.current?.focus();
      return;
    }

    const text = value.trim();

    if ((!text && readyAttachments.length === 0) || uploading) {
      textareaRef.current?.focus();
      return;
    }

    if (!submittedWithShortcut) {
      textareaRef.current?.blur();
    }
    onSubmit(text);
  }

  function submitWithShortcut() {
    const form = textareaRef.current?.form;

    if (!form) {
      return;
    }

    submittedWithShortcutRef.current = true;
    form.requestSubmit();
  }

  const shortcutDescription =
    shortcut === "enter"
      ? ["Enter · надіслати", "Shift + Enter · новий рядок"]
      : ["Shift + Enter · надіслати", "Enter · новий рядок"];

  function pickFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));

    if (files.length > 0) {
      onAttach(files.slice(0, AI_MAX_IMAGES - attachments.length));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (questionnaire && questionnaireKey !== dismissedQuestionnaireKey) {
    return (
      <div className="composer chrome" data-mode={mode}>
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
      className="composer chrome t-input"
      data-mode={mode}
      data-over-limit={overLimit}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="cooking-request">
        Що хочеш приготувати
      </label>
      <Textarea
        ref={textareaRef}
        id="cooking-request"
        name="request"
        variant="ghost"
        value={value}
        readOnly={busy}
        aria-invalid={overLimit}
        placeholder={
          mode === "home" ? "Опиши страву або напиши, що є вдома" : "Уточни або попроси інше"
        }
        className="request-textarea"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (shouldSubmitComposerShortcut(event.nativeEvent, shortcut, desktopKeyboard)) {
            event.preventDefault();
            submitWithShortcut();
          }
        }}
      />

      {attachments.length > 0 && (
        <AttachmentGroup className="composer-attachments" aria-label="Додані фото">
          {attachments.map((item) => (
            <Attachment key={item.id} state={item.state} size="sm" orientation="vertical">
              <AttachmentMedia variant="image">
                <img src={item.previewUrl} alt="" />
              </AttachmentMedia>
              <AttachmentActions>
                <AttachmentAction
                  aria-label="Прибрати фото"
                  disabled={busy}
                  onClick={() => onRemoveAttachment(item.id)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}

      <div className="composer-actions">
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
          className="attach-button"
          aria-label="Додати фото"
          disabled={!canAttach}
          onClick={() => fileInputRef.current?.click()}
        >
          <HugeiconsIcon icon={ImageAdd01Icon} className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
        <span className="character-count" data-over-limit={overLimit} aria-live="polite">
          {showCounter ? `${value.length}/${AI_REQUEST_MAX_CHARACTERS}` : null}
          {overLimit && <span className="sr-only">, забагато знаків</span>}
        </span>
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root
            key={desktopKeyboard ? "desktop" : "touch"}
            open={desktopKeyboard ? undefined : false}
          >
            <Tooltip.Trigger asChild>
              {mode === "home" ? (
                <Button
                  type="submit"
                  size="xl"
                  disabled={overLimit || uploading}
                  aria-busy={busy}
                  aria-disabled={busy}
                  className="generate-button"
                >
                  <HugeiconsIcon
                    icon={CookingPotIcon}
                    className="size-5 pot-icon"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {busy ? "Генеруємо…" : "Згенерувати"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-lg"
                  disabled={overLimit || busy || uploading}
                  aria-label="Надіслати"
                  className="send-button"
                >
                  <HugeiconsIcon
                    icon={ArrowUp02Icon}
                    className="size-5"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Button>
              )}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="rounded-md border-2 border-foreground bg-card px-3 py-2 text-xs text-foreground"
                side="top"
                sideOffset={8}
              >
                <p>{shortcutDescription[0]}</p>
                <p>{shortcutDescription[1]}</p>
                <p className="mt-1 text-muted-foreground">Можна змінити в налаштуваннях</p>
                <Tooltip.Arrow className="fill-card" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </form>
  );
}
