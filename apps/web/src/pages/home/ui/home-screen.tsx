import type { FC } from "react";
import styles from "@/pages/home/home-page.module.scss";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { Composer } from "@/shared/ui/composer/composer";
import { Button } from "@/shared/ui/button";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useAttachments } from "@/shared/hooks/use-attachments";

import { Brand, SendError } from "./home-shell";

type AttachmentsState = ReturnType<typeof useAttachments>;

type HomeScreenProps = {
  backendReady: boolean;
  menu?: ReactNode;
  draft: ReturnType<typeof useComposerDraft>;
  attachments: AttachmentsState;
  busy: boolean;
  error: string | null;
  onSubmit: (text: string) => void;
};

export const HomeScreen: FC<HomeScreenProps> = ({
  backendReady,
  menu,
  draft,
  attachments,
  busy,
  error,
  onSubmit,
}) => {
  return (
    <main className="app-shell">
      <div className="checker-band" aria-hidden />
      <div className="page-frame">
        <header className="topbar">
          <Brand ready={backendReady} />
          {menu && <div className={styles["topbar-actions"]}>{menu}</div>}
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

        <div className={styles["quick-prompts"]} role="group" aria-label="Швидкі запити">
          {draft.quickPrompts.map((prompt) => (
            <Button
              key={prompt.id}
              type="button"
              size="chip"
              variant="outline"
              aria-pressed={draft.selection?.promptId === prompt.id}
              disabled={busy}
              className={styles["quick-prompt"]}
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
};
