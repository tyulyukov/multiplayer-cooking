import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Button } from "@/shared/ui/button";
import { Text } from "@/shared/ui/text";

type InlineAlertProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function InlineAlert({
  message,
  onRetry,
  retryLabel = "Спробувати ще раз",
  retrying = false,
  style,
}: InlineAlertProps) {
  return (
    <View accessibilityRole="alert" style={[styles.alert, style]}>
      <View style={styles.row}>
        <HugeiconsIcon icon={Alert02Icon} size={20} color={colors.destructive} strokeWidth={1.5} />
        <Text variant="meta" color={colors.destructiveForeground} style={styles.message}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button
          variant="ghost"
          compact
          label={retryLabel}
          busy={retrying}
          busyLabel="Пробуємо…"
          onPress={onRetry}
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: `${colors.destructive}4d`,
    backgroundColor: colors.destructiveSoft,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  message: { flex: 1, fontSize: 15, lineHeight: 20 },
  retry: { alignSelf: "flex-start", marginLeft: 30 },
});
