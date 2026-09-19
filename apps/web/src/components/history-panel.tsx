import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import HistoryIcon from "@hugeicons/core-free-icons/HistoryIcon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mergeHistory,
  type HistoryEntry,
  type HistoryItem,
  type CookingHistoryItem,
} from "@/lib/history";
import { formatRelativeTime } from "@/lib/relative-time";
import { useMediaQuery } from "@/lib/use-media-query";

export type { HistoryItem } from "@/lib/history";

const title = "Історія";

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
  onOpenCooking,
}: {
  items: readonly HistoryEntry[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onOpenCooking?: (roomId: CookingHistoryItem["_id"]) => void;
}) {
  const now = useNow();

  if (items === undefined) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="history-empty illustrated-empty">
        <KitchenIllustration name="recipe-box" />
        <p>Тут з'являться попередні розмови.</p>
      </div>
    );
  }

  return (
    <ul className="history-list">
      {items.map((item) => (
        <li key={item.key} data-active={item.active}>
          <button
            type="button"
            className="history-row"
            onClick={() => {
              if (item.threadId) onOpen(item.threadId);
              else if (item.rooms[0]) onOpenCooking?.(item.rooms[0]._id);
            }}
          >
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
          {item.rooms.length > 0 && onOpenCooking && (
            <HistoryCooking
              rooms={item.rooms}
              title={item.title ?? "Без назви"}
              onOpen={onOpenCooking}
            />
          )}
          {item.threadId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Видалити розмову ${item.title ?? "без назви"}`}
              onClick={() => {
                if (item.threadId) onDelete(item.threadId);
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} aria-hidden />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function HistoryCooking({
  rooms,
  title,
  onOpen,
}: {
  rooms: readonly CookingHistoryItem[];
  title: string;
  onOpen: (roomId: CookingHistoryItem["_id"]) => void;
}) {
  const firstRoom = rooms[0];
  if (!firstRoom) return null;
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Відкрити кухню: ${title}`}
      title="Відкрити кухню"
      onClick={rooms.length === 1 ? () => onOpen(firstRoom._id) : undefined}
    >
      <HugeiconsIcon icon={CookingPotIcon} strokeWidth={1.5} aria-hidden />
    </Button>
  );
  if (rooms.length === 1) {
    return button;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="history-cooking-menu">
        {rooms.map((room) => (
          <DropdownMenuItem key={room._id} onSelect={() => onOpen(room._id)}>
            <span>
              {new Date(room.createdAt).toLocaleString("uk-UA", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="history-cooking-state">
              {room.state === "done"
                ? "Приготовано"
                : room.state === "cooking"
                  ? "Готуємо"
                  : room.state === "error"
                    ? "Потрібна повторна спроба"
                    : "Підготовка"}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// A sheet from the right on desktop, a bottom drawer on mobile; the same list inside.
export function HistoryPanel({
  items,
  onOpen,
  onDelete,
  cookingRooms = [],
  onOpenCooking,
}: {
  items: readonly HistoryItem[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  cookingRooms?: readonly CookingHistoryItem[];
  onOpenCooking?: (roomId: CookingHistoryItem["_id"]) => void;
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
      items={items === undefined ? undefined : mergeHistory(items, cookingRooms)}
      onOpen={(threadId) => {
        setOpen(false);
        onOpen(threadId);
      }}
      onDelete={onDelete}
      onOpenCooking={
        onOpenCooking
          ? (roomId) => {
              setOpen(false);
              onOpenCooking(roomId);
            }
          : undefined
      }
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
