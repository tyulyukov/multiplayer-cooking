import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { CooksForm } from "@/features/cooking/ui/cook-together";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";
import { CookingHelper } from "@/features/cooking/ui/cooking-helper";
import { People } from "@/features/cooking/ui/cooking-people";
import { CookingSession } from "@/features/cooking/ui/cooking-session";
import { JoinRoom } from "@/features/cooking/ui/join-room";
import { RoomNotice } from "@/features/cooking/ui/room-notice";
import { isConvexConfigured } from "@/app/providers/convex-provider";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";

import { useCookingRoomPage } from "./model/use-cooking-room-page";
import { CookingInvite } from "./ui/cooking-invite";

export function CookingRoomPage({ roomId }: { roomId: string }) {
  if (!isConvexConfigured)
    return (
      <RoomNotice
        title="Кухня недоступна"
        body="Не вдалося відкрити спільну сесію. Спробуй пізніше."
      />
    );

  if (!/^[a-zA-Z0-9]{16,}$/.test(roomId))
    return (
      <RoomNotice title="Посилання не працює" body="Перевір запрошення та відкрий його ще раз." />
    );

  // SAFETY: the regex above already confirmed roomId matches Convex's cookingRooms id shape.
  return <CookingRoom key={roomId} roomId={roomId as Id<"cookingRooms">} />;
}

function CookingRoom({ roomId }: { roomId: Id<"cookingRooms"> }) {
  const model = useCookingRoomPage(roomId);

  if (model.screen === "join") return <JoinRoom {...model.joinProps} />;

  if (model.screen === "loading")
    return <RoomNotice title="Відкриваємо кухню" body="Перевіряємо твоє місце." />;

  return (
    <div>
      <CookingSession data={model.read} actions={model.actions} />
      <Drawer autoFocus open={model.againOpen} onOpenChange={model.setAgainOpen}>
        <DrawerContent className={cookingStyles["cooking-drawer"]} aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>Приготувати ще раз</DrawerTitle>
          </DrawerHeader>
          <div className={cookingStyles["cooking-drawer-body"]}>
            <CooksForm {...model.setupProps} />
          </div>
        </DrawerContent>
      </Drawer>
      <CookingInvite {...model.inviteProps} />
      {model.helperProps && <CookingHelper {...model.helperProps} />}
      {model.error && (
        <p className={cookingStyles["cooking-action-error"]} role="alert">
          {model.error}
        </p>
      )}
      {model.peopleOpen && <People {...model.peopleProps} />}
    </div>
  );
}
