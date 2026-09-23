import { GolosText_400Regular, GolosText_700Bold } from "@expo-google-fonts/golos-text";
import { Oswald_600SemiBold } from "@expo-google-fonts/oswald";

export const fontAssets = { GolosText_400Regular, GolosText_700Bold, Oswald_600SemiBold };

export const fonts = {
  sans: "GolosText_400Regular",
  sansBold: "GolosText_700Bold",
  sign: "Oswald_600SemiBold",
} as const satisfies Record<string, keyof typeof fontAssets>;
