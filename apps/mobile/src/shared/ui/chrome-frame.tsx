import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";

const chromeGradient = "linear-gradient(160deg, #f2f4f6, #a7b0ba 40%, #6d7883 70%, #f2f4f6)";

export const chromeWidth = 2;

const fills = {
  white: colors.card,
  ink: colors.foreground,
  magenta: colors.accent,
  teal: colors.teal,
  none: "transparent",
} as const;

export type ChromeFill = keyof typeof fills;

type ChromeFrameProps = ViewProps & {
  radius?: number;
  fill?: ChromeFill;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ChromeFrame({
  radius = radii.card,
  fill = "white",
  style,
  contentStyle,
  children,
  ...props
}: ChromeFrameProps) {
  return (
    <View {...props} style={[styles.frame, { borderRadius: radius }, style]}>
      <View
        style={[
          styles.content,
          { borderRadius: radius - chromeWidth, backgroundColor: fills[fill] },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { padding: chromeWidth, experimental_backgroundImage: chromeGradient },
  content: { overflow: "hidden" },
});
