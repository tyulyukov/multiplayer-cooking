import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/pages/home/home-page.module.scss";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { AddressPrompt } from "@/features/silpo/ui/address-prompt";
import { ChatThread } from "@/features/chat/ui/chat-thread";
import { QuestionCard } from "@/features/chat/ui/question-card";
import { Composer } from "@/shared/ui/composer/composer";
import { IdeaCompact, IdeaPane } from "@/features/ideas/ui/idea-card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { Button } from "@/shared/ui/button";

import { Brand, SendError } from "./home-shell";
import type { ChatScreenProps } from "../model/chat-screen-types";
import { useChatScreen } from "../model/use-chat-screen";

export const ChatScreen: FC<ChatScreenProps> = (props) => {
  const {
    backendReady,
    menu,
    connection,
    messages,
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
  } = props;

  const {
    question,
    hidden,
    setHidden,
    mobileOpen,
    setMobileOpen,
    desktop,
    visibleIdea,
    showIdea,
    showAddressPrompt,
    compactIdea,
  } = useChatScreen(props);

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
    <main className={cn(styles["chat-shell"], "app-shell")} data-idea-open={showIdea}>
      <div className="checker-band" aria-hidden />
      <div className={styles["chat-frame"]}>
        <header className={cn(styles["chat-topbar"], "topbar")}>
          <Brand ready={backendReady} />
          <div className={styles["topbar-actions"]}>
            <Button type="button" variant="outline" size="chip" onClick={onNew}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} aria-hidden />
              Нова
            </Button>
            {menu}
          </div>
        </header>

        <div className={styles["chat-layout"]}>
          <section className={styles["chat-column"]} aria-label="Розмова">
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
              data-idea-column
              className={cn(styles["idea-column"], styles["t-panel-slide"])}
              aria-label="Ідея"
              data-open={showIdea}
              inert={!showIdea}
            >
              {visibleIdea && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={styles["idea-hide"]}
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
          <DrawerContent className={styles["mobile-idea-drawer"]} aria-describedby={undefined}>
            <DrawerHeader>
              <DrawerTitle>Страва і товари</DrawerTitle>
            </DrawerHeader>
            <div className={styles["mobile-idea-scroll"]}>{pane}</div>
          </DrawerContent>
        </Drawer>
      )}
    </main>
  );
};
