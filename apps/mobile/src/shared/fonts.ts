import {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  GolosText_700Bold,
} from "@expo-google-fonts/golos-text";
import { Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from "@expo-google-fonts/oswald";

export const fontAssets = {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  GolosText_700Bold,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
};

export const fonts = {
  sans: "GolosText_400Regular",
  sansMedium: "GolosText_500Medium",
  sansSemiBold: "GolosText_600SemiBold",
  sansBold: "GolosText_700Bold",
  signMedium: "Oswald_500Medium",
  sign: "Oswald_600SemiBold",
  signBold: "Oswald_700Bold",
} as const satisfies Record<string, keyof typeof fontAssets>;
