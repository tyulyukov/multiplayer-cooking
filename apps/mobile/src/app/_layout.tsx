import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { colors } from "@multiplayer-cooking/theme";
import { SessionProvider, useSessionId } from "convex-helpers/react/sessions";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import * as Crypto from "expo-crypto";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { fontAssets } from "@/shared/fonts";
import { convexUrl } from "@/shared/lib/convex-url";
import { useSecureSessionStorage } from "@/shared/lib/storage";

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(convexUrl);

const splashTimeoutMs = 2500;

const sheet = { presentation: "formSheet", sheetGrabberVisible: true } as const;

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ConvexProvider client={convex}>
          <SessionProvider useStorage={useSecureSessionStorage} idGenerator={Crypto.randomUUID}>
            <StatusBar style="dark" />
            <RootStack />
          </SessionProvider>
        </ConvexProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const [slow, setSlow] = useState(false);
  // A slow or offline start shows Connect in its loading state instead of holding the splash.
  const ready = connection !== undefined || slow;

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), splashTimeoutMs);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={Boolean(connection)}>
        <Stack.Screen name="index" options={{ title: "Що приготуємо?" }} />
        <Stack.Screen
          name="chat"
          options={({ route }) => ({
            animation: route.params && "instant" in route.params ? "none" : "default",
          })}
        />
        <Stack.Screen
          name="history"
          options={{ ...sheet, title: "Історія розмов", sheetAllowedDetents: [0.6, 1] }}
        />
        <Stack.Screen
          name="idea"
          options={{
            ...sheet,
            title: "Страва і товари",
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: "last",
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{ ...sheet, title: "Налаштування", sheetAllowedDetents: [1] }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!connection}>
        <Stack.Screen name="connect" options={{ title: "Підключення Сільпо" }} />
      </Stack.Protected>
      <Stack.Screen name="cook/[roomId]" />
      <Stack.Screen
        name="cook-together"
        options={{ ...sheet, title: "Скільки вас готує?", sheetAllowedDetents: "fitToContents" }}
      />
    </Stack>
  );
}
