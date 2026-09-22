import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { AddressPrompt } from "@/components/address-prompt";
import { ChatThread } from "@/components/chat-thread";
import { QuestionCard } from "@/components/question-card";
import { pendingQuestion } from "@/lib/question-messages";
import { Composer } from "@/components/composer";
import { HistoryPanel } from "@/components/history-panel";
import { IdeaCompact, IdeaPane } from "@/components/idea-card";
import { ConnectCard, ProfileMenu } from "@/components/silpo-connect";
import { PersonalSettings } from "@/components/personal-settings";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isConvexConfigured } from "@/app/providers/convex-provider";
import { useChat } from "@/features/chat/api/use-chat";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useDraftSync } from "@/features/chat/model/use-draft-sync";
import type { ChatMessage, QuestionSubmit } from "@/features/chat/model/types";
import { useCreateCookingRoom } from "@/features/cooking/api/use-create-cooking-room";
import type { CookingSetup } from "@/features/cooking/model/types";
import { useHistory } from "@/features/history/api/use-history";
import { useIdeas } from "@/features/ideas/api/use-ideas";
import type { Idea, IdeaVersions } from "@/features/ideas/model/types";
import { usePersonalization } from "@/features/personalization/api/use-personalization";
import { useSilpoConnection } from "@/features/silpo/api/use-silpo-connection";
import type { SilpoConnection } from "@/features/silpo/model/types";
import { useAttachments } from "@/lib/use-attachments";

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
    <main className="app-shell starter-screen">
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
              <span>{prompt.label}</span>
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
  profileName,
  onOpenMemories,
  onOpenIdea,
}: {
  backendReady: boolean;
  menu?: ReactNode;
  connection: SilpoConnection;
  messages: readonly ChatMessage[];
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
  onCookCount: (setup: CookingSetup) => Promise<void>;
  profileName?: string;
  onOpenMemories: () => void;
  onOpenIdea: (ideaId: Idea["_id"]) => void;
}) {
  const question = pendingQuestion(messages);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const visibleIdea = idea;
  const showIdea = Boolean(visibleIdea) && !hidden;
  const latestMessage = messages.at(-1);
  const responseComplete =
    latestMessage?.role === "assistant" && latestMessage.status === "success";
  const showAddressPrompt =
    Boolean(idea) &&
    !connection.hasCart &&
    (connection.cartPending ||
      Boolean(connection.cartError) ||
      (!working && responseComplete && idea?.productsStatus === "needs_address"));
  const compactIdea = ideas.at(-1) ?? idea;
  const pane = visibleIdea ? (
    <IdeaPane
      idea={visibleIdea}
      canAddToCart={connection.hasCart}
      versions={versions}
      onAddToCart={onAddToCart}
      onCookCount={onCookCount}
      profileName={profileName}
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

function ConnectedHome() {
  const [sessionId] = useSessionId();
  const navigate = useNavigate();
  const status = useQuery(api.status.current);
  const silpo = useSilpoConnection(sessionId);
  const connected = silpo.connection != null;
  const chat = useChat(sessionId, connected);
  const { threadId } = chat;
  const ideaState = useIdeas(sessionId, threadId);
  const { idea, ideas, versions, reset: resetVersion, select: selectVersion } = ideaState;
  const history = useHistory(sessionId, connected);
  const personal = usePersonalization(sessionId);
  const createCookingRoom = useCreateCookingRoom(sessionId);
  const draft = useComposerDraft();
  const attachments = useAttachments(sessionId ? chat.uploadAttachment : null);
  const draftSync = useDraftSync({
    threadId: chat.active === undefined ? undefined : threadId,
    remote: chat.remoteDraft,
    text: draft.request,
    imageIds: attachments.storageIds,
    adopt: (saved) => {
      draft.change(saved.text);
      attachments.restore(saved.images);
    },
    save: chat.saveDraft,
  });
  const [personalTab, setPersonalTab] = useState<"memories" | "settings" | null>(null);
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const working = sending || answering || chat.agentWorking;

  async function submit(text: string) {
    if (!sessionId) {
      return;
    }

    setSending(true);
    setError(null);
    draftSync.beginSend();

    const submittedRevision = draft.revision.current;
    let sentThreadId: string | undefined;

    try {
      const result = await chat.sendMessage(text, attachments.storageIds);

      if (!result) {
        return;
      }

      if (result.ok) {
        sentThreadId = result.threadId;
        if (draft.revision.current === submittedRevision) {
          draft.change("");
        }
        attachments.clear();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Не вдалося надіслати. Спробуй ще раз.");
    } finally {
      draftSync.endSend(sentThreadId);
      setSending(false);
    }
  }

  async function submitAddress(address: string) {
    if (!sessionId) {
      return;
    }

    setAddressError(null);

    try {
      const result = await silpo.saveAddress(address);

      if (result && !result.ok) {
        setAddressError(result.message);
      }
    } catch {
      setAddressError("Не вдалося зберегти адресу. Спробуй ще раз.");
    }
  }

  async function cookCount(setup: CookingSetup) {
    if (sessionId && idea) {
      await createCookingRoom(idea._id, setup);
    }
  }

  async function submitCart() {
    if (!sessionId || !idea) {
      return;
    }

    setError(null);

    try {
      const result = await ideaState.addToCart();

      if (result && !result.ok) {
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
      await chat.createThread();
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
      const result = await chat.answerQuestion(toolCallId, value);

      if (!result) {
        return;
      }

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
      await history.openThread(target);
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
      await history.deleteThread(target);
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
      <HistoryPanel
        items={history.items}
        onOpen={openFromHistory}
        onDelete={removeFromHistory}
        cookingRooms={history.cookingRooms}
        onOpenCooking={(roomId) => {
          void navigate({ to: "/cook/$roomId", params: { roomId } });
        }}
      />
      <PersonalSettings
        open={personalTab !== null}
        onOpenChange={(open) => {
          if (!open) setPersonalTab(null);
        }}
        initialTab={personalTab ?? "memories"}
        memories={personal.memories}
        settings={personal.settings}
        loading={personal.loading}
        onDelete={personal.removeMemory}
        onSave={personal.saveSettings}
      />
      <ProfileMenu
        onOpenSettings={() => setPersonalTab("settings")}
        connection={silpo.connection}
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
      messages={chat.messages}
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
      profileName={silpo.connection.name}
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
      onSubmit={() => setError("Convex ще не налаштований. Запусти bun run dev:backend.")}
    />
  );
}

export function HomePage() {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
}
