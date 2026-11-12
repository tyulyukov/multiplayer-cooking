import { colors } from "@multiplayer-cooking/theme";
import { Text as NativeText, useWindowDimensions } from "react-native";
import type { TextProps as NativeTextProps } from "react-native";

import { maxFontScale, textVariants } from "@/shared/lib/type-scale";
import type { TextVariant } from "@/shared/lib/type-scale";

type TextProps = NativeTextProps & { variant?: TextVariant; color?: string };

export function Text({ variant = "body", color = colors.foreground, style, ...props }: TextProps) {
  const { fontScale } = useWindowDimensions();

  return (
    <NativeText
      key={fontScale}
      maxFontSizeMultiplier={maxFontScale[variant]}
      {...props}
      style={[textVariants[variant], { color }, style]}
    />
  );
}
