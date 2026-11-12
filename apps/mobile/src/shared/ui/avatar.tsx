import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";

import { fonts } from "@/shared/fonts";
import { Text } from "@/shared/ui/text";

export type AvatarKind = "me" | "other" | "everyone" | "empty";

const palette = {
  me: { fill: colors.teal, text: colors.foreground },
  other: { fill: colors.accent, text: colors.accentForeground },
  everyone: { fill: colors.primary, text: colors.primaryForeground },
  empty: { fill: colors.muted, text: colors.foreground },
} satisfies Record<AvatarKind, { fill: string; text: string }>;

type AvatarProps = { kind: AvatarKind; name?: string; ringColor?: string };

export function Avatar({ kind, name = "", ringColor = colors.background }: AvatarProps) {
  const tone = palette[kind];
  const initial = kind === "empty" ? "+" : (name.trim()[0] ?? "?").toLocaleUpperCase("uk-UA");

  return (
    <View
      accessible
      accessibilityLabel={kind === "empty" ? "Вільне місце" : name}
      style={[styles.avatar, { backgroundColor: tone.fill, borderColor: ringColor }]}
    >
      <Text style={styles.initial} color={tone.text} maxFontSizeMultiplier={1.2}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 14 },
});
