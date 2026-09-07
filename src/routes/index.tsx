import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DRAFT_MAX_CHARACTERS } from "../../convex/lib/ai_config";
import { AddressPrompt } from "@/components/address-prompt";
import { ChatThread, type QuestionSubmit } from "@/components/chat-thread";
import { QuestionCard } from "@/components/question-card";
import { pendingQuestion } from "@/lib/question-messages";
import { Composer, type ComposerAttachment } from "@/components/composer";
import { HistoryPanel } from "@/components/history-panel";
import { IdeaCompact, IdeaPane, type Idea, type IdeaVersions } from "@/components/idea-card";
import { ConnectCard, ProfileMenu, type SilpoConnection } from "@/components/silpo-connect";
import { PersonalSettings, type AgentSettings } from "@/components/personal-settings";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
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

  // Replaces the finished tiles with photos already in storage, for example a draft saved on
  // another device. A photo still uploading keeps its tile so its result is not lost.
  function restore(images: readonly { storageId: string; url: string }[]) {
    setItems((current) => {
      const uploading = current.filter((item) => item.state === "uploading");

      for (const item of current) {
        if (item.state !== "uploading") URL.revokeObjectURL(item.previewUrl);
      }

      return [
        ...images.map((image) => ({
          id: image.storageId,
          previewUrl: image.url,
          state: "done" as const,
          storageId: image.storageId,
        })),
        ...uploading,
      ];
    });
  }

  const storageIds = items.flatMap((item) =>
    item.state === "done" && item.storageId ? [item.storageId] : [],
  );

  return { items, storageIds, add, remove, clear: () => restore([]), restore };
}

type RemoteDraft = { text: string; images: readonly { storageId: string; url: string }[] };

function draftKey(text: string, imageIds: readonly string[]) {
  return JSON.stringify([text, imageIds]);
}

const draftSaveDelayMs = 500;
const draftRetryDelayMs = 3000;
const emptyDraftKey = draftKey("", []);

