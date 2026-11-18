import { colors, radii } from "@multiplayer-cooking/theme";
import type { NativeStackNavigationOptions } from "expo-router";
import { Platform } from "react-native";

// Android ignores contentInsetAdjustmentBehavior, so content would slide under a transparent
// header there. Android gets an opaque header in the page colour instead.
export const transparentHeader = {
  headerTransparent: Platform.OS === "ios",
  headerStyle: Platform.OS === "ios" ? undefined : { backgroundColor: colors.background },
} satisfies NativeStackNavigationOptions;

// Native form sheet. iOS draws the grabber and its own corners; Android needs the radius.
export const formSheet = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: Platform.OS === "android" ? radii.composer : undefined,
} satisfies NativeStackNavigationOptions;
