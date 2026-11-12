import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet } from "react-native";

import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { Text } from "@/shared/ui/text";

type NumberTileProps = { value: number; done?: boolean };

export function NumberTile({ value, done = false }: NumberTileProps) {
  return (
    <ChromeFrame
      radius={14}
      fill={done ? "ink" : "teal"}
      style={styles.frame}
      contentStyle={styles.content}
      accessibilityLabel={done ? `Крок ${value}, готово` : `Крок ${value}`}
    >
      {done ? (
        <HugeiconsIcon icon={Tick02Icon} size={22} color={colors.primary} strokeWidth={2.5} />
      ) : (
        <Text variant="step">{value}</Text>
      )}
    </ChromeFrame>
  );
}

const styles = StyleSheet.create({
  frame: { width: 40, height: 40 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 -3px 0 rgba(0, 0, 0, 0.15)",
  },
});
