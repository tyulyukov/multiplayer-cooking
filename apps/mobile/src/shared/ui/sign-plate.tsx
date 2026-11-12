import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { Text } from "@/shared/ui/text";

type SignPlateProps = { title: string; size?: "screen" | "idea"; style?: StyleProp<ViewStyle> };

export function SignPlate({ title, size = "screen", style }: SignPlateProps) {
  const idea = size === "idea";

  return (
    <ChromeFrame
      radius={idea ? 14 : 18}
      fill="magenta"
      style={[styles.frame, style]}
      contentStyle={idea ? styles.idea : styles.screen}
    >
      <Text
        role="heading"
        variant={idea ? "ideaPlate" : "plate"}
        color={colors.accentForeground}
        numberOfLines={2}
      >
        {title}
      </Text>
    </ChromeFrame>
  );
}

const plateFace = `inset 0 0 0 2px ${colors.accentHighlight}`;

const styles = StyleSheet.create({
  frame: { alignSelf: "flex-start", maxWidth: "100%" },
  screen: {
    paddingTop: 8,
    paddingBottom: 11,
    paddingHorizontal: 16,
    boxShadow: `${plateFace}, inset 0 -5px 0 ${colors.accentDeep}`,
  },
  idea: {
    paddingTop: 6,
    paddingBottom: 9,
    paddingHorizontal: 12,
    boxShadow: `${plateFace}, inset 0 -4px 0 ${colors.accentDeep}`,
  },
});
