import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { api } from "../../convex/_generated/api";
import { ChatThread } from "@/components/chat-thread";
import { Composer } from "@/components/composer";
import { IdeaCompact, IdeaPane, IdeaWaiting, type Idea } from "@/components/idea-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isConvexConfigured } from "@/lib/convex";
import { pickQuickPrompts, type QuickPrompt } from "@/lib/quick-prompts";

type PromptSelection = Readonly<{
  promptId: string;
  baseRequest: string;
}>;

type SendResult = { ok: true } | { ok: false; message: string };

function useComposerDraft() {
  const [request, setRequest] = useState("");
  const [selection, setSelection] = useState<PromptSelection | null>(null);
  const [quickPrompts, setQuickPrompts] = useState(() => pickQuickPrompts());

  function change(value: string) {
    setRequest(value);
    setSelection(null);
  }

  function togglePrompt(prompt: QuickPrompt) {
    if (selection?.promptId === prompt.id) {
      setRequest(selection.baseRequest);
      setSelection(null);
      return;
    }

    const baseRequest = selection ? selection.baseRequest : request;
    const trimmedBase = baseRequest.trim();
    setRequest(trimmedBase ? `${trimmedBase}\n${prompt.label}` : prompt.label);
    setSelection({ promptId: prompt.id, baseRequest });
  }

  function reset() {
    setRequest("");
    setSelection(null);
    setQuickPrompts(pickQuickPrompts());
  }

  return { request, selection, quickPrompts, change, togglePrompt, reset };
}

function Brand({ ready }: { ready: boolean }) {
  return (
    <div className="brand" data-backend-ready={ready}>
      <i aria-hidden />
      Multiplayer Cooking
    </div>
  );
}

function SendError({ message }: { message: string }) {
  return (
    <Alert
      variant="destructive"
      className="home-error rounded-[14px] border-2 px-[18px] py-4 has-[>svg]:gap-x-2.5"
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
      <AlertDescription className="text-[0.9375rem] leading-[1.375rem] font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
}

function HomeScreen({
  backendReady,
  draft,
  busy,
  error,
  onSubmit,
}: {
  backendReady: boolean;
  draft: ReturnType<typeof useComposerDraft>;
  busy: boolean;
  error: string | null;
  onSubmit: (text: string) => void;
}) {
  return (
    <main className="app-shell">
      <div className="checker-band" aria-hidden />
      <div className="home-layout">
        <header className="topbar">
          <Brand ready={backendReady} />
        </header>

        <div className="sign">
          <h1>Що готуємо сьогодні?</h1>
        </div>

        <Composer
          mode="home"
          value={draft.request}
          busy={busy}
          autoFocus
          onChange={draft.change}
          onSubmit={onSubmit}
        />

        <div className="quick-prompts" role="group" aria-label="Швидкі запити">
          {draft.quickPrompts.map((prompt) => (
            <Button
              key={prompt.id}
              type="button"
              size="chip"
              variant="outline"
              aria-pressed={draft.selection?.promptId === prompt.id}
              disabled={busy}
              className="quick-prompt"
              onClick={() => draft.togglePrompt(prompt)}
            >
              <HugeiconsIcon icon={prompt.icon} strokeWidth={1.5} aria-hidden />
              {prompt.label}
            </Button>
          ))}
        </div>

        {error && <SendError message={error} />}
      </div>
    </main>
  );
}

function ChatScreen({
  backendReady,
  messages,
  idea,
  working,
  draft,
  error,
  onSubmit,
  onNew,
}: {
  backendReady: boolean;
  messages: readonly UIMessage[];
  idea: Idea | null | undefined;
  working: boolean;
  draft: ReturnType<typeof useComposerDraft>;
  error: string | null;
  onSubmit: (text: string) => void;
  onNew: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const showFullscreen = fullscreen && idea != null;

  let pane: ReactNode = null;

  if (idea) {
    pane = (
      <IdeaPane
        idea={idea}
        fullscreen={showFullscreen}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
      />
    );
  } else if (working || idea === undefined) {
    pane = <IdeaWaiting />;
  }

  return (
    <main className="app-shell chat-shell" data-fullscreen={showFullscreen}>
      <div className="checker-band" aria-hidden />
      <div className="chat-frame">
        <header className="topbar chat-topbar">
          <Brand ready={backendReady} />
          <div className="topbar-actions">
            <Button type="button" variant="outline" size="chip" onClick={onNew}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} aria-hidden />
              Нова
            </Button>
          </div>
        </header>

        <div className="chat-layout">
          <section className="chat-column" aria-label="Розмова">
            <ChatThread messages={messages} working={working}>
              {idea && <IdeaCompact idea={idea} onOpen={() => setFullscreen(true)} />}
            </ChatThread>
            {error && <SendError message={error} />}
            <Composer
              mode="chat"
              value={draft.request}
              busy={working}
              autoFocus={false}
              onChange={draft.change}
              onSubmit={onSubmit}
            />
          </section>
          <aside className="idea-column" aria-label="Ідея">
            {pane}
          </aside>
        </div>
      </div>
    </main>
  );
}

function sortMessages(messages: readonly UIMessage[]) {
  return [...messages].sort((a, b) => a.order - b.order || a.stepOrder - b.stepOrder);
}

function isAgentWorking(messages: readonly UIMessage[]) {
  const last = messages.at(-1);

  if (!last) {
    return false;
  }

  return (
    last.role === "user" ||
    (last.role === "assistant" && (last.status === "pending" || last.status === "streaming"))
  );
}

function ConnectedHome() {
  const [sessionId] = useSessionId();
  const status = useQuery(api.status.current);
  const active = useQuery(api.chat.activeThread, sessionId ? { sessionId } : "skip");
  const threadId = active?.threadId ?? null;
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const { results } = useUIMessages(api.chat.listMessages, threadArgs, {
    initialNumItems: 50,
    stream: true,
  });
  const idea = useQuery(api.ideas.latest, threadArgs);
  const sendMessage = useMutation(api.chat.sendMessage);
  const newThread = useMutation(api.chat.newThread);
  const draft = useComposerDraft();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = sortMessages(results);
  const working = sending || isAgentWorking(messages);

  async function submit(text: string) {
    if (!sessionId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const result: SendResult = await sendMessage({
        sessionId,
        threadId: threadId ?? undefined,
        text,
      });

      if (result.ok) {
        draft.change("");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      setSending(false);
    }
  }

  async function startNew() {
    if (!sessionId) {
      return;
    }

    await newThread({ sessionId });
    draft.reset();
    setError(null);
  }

  if (!threadId) {
    return (
      <HomeScreen
        backendReady={status?.ready === true}
        draft={draft}
        busy={sending}
        error={error}
        onSubmit={submit}
      />
    );
  }

  return (
    <ChatScreen
      backendReady={status?.ready === true}
      messages={messages}
      idea={idea}
      working={working}
      draft={draft}
      error={error}
      onSubmit={submit}
      onNew={startNew}
    />
  );
}

function MissingConvexHome() {
  const draft = useComposerDraft();
  const [error, setError] = useState<string | null>(null);

  return (
    <HomeScreen
      backendReady={false}
      draft={draft}
      busy={false}
      error={error}
      onSubmit={() => setError("Convex ще не налаштований. Запусти bunx convex dev.")}
    />
  );
}

function HomeRoute() {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
}

export const Route = createFileRoute("/")({
  component: HomeRoute,
});
