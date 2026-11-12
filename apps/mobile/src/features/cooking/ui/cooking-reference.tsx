import type { RuntimeStep } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { exiting } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { PhotoLightbox } from "@/shared/ui/photo-strip";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Text } from "@/shared/ui/text";

import { ReferencePlaceholder } from "./reference-placeholder";

type CookingReferenceProps = {
  imageUrl?: string;
  status?: RuntimeStep["imageStatus"];
  alt: string;
  disabled: boolean;
  onRetry: () => void;
};

const revealMs = 400;

export function CookingReference({
  imageUrl,
  status,
  alt,
  disabled,
  onRetry,
}: CookingReferenceProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);

  if (failed) {
    return (
      <ReferenceNote
        message="Зображення не завантажилось."
        action="Завантажити ще раз"
        onPress={() => {
          setFailed(false);
          setLoaded(false);
          setAttempt((value) => value + 1);
        }}
      />
    );
  }

  if (!imageUrl && status !== "pending") {
    return (
      <ReferenceNote
        message={
          status === "error"
            ? "Не вдалося створити зображення."
            : "Для цього кроку є візуальна підказка."
        }
        action={status === "error" ? "Спробувати ще раз" : "Створити зображення"}
        disabled={disabled}
        onPress={onRetry}
      />
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={imageUrl ? `Фото кроку: ${alt}` : "Готуємо зображення"}
        accessibilityHint={imageUrl ? "Відкрити фото" : undefined}
        disabled={!loaded}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.figure, pressed && styles.pressed]}
      >
        <View style={styles.frame}>
          {loaded ? null : (
            <Animated.View exiting={exiting.fadeOut} style={StyleSheet.absoluteFill}>
              <ReferencePlaceholder animate={!imageUrl} />
            </Animated.View>
          )}
          {imageUrl ? (
            <Image
              key={attempt}
              source={imageUrl}
              contentFit="cover"
              transition={revealMs}
              style={StyleSheet.absoluteFill}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          ) : null}
        </View>
        {imageUrl ? (
          <View style={styles.caption}>
            <Text variant="tag">Фото кроку</Text>
            <Text variant="meta" color={colors.mutedForeground} numberOfLines={3}>
              {alt}
            </Text>
          </View>
        ) : (
          <ShimmerText text="Готуємо зображення…" style={styles.caption} />
        )}
      </Pressable>
      <PhotoLightbox
        url={open ? (imageUrl ?? null) : null}
        alt={alt}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type ReferenceNoteProps = {
  message: string;
  action: string;
  disabled?: boolean;
  onPress: () => void;
};

function ReferenceNote({ message, action, disabled = false, onPress }: ReferenceNoteProps) {
  return (
    <View style={styles.note}>
      <Text variant="meta" color={colors.mutedForeground} style={styles.noteText}>
        {message}
      </Text>
      <Button variant="ghost" compact label={action} disabled={disabled} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radii.card },
  pressed: { backgroundColor: colors.muted },
  caption: { flex: 1, gap: 2 },
  frame: {
    width: 96,
    aspectRatio: 3 / 2,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  noteText: { flex: 1 },
});
