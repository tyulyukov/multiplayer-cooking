import type { FC } from "react";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { CookingHistoryItem } from "../model/types";
import styles from "./history-cooking.module.scss";

type HistoryCookingProps = {
  rooms: readonly CookingHistoryItem[];
  title: string;
  onOpen: (roomId: CookingHistoryItem["_id"]) => void;
};

export const HistoryCooking: FC<HistoryCookingProps> = ({ rooms, title, onOpen }) => {
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
      <DropdownMenuContent align="end" className={styles["history-cooking-menu"]}>
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
            <span className={styles["history-cooking-state"]}>
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
};
