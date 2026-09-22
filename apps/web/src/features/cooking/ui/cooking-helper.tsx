import styles from "@/features/cooking/ui/cooking-helper.module.scss";
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogClose, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Spinner } from "@/shared/ui/spinner";

import type { CookingHelperProps } from "../model/helper-types";
import { useCookingHelper } from "../model/use-cooking-helper";
import { HelperChat } from "./helper-chat";
import { HelperNotes } from "./helper-notes";
export function CookingHelper(props: CookingHelperProps) {
  const { open, onOpenChange, helperBusy, notes } = props;
  const model = useCookingHelper(props);
  const {
    mobile,
    setNearBottom,
    setTab,
    tab,
    nearBottom,
    setSeenAt,
    latestReplyAt,
    unread,
    contentRef,
    closeRef,
  } = model;
  return (
    <Dialog
      modal={mobile}
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setNearBottom(true);
          setTab("chat");
        } else if (tab === "chat" && nearBottom) setSeenAt(latestReplyAt);
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={styles["helper-launcher"]}
          aria-label="Відкрити помічника"
          data-open={open}
        >
          <HugeiconsIcon icon={BubbleChatIcon} size={22} strokeWidth={1.5} aria-hidden />
          <span>{helperBusy ? "Помічник відповідає…" : unread ? "Є відповідь" : "Помічник"}</span>
          {helperBusy ? (
            <Spinner />
          ) : unread ? (
            <span className={styles["helper-unread-dot"]} aria-hidden />
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogPrimitive.Portal>
        {mobile && <DialogPrimitive.Overlay className={styles["helper-backdrop"]} />}
        <DialogPrimitive.Content
          ref={contentRef}
          className={styles["helper-window"]}
          aria-describedby={undefined}
          onInteractOutside={(event) => {
            if (!mobile) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            setTab("chat");
            setNearBottom(true);
            if (mobile) closeRef.current?.focus({ preventScroll: true });
            else contentRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
          }}
        >
          <header className={styles["helper-header"]}>
            <HugeiconsIcon icon={BubbleChatIcon} size={24} strokeWidth={1.5} aria-hidden />
            <DialogTitle>Помічник</DialogTitle>
            <DialogClose asChild>
              <Button ref={closeRef} variant="ghost" size="icon-lg" aria-label="Згорнути чат">
                <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} aria-hidden />
              </Button>
            </DialogClose>
          </header>
          <div className={styles["helper-tabs"]} aria-label="Розділи помічника">
            <Button
              variant="ghost"
              size="chip"
              aria-pressed={tab === "chat"}
              onClick={() => setTab("chat")}
            >
              Чат
            </Button>
            <Button
              variant="ghost"
              size="chip"
              aria-pressed={tab === "notes"}
              onClick={() => setTab("notes")}
            >
              Нотатки{notes.length > 0 ? ` · ${notes.length}` : ""}
            </Button>
            <span>Для всіх на кухні</span>
          </div>
          {tab === "chat" ? (
            <HelperChat {...props} {...model} />
          ) : (
            <HelperNotes {...props} {...model} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
