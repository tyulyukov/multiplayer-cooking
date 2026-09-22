import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { AddressPrompt } from "@/features/silpo/ui/address-prompt";
import { ChatThread } from "@/features/chat/ui/chat-thread";
import { QuestionCard } from "@/features/chat/ui/question-card";
import { pendingQuestion } from "@/lib/question-messages";
import { Composer } from "@/shared/ui/composer/composer";
import { HistoryPanel } from "@/features/history/ui/history-panel";
import { IdeaCompact, IdeaPane } from "@/features/ideas/ui/idea-card";
import { ConnectCard, ProfileMenu } from "@/features/silpo/ui/silpo-connect";
import { PersonalSettings } from "@/features/personalization/ui/personal-settings";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isConvexConfigured } from "@/app/providers/convex-provider";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import type { ChatMessage, QuestionSubmit } from "@/features/chat/model/types";
import type { CookingSetup } from "@/features/cooking/model/types";
import type { Idea, IdeaVersions } from "@/features/ideas/model/types";
import type { SilpoConnection } from "@/features/silpo/model/types";
import { useAttachments } from "@/lib/use-attachments";
import { useHomePageModel, useMissingConvexHomeModel } from "@/pages/home/model/use-home-page";

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
  const model = useHomePageModel();

  if (model.screen === "loading") {
    return null;
  }

  if (model.screen === "connect") {
    return <ConnectScreen backendReady={model.backendReady} {...model.props} />;
  }

  const menu = (
    <>
      <HistoryPanel {...model.menu.history} />
      <PersonalSettings {...model.menu.personal} />
      <ProfileMenu {...model.menu.profile} />
    </>
  );

  if (model.screen === "home") {
    return <HomeScreen backendReady={model.backendReady} menu={menu} {...model.props} />;
  }

  return (
    <ChatScreen
      key={model.threadId}
      backendReady={model.backendReady}
      menu={menu}
      {...model.props}
    />
  );
}

function MissingConvexHome() {
  const model = useMissingConvexHomeModel();

  return <HomeScreen backendReady={false} {...model} />;
}

export function HomePage() {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
}