// Keeps the composer and the drafts table in step. The server copy wins only while the local
// composer has no edits the server has not seen; a typing user is never overwritten.
// threadId is undefined until the active thread is known; nothing syncs before that.
function useDraftSync({
  threadId,
  remote,
  text,
  imageIds,
  adopt,
  save,
}: {
  threadId: string | null | undefined;
  remote: RemoteDraft | null | undefined;
  text: string;
  imageIds: readonly string[];
  adopt: (draft: RemoteDraft) => void;
  save: (threadId: string | null, text: string, imageIds: readonly string[]) => Promise<boolean>;
}) {
  // The last draft the server confirmed; null until the current thread's draft has loaded.
  const syncedRef = useRef<string | null>(null);
  const pendingRef = useRef<{ timer: number; run: () => void } | null>(null);
  const hadThreadRef = useRef(false);
  const sendThreadRef = useRef<string | null | undefined>(undefined);
  // State, not a ref: the sync effects must run again once a send finishes.
  const [sending, setSending] = useState(false);
  const adoptRef = useRef(adopt);
  const saveRef = useRef(save);
  // The server stores at most DRAFT_MAX_CHARACTERS; compare and save the same clipped text.
  const latest = { threadId, text: text.slice(0, DRAFT_MAX_CHARACTERS), imageIds };
  const latestRef = useRef(latest);
  const localKey = draftKey(latest.text, latest.imageIds);

  useEffect(() => {
    adoptRef.current = adopt;
    saveRef.current = save;
    latestRef.current = latest;
  });

  function cancel() {
    if (pendingRef.current) {
      window.clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
  }

  // Writes the latest composer state to `target` after `delay`. The state counts as synced only
  // once the server confirms; a refused or failed write is retried while the thread stays open.
  function schedule(target: string | null, delay = draftSaveDelayMs) {
    cancel();

    const run = () => {
      cancel();

      const { text: draftText, imageIds: draftImageIds } = latestRef.current;
      const key = draftKey(draftText, draftImageIds);
      const retry = () => {
        if (latestRef.current.threadId === target && !pendingRef.current) {
          schedule(target, draftRetryDelayMs);
        }
      };

      saveRef.current(target, draftText, draftImageIds).then((saved) => {
        if (saved) {
          syncedRef.current = key;
        } else {
          retry();
        }
      }, retry);
    };

    pendingRef.current = { timer: window.setTimeout(run, delay), run };
  }

  useEffect(() => {
    if (threadId === undefined) {
      return;
    }

    // Leaving a thread: write what is pending there, then start clean for the next one.
    pendingRef.current?.run();
    syncedRef.current = null;

    if (hadThreadRef.current) {
      adoptRef.current({ text: "", images: [] });
    }

    hadThreadRef.current = true;
  }, [threadId]);

  useEffect(() => {
    if (!remote || threadId === undefined || sending) {
      return;
    }

    const remoteKey = draftKey(
      remote.text,
      remote.images.map((image) => image.storageId),
    );

    // Typed before the draft loaded and nothing is stored: keep the text and save it.
    if (syncedRef.current === null && localKey !== emptyDraftKey && remoteKey === emptyDraftKey) {
      syncedRef.current = remoteKey;
      schedule(threadId);
      return;
    }

    if (syncedRef.current === null || syncedRef.current === localKey) {
      if (remoteKey !== localKey) {
        adoptRef.current(remote);
      }

      syncedRef.current = remoteKey;
    }
  }, [remote, localKey, threadId, sending]);

  useEffect(() => {
    if (
      threadId === undefined ||
      sending ||
      syncedRef.current === null ||
      syncedRef.current === localKey
    ) {
      return;
    }

    schedule(threadId);
  }, [localKey, threadId, sending]);

  useEffect(() => {
    // A reload or tab close inside the debounce window must not lose the last keystrokes.
    const flush = () => pendingRef.current?.run();

    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return {
    // No draft writes while a message is in flight: a late save would recreate the sent text.
    beginSend() {
      cancel();
      sendThreadRef.current = threadId;
      setSending(true);
    },
    // After a send the server has dropped that composer's draft. If the person moved to another
    // thread meanwhile, that thread's draft still has to load, so its synced state stays unset.
    endSend(sent: boolean) {
      if (sent && latestRef.current.threadId === sendThreadRef.current) {
        syncedRef.current = emptyDraftKey;
      }

      setSending(false);
    },
  };
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
      <div className="page-frame">
        <header className="topbar">
          <Brand ready={backendReady} />
        </header>
      </div>
      <div className="home-layout">
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
      <div className="page-frame">
        <header className="topbar">
          <Brand ready={backendReady} />
          {menu && <div className="topbar-actions">{menu}</div>}
        </header>
      </div>
      <div className="home-layout">
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
  ideas,
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
  onCookCount,
  onOpenMemories,
  onOpenIdea,
}: {
  backendReady: boolean;
  menu?: ReactNode;
  connection: SilpoConnection;
  messages: readonly UIMessage[];
  idea: Idea | null | undefined;
  ideas: readonly Idea[];
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
  onCookCount: (count: number) => Promise<void>;
  onOpenMemories: () => void;
  onOpenIdea: (ideaId: Idea["_id"]) => void;
}) {
  const question = pendingQuestion(messages);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const visibleIdea = idea;
  const showIdea = Boolean(visibleIdea) && !hidden;
  const showAddressPrompt =
    !connection.hasCart &&
    (connection.cartPending ||
      Boolean(connection.cartError) ||
      wantsAddress(messages) ||
      idea?.productsStatus === "needs_address");
  const compactIdea = ideas.at(-1) ?? idea;
  const pane = visibleIdea ? (
    <IdeaPane
      idea={visibleIdea}
      canAddToCart={connection.hasCart}
      versions={versions}
      onAddToCart={onAddToCart}
      onCookCount={onCookCount}
    />
  ) : null;

  return (
    <main className="app-shell chat-shell" data-idea-open={showIdea}>
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
            <ChatThread messages={messages} working={working} onOpenMemories={onOpenMemories}>
              {showAddressPrompt && (
                <AddressPrompt
                  pending={connection.cartPending}
                  error={addressError ?? connection.cartError ?? null}
                  onSubmit={onSaveAddress}
                />
              )}
            </ChatThread>
            {compactIdea && (!desktop || hidden) && (
              <IdeaCompact
                idea={compactIdea}
                onOpen={() => {
                  onOpenIdea(compactIdea._id);
                  if (desktop) {
                    setHidden(false);
                  } else {
                    setMobileOpen(true);
                  }
                }}
              />
            )}
            {error && <SendError message={error} />}
            <Composer
              questionnaire={
                question && (
                  <QuestionCard
                    key={question.toolCallId}
                    input={question.input}
                    pending={answering || working}
                    onSubmit={(value) => onAnswer(question.toolCallId, value)}
                  />
                )
              }
              questionnaireKey={question?.toolCallId}
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
          {desktop && (
            <aside
              className="idea-column t-panel-slide"
              aria-label="Ідея"
              data-open={showIdea}
              inert={!showIdea}
            >
              {visibleIdea && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="idea-hide"
                  aria-label="Приховати ідею"
                  onClick={() => setHidden(true)}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.5} aria-hidden />
                </Button>
              )}
              {pane}
            </aside>
          )}
        </div>
      </div>
      {!desktop && (
        <Drawer open={mobileOpen && Boolean(visibleIdea)} onOpenChange={setMobileOpen}>
          <DrawerContent className="mobile-idea-drawer" aria-describedby={undefined}>
            <DrawerHeader>
              <DrawerTitle>Страва і товари</DrawerTitle>
            </DrawerHeader>
            <div className="mobile-idea-scroll">{pane}</div>
          </DrawerContent>
        </Drawer>
      )}
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
  const latestId = list.at(-1)?._id ?? null;
  const previousLatestId = useRef(latestId);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const selectedIndex = list.findIndex((idea) => idea._id === selectedId);
  const index = selectedIndex === -1 ? list.length - 1 : selectedIndex;
  const idea = index >= 0 ? list[index] : latest;

  useEffect(() => {
    if (previousLatestId.current && latestId && previousLatestId.current !== latestId) {
      setSelectedId(null);
    }
    previousLatestId.current = latestId;
  }, [latestId]);

  async function restoreSelected() {
    const target = idea;

    if (!sessionId || !target || restoring) {
      return;
    }

    setRestoring(true);
    setRestoreError(null);

    try {
      await restore({ sessionId, ideaId: target._id });
      setSelectedId(null);
    } catch {
      setRestoreError("Не вдалося повернути цю версію. Спробуй ще раз.");
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
    restoreError,
  };

  return { idea, ideas: list, versions, reset: () => setSelectedId(null), select: setSelectedId };
}

function useSilpoConnection(sessionId: ReturnType<typeof useSessionId>[0]) {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const startConnect = useAction(api.silpoAuth.startConnect);
  const finishConnect = useAction(api.silpoAuth.finishConnect);
  const completing = useRef<string | null>(null);
  const disconnect = useMutation(api.silpo.disconnect);
  const forgetAddress = useMutation(api.silpo.forgetAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    search.silpo === "error" ? "Не вдалося підключити Сільпо. Спробуй ще раз." : null,
  );

  useEffect(() => {
    if (search.silpo === "callback" && search.code && search.state) {
      if (!sessionId || completing.current === search.state) return;
      completing.current = search.state;
      setConnecting(true);
      void navigate({ to: "/", search: {}, replace: true });
      void finishConnect({ sessionId, code: search.code, state: search.state })
        .then((ok) => {
          if (!ok) setError("Не вдалося підключити Сільпо. Почни вхід знову в цьому браузері.");
        })
        .catch(() => setError("Не вдалося підключити Сільпо. Спробуй ще раз."))
        .finally(() => setConnecting(false));
    } else if (search.silpo) {
      void navigate({ to: "/", search: {}, replace: true });
    }
  }, [search.silpo, search.code, search.state, sessionId, navigate, finishConnect]);

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

const defaultAgentSettings: AgentSettings = { tone: "friendly", customInstructions: "", about: "" };

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
  const {
    idea,
    ideas,
    versions,
    reset: resetVersion,
    select: selectVersion,
  } = useIdeaVersions(sessionId, threadId, latestIdea);
  const history = useQuery(api.chat.history, sessionId && connected ? { sessionId } : "skip");
  const sendMessage = useMutation(api.chat.sendMessage);
  const newThread = useMutation(api.chat.newThread);
  const openThread = useMutation(api.chat.openThread);
  const deleteThread = useMutation(api.chat.deleteThread);
  const answerQuestion = useMutation(api.chat.answerQuestion);
  const saveAddress = useMutation(api.silpo.saveAddress);
  const addToCart = useMutation(api.ideas.addToCart);
  const setCookCount = useMutation(api.ideas.setCookCount);
  const uploadUrl = useMutation(api.files.uploadUrl);
  const registerUpload = useMutation(api.files.register);
  const saveDraft = useMutation(api.chat.saveDraft);
  const remoteDraft = useQuery(
    api.chat.draft,
    sessionId && connected ? { sessionId, threadId: threadId ?? undefined } : "skip",
  );
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
  const draftSync = useDraftSync({
    threadId: active === undefined ? undefined : threadId,
    remote: remoteDraft,
    text: draft.request,
    imageIds: attachments.storageIds,
    adopt: (saved) => {
      draft.change(saved.text);
      attachments.restore(saved.images);
    },
    save: (target, text, imageIds) =>
      sessionId
        ? saveDraft({
            sessionId,
            threadId: target ?? undefined,
            text,
            imageIds: imageIds as Id<"_storage">[],
          }).catch(() => false)
        : Promise.resolve(false),
  });
  const personal = useQuery(api.personalization.get, sessionId ? { sessionId } : "skip");
  const deleteMemory = useMutation(api.personalization.removeMemory);
  const saveSettings = useMutation(api.personalization.saveSettings);
  const [personalTab, setPersonalTab] = useState<"memories" | "settings" | null>(null);
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
    draftSync.beginSend();

    let sent = false;

    try {
      const result: SendResult = await sendMessage({
        sessionId,
        threadId: threadId ?? undefined,
        text,
        imageIds: attachments.storageIds as Id<"_storage">[],
      });

      if (result.ok) {
        sent = true;
        draft.change("");
        attachments.clear();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      draftSync.endSend(sent);
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

  async function cookCount(count: number) {
    if (sessionId && idea) {
      await setCookCount({ sessionId, ideaId: idea._id, count });
    }
  }

  async function submitCart() {
    if (!sessionId || !idea) {
      return;
    }

    setError(null);

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

    setError(null);

    try {
      await newThread({ sessionId });
      draft.reset();
      resetVersion();
    } catch {
      setError("Не вдалося створити нову розмову. Спробуй ще раз.");
    }
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

  async function openFromHistory(target: string) {
    if (!sessionId) {
      return;
    }

    setError(null);

    try {
      await openThread({ sessionId, threadId: target });
      resetVersion();
    } catch {
      setError("Не вдалося відкрити розмову. Спробуй ще раз.");
    }
  }

  async function removeFromHistory(target: string) {
    if (!sessionId) {
      return;
    }

    setError(null);

    try {
      await deleteThread({ sessionId, threadId: target });
    } catch {
      setError("Не вдалося видалити розмову. Спробуй ще раз.");
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
      <PersonalSettings
        open={personalTab !== null}
        onOpenChange={(open) => {
          if (!open) setPersonalTab(null);
        }}
        initialTab={personalTab ?? "memories"}
        memories={personal?.memories ?? []}
        settings={personal?.settings ?? defaultAgentSettings}
        loading={!personal}
        onDelete={async (memoryId) => {
          if (sessionId) await deleteMemory({ sessionId, memoryId: memoryId as Id<"memories"> });
        }}
        onSave={async (settings) => {
          if (sessionId) await saveSettings({ sessionId, settings });
        }}
      />
      <ProfileMenu
        onOpenSettings={() => setPersonalTab("settings")}
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
      key={threadId}
      backendReady={status?.ready === true}
      menu={menu}
      connection={silpo.connection}
      messages={messages}
      idea={idea}
      ideas={ideas}
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
      onCookCount={cookCount}
      onOpenMemories={() => setPersonalTab("memories")}
      onOpenIdea={selectVersion}
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

type HomeSearch = { silpo?: "callback" | "connected" | "error"; code?: string; state?: string };

export const Route = createFileRoute("/")({
  component: HomeRoute,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    silpo:
      search.silpo === "callback" || search.silpo === "connected" || search.silpo === "error"
        ? search.silpo
        : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
});
