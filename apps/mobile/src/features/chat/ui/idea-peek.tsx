import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { entering, layout, pressTo } from "@/shared/lib/motion";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

type IdeaPeekProps = { idea: Idea; onOpen: () => void };

export function IdeaPeek({ idea, onOpen }: IdeaPeekProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const imageUrl = idea.imageUrl && idea.imageUrl !== failedUrl ? idea.imageUrl : null;
  const generating = !idea.image && !idea.imageError;

  return (
    <Animated.View entering={entering.morph} layout={layout.morph} style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Відкрити ідею: ${idea.title}`}
        onPress={onOpen}
        onPressIn={() => {
          scale.set(pressTo(true));
        }}
        onPressOut={() => {
          scale.set(pressTo(false));
        }}
        style={styles.peek}
      >
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={styles.photo}
            contentFit="cover"
            transition={200}
            onError={() => setFailedUrl(imageUrl)}
          />
        ) : generating ? (
          <Skeleton width={40} height={40} radius={10} style={styles.skeleton} />
        ) : null}
        <View style={styles.text}>
          <Text variant="meta" color={colors.primary} numberOfLines={1}>
            Ідея готова
          </Text>
          <Text variant="secondary" color={colors.card} numberOfLines={1}>
            {idea.title}
          </Text>
        </View>
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.card} strokeWidth={1.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  peek: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radii.card,
    backgroundColor: colors.foreground,
  },
  photo: { width: 40, height: 40, borderRadius: 10 },
  skeleton: { opacity: 0.35 },
  text: { flex: 1, minWidth: 0 },
});
