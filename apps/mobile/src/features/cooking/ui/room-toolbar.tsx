import { colors } from "@multiplayer-cooking/theme";
import { router, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { useCookingRoom } from "../model/room-context";
import { goHome } from "../lib/go-home";

type RoomToolbarProps = { full: boolean };

// Native header items of the room: back to Home, then People, Helper and the More menu once
// the person is inside the room.
export function RoomToolbar({ full }: RoomToolbarProps) {
  const room = useCookingRoom();
  const { roomId, read } = room;

  const tool = (path: "ingredients" | "timer" | "convert" | "servings") =>
    router.push({ pathname: `/cook/[roomId]/tools/${path}`, params: { roomId } });

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chevron.backward"
          accessibilityLabel="Головна"
          onPress={goHome}
        />
      </Stack.Toolbar>
      {full && read ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="person.2"
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
            icon="bubble.left.and.text.bubble.right"
            hidden={!read.room.plan}
            accessibilityLabel={room.helper.unread ? "Помічник, є відповідь" : "Помічник"}
            onPress={() => room.actions.ask()}
          >
            {room.helper.unread ? <Stack.Toolbar.Badge> </Stack.Toolbar.Badge> : null}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Під рукою">
            <Stack.Toolbar.MenuAction icon="basket" onPress={() => tool("ingredients")}>
              Інгредієнти
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="timer" onPress={() => tool("timer")}>
              Додати таймер
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="arrow.left.arrow.right" onPress={() => tool("convert")}>
              Перевести одиниці
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="person.2.badge.plus" onPress={() => tool("servings")}>
              {`Порції (${read.room.requestedServings})`}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="speaker.wave.2"
              isOn={room.sound}
              onPress={room.toggleSound}
            >
              Звук і вібрація таймерів
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title="">
              <Stack.Toolbar.MenuAction icon="person.2" onPress={room.actions.managePeople}>
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
