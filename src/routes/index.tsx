import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AddressPrompt } from "@/components/address-prompt";
import { ChatThread, type QuestionSubmit } from "@/components/chat-thread";
import { Composer, type ComposerAttachment } from "@/components/composer";
import { HistoryPanel } from "@/components/history-panel";
import {
  IdeaCompact,
  IdeaPane,
  IdeaWaiting,
  type Idea,
  type IdeaVersions,
} from "@/components/idea-card";
import { ConnectCard, ProfileMenu, type SilpoConnection } from "@/components/silpo-connect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isConvexConfigured } from "@/lib/convex";
import { resizeImage, uploadImage } from "@/lib/images";
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

type PendingAttachment = ComposerAttachment & { storageId?: string };

// Photos are resized and uploaded as soon as they are picked; the send carries only storage ids.
function useAttachments(
  upload: {
    url: () => Promise<string | null>;
    register: (storageId: string) => Promise<boolean>;
  } | null,
) {
  const [items, setItems] = useState<PendingAttachment[]>([]);

  function update(id: string, patch: Partial<PendingAttachment>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function add(files: File[]) {
    if (!upload) {
      return;
    }

    for (const file of files) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setItems((current) => [...current, { id, previewUrl, state: "uploading" }]);

      try {
        const blob = await resizeImage(file);
        const url = await upload.url();

        if (!url) {
          throw new Error("Upload limit reached");
        }

        const storageId = await uploadImage(url, blob);

        if (!(await upload.register(storageId))) {
          throw new Error("Upload rejected");
        }

        update(id, { state: "done", storageId });
      } catch {
        update(id, { state: "error" });
      }
    }
  }

  function remove(id: string) {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((entry) => entry.id !== id);
    });
  }

  function clear() {
    setItems((current) => {
      for (const item of current) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return [];
    });
  }

  const storageIds = items.flatMap((item) =>
    item.state === "done" && item.storageId ? [item.storageId] : [],
  );

  return { items, storageIds, add, remove, clear };
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

