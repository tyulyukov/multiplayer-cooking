import type { FC } from "react";
import styles from "@/features/cooking/ui/cooking-helper.module.scss";
import { cn } from "@/shared/lib/utils";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Composer } from "@/shared/ui/composer/composer";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";
import { CookingMarkdown } from "./cooking-markdown";
import { HelperProposalCard } from "./helper-proposal";

import type { CookingHelperProps } from "../model/helper-types";
import type { useCookingHelper } from "../model/use-cooking-helper";

type HelperChatProps = Pick<
  CookingHelperProps,
  | "plan"
  | "onContextChange"
  | "loaded"
  | "onPromptChange"
  | "finished"
  | "helperBusy"
  | "onApprove"
  | "onReject"
  | "online"
  | "helperError"
  | "onRetry"
  | "prompt"
  | "attachments"
> &
  Pick<
    ReturnType<typeof useCookingHelper>,
    | "context"
    | "scrollRef"
    | "setNearBottom"
    | "entries"
    | "contentRef"
    | "nearBottom"
    | "scrollToLatest"
    | "disabled"
    | "run"
    | "busy"
    | "pending"
    | "uploading"
    | "error"
    | "attachmentError"
    | "send"
  >;

export const HelperChat: FC<HelperChatProps> = ({
  plan,
  onContextChange,
  loaded,
  onPromptChange,
  finished,
  helperBusy,
  onApprove,
  onReject,
  online,
  helperError,
  onRetry,
  prompt,
  attachments,
  context,
  scrollRef,
  setNearBottom,
  entries,
  contentRef,
  nearBottom,
  scrollToLatest,
  disabled,
  run,
  busy,
  pending,
  uploading,
  error,
  attachmentError,
  send,
}) => {
  return (
    <>
      <label className={styles["helper-context"]}>
        <span>Про що говоримо</span>
        <select
          aria-label="Крок для помічника"
          value={context?.id ?? ""}
          onChange={(event) => onContextChange(event.target.value)}
        >
          <option value="">Уся страва</option>
          {plan.steps.map((step, index) => (
            <option key={step.id} value={step.id}>
              {index + 1}. {step.title}
            </option>
          ))}
        </select>
      </label>
      <div
        ref={scrollRef}
        className={styles["helper-conversation"]}
        role="log"
        aria-label="Розмова з помічником"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          setNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
        }}
      >
        {!loaded && <p className={styles["helper-muted"]}>Завантажуємо розмову…</p>}
        {loaded && entries.length === 0 && (
          <div className={styles["helper-welcome"]}>
            <p>
              {context ? `Допоможу з кроком «${context.title}».` : "Допоможу під час готування."}{" "}
              Запитай, що незрозуміло, або покажи фото.
            </p>
            <div className={styles["helper-suggestions"]}>
              {["Хочу замінити інгредієнт", "Як зрозуміти, що готово?"].map((text) => (
                <Button
                  key={text}
                  variant="outline"
                  size="chip"
                  onClick={() => {
                    onPromptChange(text);
                    contentRef.current?.querySelector("textarea")?.focus();
                  }}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry) =>
          entry.kind === "message" ? (
            <div
              key={entry.value._id}
              className={cn(styles["helper-message"], styles[`helper-message-${entry.value.role}`])}
            >
              <span className={styles["helper-message-author"]}>
                {entry.value.role === "assistant"
                  ? "Помічник"
                  : (entry.value.authorName ?? "Кухар")}
              </span>
              {entry.value.attachmentUrls && entry.value.attachmentUrls.length > 0 && (
                <div className={styles["helper-message-photos"]}>
                  {entry.value.attachmentUrls.map((url) => (
                    <a
                      key={url}
                      href={proxyConvexStorageUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Відкрити фото"
                    >
                      <img
                        src={proxyConvexStorageUrl(url)}
                        alt="Фото з кухні"
                        onLoad={() => {
                          if (nearBottom) scrollToLatest();
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {entry.value.text && <CookingMarkdown text={entry.value.text} />}
            </div>
          ) : (
            <HelperProposalCard
              key={entry.value._id}
              proposal={entry.value}
              currentPlan={plan}
              disabled={disabled || finished || helperBusy}
              onApprove={() =>
                void run(
                  () => onApprove(entry.value._id),
                  "Не вдалося застосувати зміни. Попроси помічника перевірити їх ще раз.",
                )
              }
              onReject={() =>
                void run(
                  () => onReject(entry.value._id),
                  "Не вдалося відхилити зміни. Спробуй ще раз.",
                )
              }
            />
          ),
        )}
      </div>
      <footer className={styles["helper-footer"]}>
        {!nearBottom && (
          <Button
            className={styles["helper-latest"]}
            variant="outline"
            size="chip"
            onClick={scrollToLatest}
          >
            <HugeiconsIcon icon={ArrowDown02Icon} size={16} strokeWidth={1.5} aria-hidden />
            До останнього повідомлення
          </Button>
        )}
        <div className={styles["helper-status"]} role="status">
          {busy ? (
            <>
              <Spinner />
              <span>{pending ? "Зберігаємо…" : "Помічник готує відповідь…"}</span>
            </>
          ) : uploading ? (
            <>
              <Spinner />
              <span>Додаємо фото…</span>
            </>
          ) : null}
        </div>
        {(!online || error || helperError || attachmentError) && (
          <p className={styles["helper-error"]} role="alert">
            {!online
              ? "Немає з’єднання. Повідомлення можна надіслати, коли воно відновиться."
              : (error ??
                (attachmentError
                  ? "Фото не додалося. Прибери його та спробуй додати ще раз."
                  : "Помічник не відповів. Спробуй надіслати повідомлення ще раз."))}
          </p>
        )}
        {helperError && onRetry && !finished && (
          <Button
            variant="outline"
            size="chip"
            className={styles["helper-retry"]}
            disabled={!online || busy}
            onClick={() => {
              scrollToLatest();
              void run(onRetry, "Не вдалося повторити запит. Спробуй ще раз.");
            }}
          >
            Спробувати ще раз
          </Button>
        )}
        {finished ? (
          <p className={styles["helper-muted"]}>Готування завершено. Розмова збережена тут.</p>
        ) : (
          <Composer
            mode="helper"
            value={prompt}
            onChange={onPromptChange}
            onSubmit={(text) => void send(text)}
            busy={busy || !online || !loaded}
            autoFocus={false}
            attachments={attachments.items}
            onAttach={(files) => void attachments.add(files)}
            onRemoveAttachment={attachments.remove}
          />
        )}
      </footer>
    </>
  );
};
