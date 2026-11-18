import type { NativeStackNavigationOptions } from "expo-router";

import { transparentHeader } from "@/shared/lib/screen-options";

// Home and Chat sit under a transparent system-glass header; the sign plate names Home.
export const glassHeaderOptions = {
  headerShown: true,
  ...transparentHeader,
  headerBlurEffect: "none",
  headerShadowVisible: false,
  title: "",
} satisfies NativeStackNavigationOptions;
