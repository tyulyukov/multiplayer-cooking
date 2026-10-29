import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { MenuView } from "@expo/ui/community/menu";
import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";

import type { AttachSource } from "@/shared/hooks/use-attachments";

const actions = [
  { id: "library", title: "Бібліотека", image: "photo.on.rectangle" },
  { id: "camera", title: "Камера", image: "camera" },
] as const;

type ComposerAttachButtonProps = { enabled: boolean; onAttach: (source: AttachSource) => void };

// A native SwiftUI menu anchored to the button: "Бібліотека" or "Камера".
export function ComposerAttachButton({ enabled, onAttach }: ComposerAttachButtonProps) {
  const icon = (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel="Додати фото"
      accessibilityState={{ disabled: !enabled }}
      style={[styles.button, !enabled && styles.disabled]}
    >
      <HugeiconsIcon icon={ImageAdd01Icon} size={22} color={colors.tealDeep} strokeWidth={1.5} />
    </View>
  );

  if (!enabled) return icon;

  return (
    <MenuView
      actions={[...actions]}
      onPressAction={({ nativeEvent }) =>
        onAttach(nativeEvent.event === "camera" ? "camera" : "library")
      }
    >
      {icon}
    </MenuView>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button,
  },
  disabled: { opacity: 0.4 },
});
