import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";

import type { useCookingRoomPage } from "../model/use-cooking-room-page";
type InviteProps = Extract<
  ReturnType<typeof useCookingRoomPage>,
  { screen: "room" }
>["inviteProps"];
export function CookingInvite({
  read,
  online,
  pending,
  error,
  inviteOpen,
  inviteUrl,
  inviteCopyState,
  copyInvite,
  rotateInviteLink,
  onOpenChange,
}: InviteProps) {
  return (
    <Drawer autoFocus open={inviteOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="cooking-drawer" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Запросити кухарів</DrawerTitle>
        </DrawerHeader>
        <div className="cooking-drawer-body cooking-invite">
          {error && <p role="alert">{error}</p>}
          {inviteUrl && read.room.inviteOpen && read.room.inviteExpiresAt > read.serverNow ? (
            <>
              <label htmlFor="cooking-invite-link">Посилання на кухню</label>
              <Input
                id="cooking-invite-link"
                value={inviteUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button size="xl" disabled={!online || pending} onClick={() => void copyInvite()}>
                {inviteCopyState === "copied" ? "Посилання скопійовано" : "Скопіювати посилання"}
              </Button>
              {inviteCopyState === "manual" && (
                <p role="status">Скопіюй посилання з поля вручну.</p>
              )}
              <details>
                <summary>Замінити посилання</summary>
                <p>Попереднє посилання перестане працювати. Учасники залишаться в кухні.</p>
                <Button
                  variant="outline"
                  disabled={!online || pending}
                  onClick={() => void rotateInviteLink()}
                >
                  Створити нове посилання
                </Button>
              </details>
            </>
          ) : (
            <>
              <p>
                {read.room.inviteOpen && read.room.inviteExpiresAt <= read.serverNow
                  ? "Термін запрошення минув. Створи нове посилання."
                  : read.room.inviteOpen
                    ? "Посилання немає на цьому пристрої. Нове запрошення припинить роботу попереднього."
                    : "Запрошення закрите. Створи нове посилання, щоб запросити кухарів."}
              </p>
              <Button
                size="xl"
                disabled={!online || pending}
                onClick={() => void rotateInviteLink()}
              >
                {read.room.inviteOpen ? "Створити нове посилання" : "Відкрити нове запрошення"}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
