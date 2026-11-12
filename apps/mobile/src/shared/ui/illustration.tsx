import { Image } from "expo-image";
import { useState } from "react";
import type { StyleProp, ImageStyle } from "react-native";

import { illustrations } from "@/shared/lib/illustrations";
import type { IllustrationName } from "@/shared/lib/illustrations";

type IllustrationProps = { name: IllustrationName; size: number; style?: StyleProp<ImageStyle> };

// Decorative: a failed image renders nothing so the adjacent text takes its place.
export function Illustration({ name, size, style }: IllustrationProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Image
      source={illustrations[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onError={() => setFailed(true)}
    />
  );
}
