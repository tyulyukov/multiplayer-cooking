import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Composer } from "@/components/composer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { proxyConvexStorageUrl } from "@/lib/convex-url";
import type { useAttachments } from "@/lib/use-attachments";
import { useMediaQuery } from "@/lib/use-media-query";
import { CookingMarkdown } from "./cooking-markdown";
import type { CookingRoomData } from "./cooking-session";
import { HelperProposalCard, type HelperProposal } from "./helper-proposal";
import "./cooking-helper.css";

type HelperMessage = FunctionReturnType<typeof api.cookingAssistance.listMessages>[number];
type Note = FunctionReturnType<typeof api.cookingAssistance.listNotes>[number] & {
  canDelete: boolean;
};
type Plan = NonNullable<CookingRoomData["room"]["plan"]>;

export function CookingHelper({
  plan,
  contextStepKey,
  chatRequestKey = 0,
  onContextChange,
  messages,
  proposals,
  notes,
  loaded,
  helperBusy,
  helperError,
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  online,
  finished,
  attachments,
  onAsk,
  onRetry,
  onApprove,
  onReject,
  onNote,
  onDeleteNote,
}: {
  plan: Plan;
  contextStepKey?: string;
  chatRequestKey?: number;
  onContextChange: (stepKey: string) => void;
  messages: HelperMessage[];
  proposals: HelperProposal[];
  notes: Note[];
  loaded: boolean;
  helperBusy: boolean;
  helperError?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (text: string) => void;
  online: boolean;
  finished: boolean;
  attachments: ReturnType<typeof useAttachments>;
  onAsk: (text: string) => Promise<unknown>;
  onRetry?: () => Promise<unknown>;
  onApprove: (id: Id<"cookingProposals">) => Promise<boolean>;
  onReject: (id: Id<"cookingProposals">) => Promise<boolean>;
  onNote: (text: string) => Promise<unknown>;
  onDeleteNote: (id: Id<"cookingNotes">) => Promise<boolean>;
}) {
  const mobile = useMediaQuery("(max-width: 639px)");
  const [tabSelection, setTabSelection] = useState<{ requestKey: number; tab: "chat" | "notes" }>({
    requestKey: chatRequestKey,
    tab: "chat",
  });
  const tab = tabSelection.requestKey === chatRequestKey ? tabSelection.tab : "chat";
  const setTab = (tab: "chat" | "notes") => setTabSelection({ requestKey: chatRequestKey, tab });
  const previousChatRequest = useRef(chatRequestKey);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const [nearBottom, setNearBottom] = useState(true);
  const [seenAt, setSeenAt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentPrompt = useRef(prompt);
  const currentNote = useRef(note);
  const latestReplyAt = Math.max(
    0,
    ...messages.filter((item) => item.role === "assistant").map((item) => item.createdAt),
    ...proposals.map((item) => item.createdAt),
  );
  const unread = latestReplyAt > seenAt;
  const busy = helperBusy || pending;
  const disabled = !online || pending;
  const context = plan.steps.find((step) => step.id === contextStepKey);
  const attachmentError = attachments.items.some((item) => item.state === "error");
  const uploading = attachments.items.some((item) => item.state === "uploading");
  const entries = [
    ...messages.map((message) => ({
      kind: "message" as const,
      createdAt: message.createdAt,
      value: message,
    })),
    ...proposals.map((proposal) => ({
      kind: "proposal" as const,
      createdAt: proposal.createdAt,
      value: proposal,
    })),
  ].sort((left, right) => left.createdAt - right.createdAt);

  useEffect(() => {
    currentPrompt.current = prompt;
  }, [prompt]);
  useEffect(() => {
    currentNote.current = note;
  }, [note]);
  useEffect(() => {
    if (!open || tab !== "chat") return;
    const requested = previousChatRequest.current !== chatRequestKey;
    previousChatRequest.current = chatRequestKey;
    const frame = requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      if (scroll && (nearBottom || requested)) scroll.scrollTop = scroll.scrollHeight;
      if (requested) {
        setNearBottom(true);
        if (!mobile) contentRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, tab, messages, proposals, busy, nearBottom, chatRequestKey, mobile]);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!open || tab !== "chat" || !scroll) return;
    const observer = new ResizeObserver(() => {
      if (nearBottom) scroll.scrollTop = scroll.scrollHeight;
    });
    observer.observe(scroll);
    return () => observer.disconnect();
  }, [open, tab, nearBottom]);
  useEffect(() => {
    if (!open || !mobile || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const content = contentRef.current;
    const update = () => {
      const content = contentRef.current;
      content?.style.setProperty("--helper-viewport-height", `${viewport.height}px`);
      content?.style.setProperty("--helper-viewport-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      content?.style.removeProperty("--helper-viewport-height");
      content?.style.removeProperty("--helper-viewport-top");
    };
  }, [open, mobile]);

  function scrollToLatest() {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    setNearBottom(true);
  }

  async function run(call: () => Promise<unknown>, failure: string): Promise<boolean> {
    if (pendingRef.current || !online) return false;
    pendingRef.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result = await call();
      if (result === false || result === null) throw new Error(failure);
      return true;
    } catch {
      setError(failure);
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function send(text: string) {
    if (helperBusy || finished || uploading || attachmentError) return;
    scrollToLatest();
    if (await run(() => onAsk(text), "Не вдалося надіслати повідомлення. Спробуй ще раз.")) {
      if (currentPrompt.current.trim() === text) onPromptChange("");
      attachments.clear();
    }
  }

  return (
    <Dialog
      modal={mobile}
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setNearBottom(true);
          setTab("chat");
        } else if (tab === "chat" && nearBottom) setSeenAt(latestReplyAt);
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="helper-launcher"
          aria-label="Відкрити помічника"
          data-open={open}
        >
          <HugeiconsIcon icon={BubbleChatIcon} size={22} strokeWidth={1.5} aria-hidden />
          <span>{helperBusy ? "Помічник відповідає…" : unread ? "Є відповідь" : "Помічник"}</span>
          {helperBusy ? (
            <Spinner />
          ) : unread ? (
            <span className="helper-unread-dot" aria-hidden />
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogPrimitive.Portal>
        {mobile && <DialogPrimitive.Overlay className="helper-backdrop" />}
        <DialogPrimitive.Content
          ref={contentRef}
          className="helper-window"
          aria-describedby={undefined}
          onInteractOutside={(event) => {
            if (!mobile) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            setTab("chat");
            setNearBottom(true);
            if (mobile) closeRef.current?.focus({ preventScroll: true });
            else contentRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
          }}
        >
          <header className="helper-header">
            <HugeiconsIcon icon={BubbleChatIcon} size={24} strokeWidth={1.5} aria-hidden />
            <DialogTitle>Помічник</DialogTitle>
            <DialogClose asChild>
              <Button ref={closeRef} variant="ghost" size="icon-lg" aria-label="Згорнути чат">
                <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} aria-hidden />
              </Button>
            </DialogClose>
          </header>
          <div className="helper-tabs" aria-label="Розділи помічника">
            <Button
              variant="ghost"
              size="chip"
              aria-pressed={tab === "chat"}
              onClick={() => setTab("chat")}
            >
              Чат
            </Button>
            <Button
              variant="ghost"
              size="chip"
              aria-pressed={tab === "notes"}
              onClick={() => setTab("notes")}
            >
              Нотатки{notes.length > 0 ? ` · ${notes.length}` : ""}
            </Button>
            <span>Для всіх на кухні</span>
          </div>
          {tab === "chat" ? (
            <>
              <label className="helper-context">
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
                className="helper-conversation"
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
                {!loaded && <p className="helper-muted">Завантажуємо розмову…</p>}
                {loaded && entries.length === 0 && (
                  <div className="helper-welcome">
                    <p>
                      {context
                        ? `Допоможу з кроком «${context.title}».`
                        : "Допоможу під час готування."}{" "}
                      Запитай, що незрозуміло, або покажи фото.
                    </p>
                    <div className="helper-suggestions">
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
                      className={`helper-message helper-message-${entry.value.role}`}
                    >
                      <span className="helper-message-author">
                        {entry.value.role === "assistant"
                          ? "Помічник"
                          : (entry.value.authorName ?? "Кухар")}
                      </span>
                      {entry.value.attachmentUrls && entry.value.attachmentUrls.length > 0 && (
                        <div className="helper-message-photos">
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
              <footer className="helper-footer">
                {!nearBottom && (
                  <Button
                    className="helper-latest"
                    variant="outline"
                    size="chip"
                    onClick={scrollToLatest}
                  >
                    <HugeiconsIcon icon={ArrowDown02Icon} size={16} strokeWidth={1.5} aria-hidden />
                    До останнього повідомлення
                  </Button>
                )}
                <div className="helper-status" role="status">
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
                  <p className="helper-error" role="alert">
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
                    className="helper-retry"
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
                  <p className="helper-muted">Готування завершено. Розмова збережена тут.</p>
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
          ) : (
            <div className="helper-notes">
              <div className="helper-note-list">
                {notes.length === 0 && (
                  <p className="helper-muted">
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
                        onClick={() =>
                          void run(
                            () => onDeleteNote(item._id),
                            "Не вдалося прибрати нотатку. Спробуй ще раз.",
                          )
                        }
                      >
                        Прибрати
                      </Button>
                    )}
                  </article>
                ))}
              </div>
              {error && (
                <p className="helper-error" role="alert">
                  {error}
                </p>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = note.trim();
                  if (!text) return;
                  void run(() => onNote(text), "Не вдалося зберегти нотатку. Спробуй ще раз.").then(
                    (ok) => {
                      if (ok && currentNote.current.trim() === text) setNote("");
                    },
                  );
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
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
