import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/markdown";

const toolLabels: Record<string, string> = {
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

function AssistantMessage({ message }: { message: UIMessage }) {
  const streaming = message.status === "streaming";
  const activity = message.parts.filter((part) => part.type.startsWith("tool-"));
  const text = message.text.trim();

  return (
    <div className="msg msg-agent">
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
  children,
}: {
  messages: readonly UIMessage[];
  working: boolean;
  children?: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

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
              <AssistantMessage message={message} />
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
