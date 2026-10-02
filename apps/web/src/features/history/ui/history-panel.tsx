import { HistoryList } from "./history-list";
import type { FC } from "react";
import styles from "@/features/history/ui/history-panel.module.scss";
import HistoryIcon from "@hugeicons/core-free-icons/HistoryIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { type CookingHistoryItem, type HistoryItem } from "@/features/history/model/types";
import { mergeHistory } from "@/features/history/lib/merge-history";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

const title = "Історія";

// A sheet from the right on desktop, a bottom drawer on mobile; the same list inside.
type HistoryPanelProps = {
  items: readonly HistoryItem[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  cookingRooms?: readonly CookingHistoryItem[];
  onOpenCooking?: (roomId: CookingHistoryItem["_id"]) => void;
};

export const HistoryPanel: FC<HistoryPanelProps> = ({
  items,
  onOpen,
  onDelete,
  cookingRooms = [],
  onOpenCooking,
}) => {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");

  const trigger: ReactNode = (
    <Button type="button" variant="outline" size="chip" className={styles["history-trigger"]}>
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
        <SheetContent side="right" className={styles["history-panel"]} aria-describedby={undefined}>
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
      <DrawerContent className={styles["history-panel"]} aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {list}
      </DrawerContent>
    </Drawer>
  );
};