function ConnectScreen({
  backendReady,
  busy,
  error,
  onConnect,
}: {
  backendReady: boolean;
  busy: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  return (
    <main className="app-shell">
      <div className="checker-band" aria-hidden />
      <div className="home-layout">
        <header className="topbar">
          <Brand ready={backendReady} />
        </header>

        <div className="sign">
          <h1>Підключи Сільпо, щоб почати</h1>
        </div>

        <ConnectCard busy={busy} onConnect={onConnect} />

        {error && <SendError message={error} />}
      </div>
    </main>
  );
}

type AttachmentsState = ReturnType<typeof useAttachments>;

function HomeScreen({
  backendReady,
  menu,
  draft,
  attachments,
  busy,
  error,
  onSubmit,
}: {
  backendReady: boolean;
  menu?: ReactNode;
  draft: ReturnType<typeof useComposerDraft>;
  attachments: AttachmentsState;
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
          {menu && <div className="topbar-actions">{menu}</div>}
        </header>

        <div className="sign">
          <h1>Що готуємо сьогодні?</h1>
        </div>

        <Composer
          mode="home"
          value={draft.request}
          busy={busy}
          autoFocus
          attachments={attachments.items}
          onChange={draft.change}
          onSubmit={onSubmit}
          onAttach={(files) => void attachments.add(files)}
          onRemoveAttachment={attachments.remove}
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
  menu,
  connection,
  messages,
  idea,
  versions,
  working,
  answering,
  draft,
  attachments,
  error,
  addressError,
  onSubmit,
  onNew,
  onSaveAddress,
  onAddToCart,
  onAnswer,
  onCookServings,
}: {
  backendReady: boolean;
  menu?: ReactNode;
  connection: SilpoConnection;
  messages: readonly UIMessage[];
  idea: Idea | null | undefined;
  versions: IdeaVersions;
  working: boolean;
  answering: boolean;
  draft: ReturnType<typeof useComposerDraft>;
  attachments: AttachmentsState;
  error: string | null;
  addressError: string | null;
  onSubmit: (text: string) => void;
  onNew: () => void;
  onSaveAddress: (address: string) => void;
  onAddToCart: () => void;
  onAnswer: QuestionSubmit;
  onCookServings: (servings: number) => Promise<void>;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const showFullscreen = fullscreen && idea != null;
  // Shown while the cart is being built or while the agent's latest message asks for the address.
  const showAddressPrompt =
    !connection.hasCart && (connection.cartPending || wantsAddress(messages));

  let pane: ReactNode = null;

  if (idea) {
    pane = (
      <IdeaPane
        idea={idea}
        fullscreen={showFullscreen}
        canAddToCart={connection.hasCart}
        versions={versions}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onAddToCart={onAddToCart}
        onCookServings={onCookServings}
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
            {menu}
          </div>
        </header>

        <div className="chat-layout">
          <section className="chat-column" aria-label="Розмова">
            <ChatThread
              messages={messages}
              working={working}
              answering={answering}
              onAnswer={onAnswer}
            >
              {idea && <IdeaCompact idea={idea} onOpen={() => setFullscreen(true)} />}
              {showAddressPrompt && (
                <AddressPrompt
                  pending={connection.cartPending}
                  error={addressError ?? connection.cartError ?? null}
                  onSubmit={onSaveAddress}
                />
              )}
            </ChatThread>
            {error && <SendError message={error} />}
            <Composer
              mode="chat"
              value={draft.request}
              busy={working}
              autoFocus={false}
              attachments={attachments.items}
              onChange={draft.change}
              onSubmit={onSubmit}
              onAttach={(files) => void attachments.add(files)}
              onRemoveAttachment={attachments.remove}
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

// The model asks for the address through a tool result flag; the address itself never reaches it.
function wantsAddress(messages: readonly UIMessage[]) {
  const last = messages.at(-1);

  if (!last || last.role !== "assistant") {
    return false;
  }

  return last.parts.some((part) => {
    if (part.type !== "tool-silpo_find_products" || !("output" in part)) {
      return false;
    }

    const output: unknown = part.output;

    return (
      typeof output === "object" &&
      output !== null &&
      "needsAddress" in output &&
      output.needsAddress === true
    );
  });
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

function useIdeaVersions(
  sessionId: ReturnType<typeof useSessionId>[0],
  threadId: string | null,
  latest: Idea | null | undefined,
) {
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const list = useQuery(api.ideas.listForThread, threadArgs) ?? [];
  const restore = useMutation(api.ideas.restore);
  const [selectedId, setSelectedId] = useState<Idea["_id"] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const selectedIndex = list.findIndex((idea) => idea._id === selectedId);
  const index = selectedIndex === -1 ? list.length - 1 : selectedIndex;
  const idea = index >= 0 ? list[index] : latest;

  async function restoreSelected() {
    const target = idea;

    if (!sessionId || !target || restoring) {
      return;
    }

    setRestoring(true);

    try {
      await restore({ sessionId, ideaId: target._id });
      setSelectedId(null);
    } finally {
      setRestoring(false);
    }
  }

  const versions: IdeaVersions = {
    index: Math.max(index, 0),
    count: list.length,
    onSelect: (next) => setSelectedId(list[next]?._id ?? null),
    onRestore: () => void restoreSelected(),
    restoring,
  };

  return { idea, versions, reset: () => setSelectedId(null) };
}

function useSilpoConnection(sessionId: ReturnType<typeof useSessionId>[0]) {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const startConnect = useAction(api.silpoAuth.startConnect);
  const disconnect = useMutation(api.silpo.disconnect);
  const forgetAddress = useMutation(api.silpo.forgetAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    search.silpo === "error" ? "Не вдалося підключити Сільпо. Спробуй ще раз." : null,
  );

  useEffect(() => {
    if (search.silpo) {
      void navigate({ to: "/", search: {}, replace: true });
    }
  }, [search.silpo, navigate]);

  async function connect() {
    if (!sessionId) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const { url } = await startConnect({ sessionId });
      window.location.assign(url);
    } catch {
      setError("Не вдалося відкрити Сільпо. Спробуй ще раз.");
      setConnecting(false);
    }
  }

  return {
    connection,
    connecting,
    error,
    connect,
    disconnect: () => (sessionId ? disconnect({ sessionId }) : Promise.resolve(null)),
    forgetAddress: () => (sessionId ? forgetAddress({ sessionId }) : Promise.resolve(null)),
  };
}

function ConnectedHome() {
  const [sessionId] = useSessionId();
  const status = useQuery(api.status.current);
  const silpo = useSilpoConnection(sessionId);
  const connected = silpo.connection != null;
  const active = useQuery(api.chat.activeThread, sessionId && connected ? { sessionId } : "skip");
  const threadId = active?.threadId ?? null;
  const threadArgs = sessionId && threadId ? { sessionId, threadId } : ("skip" as const);
  const { results } = useUIMessages(api.chat.listMessages, threadArgs, {
    initialNumItems: 50,
    stream: true,
  });
  const latestIdea = useQuery(api.ideas.latest, threadArgs);
  const { idea, versions, reset: resetVersion } = useIdeaVersions(sessionId, threadId, latestIdea);
  const history = useQuery(api.chat.history, sessionId && connected ? { sessionId } : "skip");
  const sendMessage = useMutation(api.chat.sendMessage);
  const newThread = useMutation(api.chat.newThread);
  const openThread = useMutation(api.chat.openThread);
  const deleteThread = useMutation(api.chat.deleteThread);
  const answerQuestion = useMutation(api.chat.answerQuestion);
  const saveAddress = useMutation(api.silpo.saveAddress);
  const addToCart = useMutation(api.ideas.addToCart);
  const setCookServings = useMutation(api.ideas.setCookServings);
  const uploadUrl = useMutation(api.files.uploadUrl);
  const registerUpload = useMutation(api.files.register);
  const draft = useComposerDraft();
  const attachments = useAttachments(
    sessionId
      ? {
          url: () => uploadUrl({ sessionId }),
          register: (storageId) =>
            registerUpload({ sessionId, storageId: storageId as Id<"_storage"> }),
        }
      : null,
  );
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const messages = sortMessages(results);
  const working = sending || answering || isAgentWorking(messages);

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
        imageIds: attachments.storageIds as Id<"_storage">[],
      });

      if (result.ok) {
        draft.change("");
        attachments.clear();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      setSending(false);
    }
  }

  async function submitAddress(address: string) {
    if (!sessionId) {
      return;
    }

    setAddressError(null);

    try {
      const result = await saveAddress({ sessionId, address });

      if (!result.ok) {
        setAddressError(result.message);
      }
    } catch {
      setAddressError("Не вдалося зберегти адресу. Спробуй ще раз.");
    }
  }

  async function cookServings(servings: number) {
    if (sessionId && idea) {
      await setCookServings({ sessionId, ideaId: idea._id, servings });
    }
  }

  async function submitCart() {
    if (!sessionId || !idea) {
      return;
    }

    try {
      const result = await addToCart({ sessionId, ideaId: idea._id });

      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося додати в кошик. Спробуй ще раз.");
    }
  }

  async function startNew() {
    if (!sessionId) {
      return;
    }

    await newThread({ sessionId });
    draft.reset();
    attachments.clear();
    resetVersion();
    setError(null);
  }

  async function answer(toolCallId: string, value: Parameters<QuestionSubmit>[1]) {
    if (!sessionId || !threadId) {
      return;
    }

    setAnswering(true);
    setError(null);

    try {
      const result = await answerQuestion({ sessionId, threadId, toolCallId, answer: value });

      if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати відповідь. Спробуй ще раз.");
    } finally {
      setAnswering(false);
    }
  }

  function openFromHistory(target: string) {
    if (sessionId) {
      resetVersion();
      void openThread({ sessionId, threadId: target });
    }
  }

  function removeFromHistory(target: string) {
    if (sessionId) {
      void deleteThread({ sessionId, threadId: target });
    }
  }

  if (silpo.connection === undefined) {
    return null;
  }

  if (silpo.connection === null) {
    return (
      <ConnectScreen
        backendReady={status?.ready === true}
        busy={silpo.connecting}
        error={silpo.error}
        onConnect={() => void silpo.connect()}
      />
    );
  }

  const menu = (
    <>
      <HistoryPanel items={history} onOpen={openFromHistory} onDelete={removeFromHistory} />
      <ProfileMenu
        connection={silpo.connection}
        onReconnect={() => void silpo.connect()}
        onForgetAddress={() => void silpo.forgetAddress()}
        onDisconnect={() => void silpo.disconnect()}
      />
    </>
  );

  if (!threadId) {
    return (
      <HomeScreen
        backendReady={status?.ready === true}
        menu={menu}
        draft={draft}
        attachments={attachments}
        busy={sending}
        error={error}
        onSubmit={submit}
      />
    );
  }

  return (
    <ChatScreen
      backendReady={status?.ready === true}
      menu={menu}
      connection={silpo.connection}
      messages={messages}
      idea={idea}
      versions={versions}
      working={working}
      answering={answering}
      draft={draft}
      attachments={attachments}
      error={error}
      addressError={addressError}
      onSubmit={submit}
      onNew={startNew}
      onSaveAddress={submitAddress}
      onAddToCart={submitCart}
      onAnswer={answer}
      onCookServings={cookServings}
    />
  );
}

function MissingConvexHome() {
  const draft = useComposerDraft();
  const attachments = useAttachments(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <HomeScreen
      backendReady={false}
      draft={draft}
      attachments={attachments}
      busy={false}
      error={error}
      onSubmit={() => setError("Convex ще не налаштований. Запусти bunx convex dev.")}
    />
  );
}

function HomeRoute() {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
}

type HomeSearch = { silpo?: "connected" | "error" };

export const Route = createFileRoute("/")({
  component: HomeRoute,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    silpo: search.silpo === "connected" || search.silpo === "error" ? search.silpo : undefined,
  }),
});
