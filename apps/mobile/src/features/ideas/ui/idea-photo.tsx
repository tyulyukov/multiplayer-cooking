import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

export function IdeaPhoto({ idea }: { idea: Idea }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  if (!idea.imageUrl || !idea.image) return <PhotoNotice message={idea.imageError} />;

  if (state === "failed") {
    return <PhotoNotice message={idea.imageError ?? "Спробуй відкрити ідею ще раз."} />;
  }

  const { credit, sourceUrl } = idea.image;

  return (
    <View style={styles.figure}>
      <View style={styles.frame}>
        {state === "loading" ? <Skeleton height="100%" radius={0} style={styles.fill} /> : null}
        <Image
          source={idea.imageUrl}
          style={styles.fill}
          contentFit="cover"
          transition={200}
          accessible
          accessibilityLabel={idea.title}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
        />
      </View>
      {sourceUrl && credit ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Джерело фото: ${credit}`}
          hitSlop={8}
          onPress={() => void WebBrowser.openBrowserAsync(sourceUrl)}
          style={styles.credit}
        >
          <Text variant="meta" color={colors.mutedForeground} numberOfLines={1}>
            {credit}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PhotoNotice({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <View style={styles.notice}>
      <Illustration name="serving-dome" size={56} />
      <InlineAlert message={`Фото страви не завантажилося. ${message}`} style={styles.alert} />
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { gap: 6 },
  frame: {
    aspectRatio: 16 / 10,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  fill: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  credit: { alignSelf: "flex-end" },
  notice: { flexDirection: "row", alignItems: "center", gap: 12 },
  alert: { flex: 1 },
});
