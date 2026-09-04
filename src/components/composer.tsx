import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef } from "react";
import type { FormEvent } from "react";

import { AI_REQUEST_MAX_CHARACTERS } from "../../convex/lib/ai_config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  onChange,
  onSubmit,
}: {
  mode: "home" | "chat";
  value: string;
  busy: boolean;
  autoFocus: boolean;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
}) {
  const composerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overLimit = isOverLimit(value);
  const showCounter = value.length >= counterThreshold;

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

    if (busy) {
      return;
    }

    if (overLimit) {
      shake();
      textareaRef.current?.focus();
      return;
    }

    const text = value.trim();

    if (!text) {
      textareaRef.current?.focus();
      return;
    }

    textareaRef.current?.blur();
    onSubmit(text);
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
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />

      <div className="composer-actions">
        <span className="character-count" data-over-limit={overLimit} aria-live="polite">
          {showCounter ? `${value.length}/${AI_REQUEST_MAX_CHARACTERS}` : null}
          {overLimit && <span className="sr-only">, забагато знаків</span>}
        </span>
        {mode === "home" ? (
          <Button
            type="submit"
            size="xl"
            disabled={overLimit}
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
            disabled={overLimit || busy}
            aria-label="Надіслати"
            className="send-button"
          >
            <HugeiconsIcon icon={ArrowUp02Icon} className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        )}
      </div>
    </form>
  );
}
