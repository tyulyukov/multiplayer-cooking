import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import UndoIcon from "@hugeicons/core-free-icons/UndoIcon";
import type { IconSvgElement } from "@hugeicons/react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IdeaVersions } from "@multiplayer-cooking/core/ideas/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Pressable, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Text } from "@/shared/ui/text";

export function IdeaVersionNav({ versions }: { versions: IdeaVersions }) {
  if (versions.count < 2) return null;

  const latest = versions.index === versions.count - 1;

  const go = (next: number) => {
    haptics.selection();
    versions.onSelect(next);
  };

  return (
    <View style={styles.nav}>
      <View accessibilityLabel="Версії ідеї" style={styles.row}>
        <ArrowButton
          icon={ArrowLeft01Icon}
          label="Попередня версія"
          disabled={versions.index === 0}
          onPress={() => go(versions.index - 1)}
        />
        <Text variant="tag" style={styles.label}>
          Версія {versions.index + 1} з {versions.count}
        </Text>
        <ArrowButton
          icon={ArrowRight01Icon}
          label="Наступна версія"
          disabled={latest}
          onPress={() => go(versions.index + 1)}
        />
        {latest ? null : (
          <Button
            variant="tag"
            icon={UndoIcon}
            label="Повернути цю версію"
            busy={versions.restoring}
            busyLabel="Повертаємо…"
            onPress={versions.onRestore}
            style={styles.restore}
          />
        )}
      </View>
      {versions.restoreError ? <InlineAlert message={versions.restoreError} /> : null}
    </View>
  );
}

type ArrowButtonProps = {
  icon: IconSvgElement;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function ArrowButton({ icon, label, disabled, onPress }: ArrowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <HugeiconsIcon icon={icon} size={20} color={colors.foreground} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  label: { fontVariant: ["tabular-nums"], paddingHorizontal: 4 },
  arrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button,
  },
  pressed: { backgroundColor: colors.muted },
  disabled: { opacity: 0.3 },
  restore: { marginLeft: "auto" },
});
