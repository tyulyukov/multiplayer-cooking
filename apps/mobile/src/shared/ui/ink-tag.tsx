import type { IconSvgElement } from "@hugeicons/react-native";
import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";

import type { HapticKind } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";

type InkTagProps = {
  label: string;
  onPress?: () => void;
  icon?: IconSvgElement;
  selected?: boolean;
  disabled?: boolean;
  haptic?: HapticKind;
  accessibilityLabel?: string;
};

export function InkTag({ selected, ...props }: InkTagProps) {
  return <Button variant="tag" selected={selected} {...props} />;
}

export function TagRow({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.row, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
