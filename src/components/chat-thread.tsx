import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import type { ToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/markdown";
import { QuestionCard } from "@/components/question-card";
import { readQuestionAnswer, readQuestionInput, type QuestionAnswer } from "@/lib/question";

export type QuestionSubmit = (
  toolCallId: string,
  answer: { optionIds: string[]; labels: string[]; custom?: string },
) => void;

function isToolPart(part: UIMessage["parts"][number]): part is ToolUIPart {
  return part.type.startsWith("tool-");
}

// Tool results saved later live in their own message; map them back by call id.
function collectAnswers(messages: readonly UIMessage[]) {
  const answers = new Map<string, QuestionAnswer>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (isToolPart(part) && part.type === "tool-ask_user" && "output" in part) {
        const answer = readQuestionAnswer(part.output);

        if (answer) {
          answers.set(part.toolCallId, answer);
        }
      }
    }
  }

  return answers;
}

const toolLabels: Record<string, string> = {
  web_search: "Шукаю в інтернеті",
  read_page: "Читаю сторінку",
  find_dish_image: "Підбираю фото страви",
  silpo_find_products: "Підбираю продукти в Сільпо",
  save_idea: "Зберігаю ідею",
};

function toolLabel(type: string) {
  const name = type.replace(/^tool-/, "");

  return toolLabels[name] ?? "Працюю над відповіддю";
}

function AssistantText({ text, streaming }: { text: string; streaming: boolean }) {
  const [visibleText] = useSmoothText(text, { startStreaming: streaming });

  return <Markdown text={visibleText} className="msg-text" />;
}

function AssistantMessage({
  message,
  answers,
  isLast,
  answering,
  onAnswer,
}: {
  message: UIMessage;
  answers: ReadonlyMap<string, QuestionAnswer>;
  isLast: boolean;
  answering: boolean;
  onAnswer: QuestionSubmit;
}) {
  const streaming = message.status === "streaming";
  const toolParts = message.parts.filter(isToolPart);
  const activity = toolParts.filter((part) => part.type !== "tool-ask_user");
  const questions = toolParts.filter((part) => part.type === "tool-ask_user");
  const text = message.text.trim();

  if (activity.length === 0 && questions.length === 0 && !text && message.status !== "failed") {
    return null;
  }

  return (
    <div className="msg msg-agent">
      {questions.map((part) => {
        const input = readQuestionInput(part.input);

        if (!input) {
          return null;
        }

        const answer = answers.get(part.toolCallId) ?? null;

        // Only the latest unanswered question is live; older ones stay as summaries.
        if (!answer && !isLast) {
          return null;
        }

        return (
          <QuestionCard
            key={part.toolCallId}
            input={input}
            answer={answer}
            pending={answering}
            onSubmit={(value) => onAnswer(part.toolCallId, value)}
          />
        );
      })}
      {activity.length > 0 && (
        <ul className="activity" aria-label="Що робить агент">
          {activity.map((part, index) => (
            <li key={`${message.key}-${index}`}>{toolLabel(part.type)}</li>
          ))}
        </ul>
      )}
      {text && <AssistantText text={text} streaming={streaming} />}
      {message.status === "failed" && (
        <p className="msg-error">Відповідь не вдалася. Спробуй надіслати ще раз.</p>
      )}
    </div>
  );
}

export function ChatThread({
  messages,
  working,
  answering,
  onAnswer,
  children,
}: {
  messages: readonly UIMessage[];
  working: boolean;
  answering: boolean;
  onAnswer: QuestionSubmit;
  children?: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const answers = collectAnswers(messages);
  const lastAssistantKey = messages.filter((message) => message.role === "assistant").at(-1)?.key;

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
      className="thread"
      onScroll={(event) => {
        const viewport = event.currentTarget;
        pinnedRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 48;
      }}
    >
      <ol className="thread-list" aria-live="polite">
        {messages.map((message) => (
          <li key={message.key}>
            {message.role === "user" ? (
              <div className="msg msg-user">{message.text}</div>
            ) : (
              <AssistantMessage
                message={message}
                answers={answers}
                isLast={message.key === lastAssistantKey}
                answering={answering}
                onAnswer={onAnswer}
              />
            )}
          </li>
        ))}
        {working && messages.at(-1)?.role === "user" && (
          <li>
            <p className="thinking t-shimmer">Думаю над стравою</p>
          </li>
        )}
        {children && <li>{children}</li>}
      </ol>
    </div>
  );
}
