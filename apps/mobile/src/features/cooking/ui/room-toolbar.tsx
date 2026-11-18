import { colors } from "@multiplayer-cooking/theme";
import { router, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { barIconsReady, useBarIcon } from "@/shared/hooks/use-bar-icon";

import { useCookingRoom } from "../model/room-context";
import { goHome } from "../lib/go-home";

type RoomToolbarProps = { full: boolean };

// Native header items of the room: back to Home, then People, Helper and the More menu once
// the person is inside the room.
export function RoomToolbar({ full }: RoomToolbarProps) {
  const room = useCookingRoom();
  const { roomId, read } = room;
  const backIcon = useBarIcon("chevron.backward", "arrow_back");
  const peopleIcon = useBarIcon("person.2", "group");
  const helperIcon = useBarIcon("bubble.left.and.text.bubble.right", "forum");
  const moreIcon = useBarIcon("ellipsis.circle", "more_vert");
  const ingredientsIcon = useBarIcon("basket", "shopping_basket");
  const timerIcon = useBarIcon("timer", "timer");
  const convertIcon = useBarIcon("arrow.left.arrow.right", "swap_horiz");
  const servingsIcon = useBarIcon("person.2.badge.plus", "group_add");
  const soundIcon = useBarIcon("speaker.wave.2", "volume_up");

  const tool = (path: "ingredients" | "timer" | "convert" | "servings") =>
    router.push({ pathname: `/cook/[roomId]/tools/${path}`, params: { roomId } });

  const rightReady = barIconsReady(
    peopleIcon,
    helperIcon,
    moreIcon,
    ingredientsIcon,
    timerIcon,
    convertIcon,
    servingsIcon,
    soundIcon,
  );

  return (
    <>
      {backIcon ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon={backIcon} accessibilityLabel="Головна" onPress={goHome} />
        </Stack.Toolbar>
      ) : null}
      {full && read && rightReady ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={peopleIcon}
            hidden={read.room.cookCount === 1}
            accessibilityLabel={`Кухарі: ${read.members.length} з ${read.room.cookCount}`}
            onPress={room.actions.managePeople}
          >
            <Stack.Toolbar.Badge style={styles.occupancy}>
              {read.room.lobbyCompletedAt === undefined
                ? `${read.members.length}/${read.room.cookCount}`
                : String(read.members.length)}
            </Stack.Toolbar.Badge>
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            icon={helperIcon}
            hidden={!read.room.plan}
            accessibilityLabel={room.helper.unread ? "Помічник, є відповідь" : "Помічник"}
            onPress={() => room.actions.ask()}
          >
            {room.helper.unread ? <Stack.Toolbar.Badge> </Stack.Toolbar.Badge> : null}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Menu icon={moreIcon} accessibilityLabel="Під рукою">
            <Stack.Toolbar.MenuAction icon={ingredientsIcon} onPress={() => tool("ingredients")}>
              Інгредієнти
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={timerIcon} onPress={() => tool("timer")}>
              Додати таймер
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={convertIcon} onPress={() => tool("convert")}>
              Перевести одиниці
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={servingsIcon} onPress={() => tool("servings")}>
              {`Порції (${read.room.requestedServings})`}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={soundIcon} isOn={room.sound} onPress={room.toggleSound}>
              Звук і вібрація таймерів
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title="">
              <Stack.Toolbar.MenuAction icon={peopleIcon} onPress={room.actions.managePeople}>
                Кухарі та запрошення
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  occupancy: { backgroundColor: colors.teal, color: colors.foreground },
});
