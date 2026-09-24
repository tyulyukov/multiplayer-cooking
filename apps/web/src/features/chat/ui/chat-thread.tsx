import styles from "@/features/chat/ui/chat-thread.module.scss";
import { generationStatus } from "@/features/chat/lib/generation-status";
import { collectAnswers, isToolPart } from "@/features/chat/lib/question-messages";
import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { isMemoryEvent } from "@/features/personalization/lib/memory-event";
import { Markdown } from "@/shared/ui/markdown";
import { PhotoStrip } from "@/shared/ui/photo-lightbox";
import { QuestionSummary } from "@/features/chat/ui/question-card";
import { questionInputSchema, type QuestionAnswer } from "@/features/chat/lib/question";

function imageUrls(message: UIMessage) {
  return message.parts.flatMap((part) =>
    part.type === "file" && part.mediaType.startsWith("image/") ? [part.url] : [],
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const photos = imageUrls(message);
  const text = message.text.trim();

  return (
    <div className={styles["msg-user"]} data-photos={photos.length > 0}>
      <PhotoStrip urls={photos} alt="Фото від тебе" />
      {text}
    </div>
  );
}

function AssistantText({ text, streaming }: { text: string; streaming: boolean }) {
  const [visibleText] = useSmoothText(text, { startStreaming: streaming });

  return <Markdown text={visibleText} />;
}

function AssistantMessage({
  message,
  answers,
  onOpenMemories,
}: {
  message: UIMessage;
  answers: ReadonlyMap<string, QuestionAnswer>;
  onOpenMemories: () => void;
}) {
  const streaming = message.status === "streaming";
  const toolParts = message.parts.filter(isToolPart);

  const memories = toolParts.flatMap((part) => {
    if (
      !["tool-add_memory", "tool-remove_memory"].includes(part.type) ||
      part.state !== "output-available" ||
      !isMemoryEvent(part.output)
    )
      return [];

    return [{ action: part.output.action, text: part.output.text, toolCallId: part.toolCallId }];
  });

  const questions = toolParts.filter((part) => part.type === "tool-ask_user");
  const text = message.text.trim();

  if (memories.length === 0 && questions.length === 0 && !text && message.status !== "failed") {
    return null;
  }

  return (
    <div className={styles["msg-agent"]}>
      {questions.map((part) => {
        const input = questionInputSchema.safeParse(part.input).data ?? null;

        if (!input) {
          return null;
        }

        const answer = answers.get(part.toolCallId) ?? null;

        if (!answer) return null;

        return <QuestionSummary key={part.toolCallId} input={input} answer={answer} />;
      })}
      {memories.map((part) => (
        <button
          type="button"
          className={styles["memory-event"]}
          key={part.toolCallId}
          onClick={onOpenMemories}
        >
          {part.action === "added" ? "Запам’ятав" : "Забув"}: {part.text}
          <span>Переглянути спогади ↗</span>
        </button>
      ))}
      {text && <AssistantText text={text} streaming={streaming} />}
      {message.status === "failed" && (
        <p className={styles["msg-error"]}>Відповідь не вдалася. Спробуй надіслати ще раз.</p>
      )}
    </div>
  );
}

export function ChatThread({
  messages,
  working,
  onOpenMemories,
  children,
}: {
  messages: readonly UIMessage[];
  working: boolean;
  onOpenMemories: () => void;
  children?: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const answers = collectAnswers(messages);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !pinnedRef.current) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, working, children]);

  return (
    <div
      ref={viewportRef}
      className={styles["thread"]}
      onScroll={(event) => {
        const viewport = event.currentTarget;
        pinnedRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 48;
      }}
    >
      <ol className={styles["thread-list"]} aria-live="polite">
        {messages.map((message) => (
          <li key={message.key}>
            {message.role === "user" ? (
              <UserMessage message={message} />
            ) : (
              <AssistantMessage
                message={message}
                answers={answers}
                onOpenMemories={onOpenMemories}
              />
            )}
          </li>
        ))}
        {working && (
          <li>
            <GenerationStatus messages={messages} />
          </li>
        )}
        {children && <li>{children}</li>}
      </ol>
    </div>
  );
}

export function GenerationStatus({ messages }: { messages: readonly UIMessage[] }) {
  const { activity, label } = generationStatus(messages);

  return (
    <div className={styles["generation-status"]} role="status" data-activity={activity}>
      <svg
        className={styles["generation-pot"]}
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path className={styles["pot-steam"]} d="M15 12c-2-2 2-3 0-5m10 5c-2-2 2-3 0-5" />
        <circle className={styles["pot-bubble"]} cx="20" cy="25" r="1" />
        <path d="M8 17h24v10a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V17Z" />
        <path d="M8 19H5a2 2 0 0 0 0 4h3m24-4h3a2 2 0 0 1 0 4h-3M11 36h18" />
      </svg>
      <span className="t-shimmer">{label}</span>
    </div>
  );
}
