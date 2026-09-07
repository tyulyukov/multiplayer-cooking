import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import HistoryIcon from "@hugeicons/core-free-icons/HistoryIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatRelativeTime } from "@/lib/relative-time";
import { useMediaQuery } from "@/lib/use-media-query";

export type HistoryItem = FunctionReturnType<typeof api.chat.history>[number];

const title = "Історія розмов";

// Relative labels ("5 хвилин тому") go stale while the panel is open; tick once a minute.
function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

function HistoryList({
  items,
  onOpen,
  onDelete,
}: {
  items: readonly HistoryItem[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}) {
  const now = useNow();

  if (items === undefined) {
    return null;
  }

  if (items.length === 0) {
    return <p className="history-empty">Тут з'являться попередні розмови.</p>;
  }

  return (
    <ul className="history-list">
      {items.map((item) => (
        <li key={item.threadId} data-active={item.active}>
          <button type="button" className="history-row" onClick={() => onOpen(item.threadId)}>
            <span className="history-photos" aria-hidden>
              {item.photos.map((url) => (
                <img key={url} src={url} alt="" loading="lazy" />
              ))}
            </span>
            <span className="history-text">
              <strong>{item.title ?? "Без назви"}</strong>
              <span>
                <time dateTime={new Date(item.createdAt).toISOString()}>
                  {formatRelativeTime(item.createdAt, now)}
                </time>
                {item.active && " · відкрита"}
              </span>
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Видалити розмову ${item.title ?? "без назви"}`}
            onClick={() => onDelete(item.threadId)}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}

// A sheet from the right on desktop, a bottom drawer on mobile; the same list inside.
export function HistoryPanel({
  items,
  onOpen,
  onDelete,
}: {
  items: readonly HistoryItem[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");

  const trigger: ReactNode = (
    <Button type="button" variant="outline" size="chip" className="history-trigger">
      <HugeiconsIcon icon={HistoryIcon} strokeWidth={1.5} aria-hidden />
      <span>Історія</span>
    </Button>
  );
  const list = (
    <HistoryList
      items={items}
      onOpen={(threadId) => {
        setOpen(false);
        onOpen(threadId);
      }}
      onDelete={onDelete}
    />
  );

  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="history-panel" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="history-panel" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {list}
      </DrawerContent>
    </Drawer>
  );
}
