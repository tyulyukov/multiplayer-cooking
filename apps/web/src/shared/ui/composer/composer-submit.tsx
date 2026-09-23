import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/shared/ui/composer/composer.module.scss";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tooltip } from "radix-ui";

import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

import type { ComposerProps } from "./types";
import type { useComposer } from "./use-composer";
type SubmitProps = Pick<ComposerProps, "mode" | "busy" | "value"> &
  Pick<
    ReturnType<typeof useComposer>,
    | "desktopKeyboard"
    | "overLimit"
    | "uploading"
    | "attachmentError"
    | "readyAttachments"
    | "shortcutDescription"
  >;
export const ComposerSubmit: FC<SubmitProps> = ({
  mode,
  busy,
  value,
  desktopKeyboard,
  overLimit,
  uploading,
  attachmentError,
  readyAttachments,
  shortcutDescription,
}) => {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root
        key={desktopKeyboard ? "desktop" : "touch"}
        open={desktopKeyboard ? undefined : false}
      >
        <Tooltip.Trigger asChild>
          {mode === "home" ? (
            <Button
              type="submit"
              size="xl"
              disabled={busy || overLimit || uploading}
              aria-busy={busy}
              className="generate-button"
            >
              <HugeiconsIcon
                icon={CookingPotIcon}
                className={cn(styles["pot-icon"], "size-5")}
                strokeWidth={1.5}
                aria-hidden
              />
              {busy ? "Генеруємо…" : "Згенерувати"}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="icon-lg"
              disabled={
                overLimit ||
                busy ||
                uploading ||
                attachmentError ||
                (mode === "helper" && !value.trim() && readyAttachments.length === 0)
              }
              aria-label={busy ? "Готуємо відповідь…" : "Надіслати"}
              aria-busy={busy}
              className={styles["send-button"]}
            >
              {busy ? (
                <Spinner className="size-5" />
              ) : (
                <HugeiconsIcon
                  icon={ArrowUp02Icon}
                  className="size-5"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </Button>
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded-md border-2 border-foreground bg-card px-3 py-2 text-xs text-foreground"
            side="top"
            sideOffset={8}
          >
            <p>{shortcutDescription[0]}</p>
            <p>{shortcutDescription[1]}</p>
            <p className="mt-1 text-muted-foreground">Можна змінити в налаштуваннях</p>
            <Tooltip.Arrow className="fill-card" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
