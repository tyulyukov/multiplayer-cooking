import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { entering, exiting, layout } from "@/shared/lib/motion";

import type { ComposerProps } from "./types";

type ComposerAttachmentsProps = Pick<ComposerProps, "attachments" | "busy" | "onRemoveAttachment">;

export function ComposerAttachments({
  attachments,
  busy,
  onRemoveAttachment,
}: ComposerAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Додані фото"
      contentContainerStyle={styles.strip}
      style={styles.scroller}
    >
      {attachments.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={entering.fadeIn}
          exiting={exiting.fadeOut}
          layout={layout.morph}
          style={[styles.tile, item.state === "error" && styles.tileError]}
        >
          <Image
            source={item.previewUrl}
            style={[styles.image, item.state !== "done" && styles.pending]}
            contentFit="cover"
            accessibilityLabel={
              item.state === "error"
                ? `Фото ${index + 1} не завантажилося`
                : item.state === "uploading"
                  ? `Фото ${index + 1} завантажується`
                  : `Фото ${index + 1}`
            }
            accessible
          />
          {item.state === "uploading" ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : null}
          {item.state === "error" ? (
            <View style={styles.overlay}>
              <HugeiconsIcon icon={Alert02Icon} size={24} color={colors.destructive} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Прибрати фото"
            disabled={busy}
            hitSlop={10}
            onPress={() => onRemoveAttachment(item.id)}
            style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={12}
              color={colors.foreground}
              strokeWidth={2.5}
            />
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0, marginHorizontal: -4 },
  strip: { gap: 8, paddingHorizontal: 4, paddingTop: 4 },
  tile: {
    width: 72,
    height: 72,
    padding: 2,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  tileError: { borderColor: colors.destructive, backgroundColor: colors.destructiveSoft },
  image: { flex: 1, borderRadius: 8 },
  pending: { opacity: 0.6 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  removePressed: { backgroundColor: colors.muted },
});
