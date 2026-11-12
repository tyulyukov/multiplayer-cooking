import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { colors } from "@multiplayer-cooking/theme";
import { Stack, useLocalSearchParams, type NativeStackNavigationOptions } from "expo-router";

import { isRoomId } from "@/features/cooking/lib/credential";
import { RoomNotice } from "@/features/cooking/ui/room-notice";
import { RoomProvider } from "@/features/cooking/ui/room-provider";

const sheet = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} satisfies NativeStackNavigationOptions;

const tallSheet = {
  ...sheet,
  sheetAllowedDetents: [0.6, 1],
} satisfies NativeStackNavigationOptions;

const fitSheet = {
  ...sheet,
  sheetAllowedDetents: "fitToContents",
} satisfies NativeStackNavigationOptions;

const roomHeader = {
  headerShown: true,
  headerTransparent: true,
  headerTitle: "",
  headerBackVisible: false,
} satisfies NativeStackNavigationOptions;

export default function CookingRoomLayout() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  if (!isRoomId(roomId)) {
    return (
      <RoomNotice
        illustration="blank-sign"
        title="Посилання не працює"
        body="Перевір запрошення та відкрий його ще раз."
        homeAction
      />
    );
  }

  return (
    // SAFETY: isRoomId confirmed the Convex id format; the server re-validates it on every call.
    <RoomProvider key={roomId} roomId={roomId as Id<"cookingRooms">}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={roomHeader} />
        <Stack.Screen
          name="done"
          options={{ ...roomHeader, animation: "fade", gestureEnabled: false }}
        />
        <Stack.Screen name="helper" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="people" options={tallSheet} />
        <Stack.Screen name="invite" options={fitSheet} />
        <Stack.Screen name="tools/ingredients" options={tallSheet} />
        <Stack.Screen name="tools/timer" options={fitSheet} />
        <Stack.Screen name="tools/convert" options={fitSheet} />
        <Stack.Screen name="tools/servings" options={fitSheet} />
      </Stack>
    </RoomProvider>
  );
}
