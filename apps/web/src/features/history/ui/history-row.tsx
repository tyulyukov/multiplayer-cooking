import type { FC } from "react";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/shared/ui/button";
import { formatRelativeTime } from "@/shared/lib/relative-time";
import type { HistoryEntry } from "../model/types";
import type { HistoryListProps } from "./history-list";
import { HistoryCooking } from "./history-cooking";
import styles from "./history-list.module.scss";

type Props = Pick<HistoryListProps, "onOpen" | "onDelete" | "onOpenCooking"> & {
  item: HistoryEntry;
  now: number;
};

export const HistoryRow: FC<Props> = ({ item, now, onOpen, onDelete, onOpenCooking }) => (
  <li data-active={item.active}>
    <button
      type="button"
      className={styles["history-row"]}
      onClick={() => {
        if (item.threadId) onOpen(item.threadId);
        else if (item.rooms[0]) onOpenCooking?.(item.rooms[0]._id);
      }}
    >
      <span className={styles["history-photos"]} aria-hidden>
        {item.photos.map((url) => (
          <img key={url} src={url} alt="" loading="lazy" />
        ))}
      </span>
      <span className={styles["history-text"]}>
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
      <HistoryCooking rooms={item.rooms} title={item.title ?? "Без назви"} onOpen={onOpenCooking} />
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
);
