import "./cooking-people.css";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "../../../convex/_generated/dataModel";
import type { CookingRoomData } from "./cooking-session";

export function People({
  disabled,
  error,
  open,
  room,
  onOpenChange,
  onCloseInvite,
  onRotateInvite,
  onRemove,
  onTransfer,
  onContinueAlone,
  onLeave,
  onTakeover,
  onSwap,
}: {
  disabled: boolean;
  error: string | null;
  open: boolean;
  room: CookingRoomData;
  onOpenChange: (open: boolean) => void;
  onCloseInvite: () => void;
  onRotateInvite: () => void;
  onRemove: (memberId: Id<"cookingMembers">) => void;
  onTransfer: (memberId: Id<"cookingMembers">) => void;
  onContinueAlone: () => void;
  onLeave: () => void;
  onTakeover: (slot: number) => void;
  onSwap: (memberId: Id<"cookingMembers">) => void;
}) {
  const host = room.me.role === "host";
  const done = room.room.state === "done";
  const vacantSlots = Array.from({ length: room.room.cookCount }, (_, index) => index + 1).filter(
    (slot) => !room.members.some((member) => member.slots.includes(slot)),
  );

  return (
    <Drawer autoFocus open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="cooking-people-drawer" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Кухарі</DrawerTitle>
        </DrawerHeader>
        <section className="cooking-people">
          {error && (
            <p className="cooking-people-error" role="alert">
              {error}
            </p>
          )}
          <ul className="cooking-people-list" aria-label="Учасники кухні">
            {room.members.map((member) => {
              const mine = member._id === room.me._id;
              const canManage = !done && !mine;
              return (
                <li className="cooking-people-member" key={member._id}>
                  <span className="cooking-people-avatar" data-mine={mine} aria-hidden>
                    {member.name.slice(0, 1)}
                  </span>
                  <span className="cooking-people-member-copy">
                    <strong>
                      {member.name}
                      {mine && <small className="cooking-people-me">Ти</small>}
                    </strong>
                    <span>
                      {member.role === "host" && "Господар · "}
                      {member.slots.length ? `Місце ${member.slots.join(", ")}` : "Спостерігає"}
                    </span>
                  </span>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Дії для ${member.name}`}
                          disabled={disabled}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.5} aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="cooking-people-menu">
                        <DropdownMenuItem disabled={disabled} onSelect={() => onSwap(member._id)}>
                          Помінятися місцями
                        </DropdownMenuItem>
                        {host && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={disabled}
                              onSelect={() => onTransfer(member._id)}
                            >
                              Передати кухню
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={disabled}
                              variant="destructive"
                              onSelect={() => onRemove(member._id)}
                            >
                              Прибрати з кухні
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>

          {!done && vacantSlots.length > 0 && (
            <div className="cooking-people-places">
              <span>Вільні місця</span>
              <div>
                {vacantSlots.map((slot) => (
                  <Button
                    disabled={disabled}
                    key={slot}
                    size="sm"
                    variant="outline"
                    onClick={() => onTakeover(slot)}
                  >
                    Взяти місце {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!done &&
            vacantSlots.length > 0 &&
            room.members.every(
              (member) => member._id === room.me._id || member.slots.length === 0,
            ) && (
              <Button
                className="cooking-people-alone"
                disabled={disabled}
                size="sm"
                variant="ghost"
                onClick={onContinueAlone}
              >
                Готувати самому
              </Button>
            )}

          {!done && !host && (
            <Button
              className="cooking-people-leave"
              disabled={disabled}
              size="sm"
              variant="ghost"
              onClick={onLeave}
            >
              Вийти з кухні
            </Button>
          )}

          {host && !done && (
            <footer className="cooking-people-footer">
              <Button disabled={disabled} size="xl" onClick={onRotateInvite}>
                Запросити кухарів
              </Button>
              <details>
                <summary>Керування запрошенням</summary>
                <p>{room.room.inviteOpen ? "Запрошення відкрите." : "Запрошення закрите."}</p>
                {room.room.inviteOpen && (
                  <Button disabled={disabled} size="sm" variant="ghost" onClick={onCloseInvite}>
                    Закрити запрошення
                  </Button>
                )}
              </details>
            </footer>
          )}
        </section>
      </DrawerContent>
    </Drawer>
  );
}
