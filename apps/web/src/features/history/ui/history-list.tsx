import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import type { CookingHistoryItem, HistoryEntry } from "../model/types";
import { useHistoryNow } from "../model/use-history-now";
import { HistoryRow } from "./history-row";
import styles from "./history-list.module.scss";

export type HistoryListProps = {
  items: readonly HistoryEntry[] | undefined;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onOpenCooking?: (roomId: CookingHistoryItem["_id"]) => void;
};

export const HistoryList: FC<HistoryListProps> = ({ items, onOpen, onDelete, onOpenCooking }) => {
  const now = useHistoryNow();

  if (items === undefined) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className={cn(styles["history-empty"], "illustrated-empty")}>
        <KitchenIllustration name="recipe-box" />
        <p>Тут з'являться попередні розмови.</p>
      </div>
    );
  }

  return (
    <ul className={styles["history-list"]}>
      {items.map((item) => (
        <HistoryRow
          key={item.key}
          item={item}
          now={now}
          onOpen={onOpen}
          onDelete={onDelete}
          onOpenCooking={onOpenCooking}
        />
      ))}
    </ul>
  );
};
