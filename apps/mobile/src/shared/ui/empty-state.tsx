import type { IconSvgElement } from "@hugeicons/react-native";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Illustration } from "@/shared/ui/illustration";
import type { IllustrationName } from "@/shared/lib/illustrations";
import { InkTag } from "@/shared/ui/ink-tag";
import { Text } from "@/shared/ui/text";

type EmptyStateProps = {
  illustration?: IllustrationName;
  size?: number;
  message: string;
  action?: { label: string; onPress: () => void; icon?: IconSvgElement };
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ illustration, size = 112, message, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.state, style]}>
      {illustration ? <Illustration name={illustration} size={size} /> : null}
      <Text color={colors.mutedForeground} style={styles.message}>
        {message}
      </Text>
      {action ? <InkTag {...action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: "center", justifyContent: "center", gap: 12, padding: 16 },
  message: { maxWidth: 280, fontSize: 15, lineHeight: 21, textAlign: "center" },
});
