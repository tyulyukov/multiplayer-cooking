import type { NativeStackNavigationOptions } from "expo-router";

// Home and Chat sit under a transparent system-glass header; the sign plate names Home.
export const glassHeaderOptions = {
  headerShown: true,
  headerTransparent: true,
  headerBlurEffect: "none",
  headerShadowVisible: false,
  title: "",
} satisfies NativeStackNavigationOptions;
