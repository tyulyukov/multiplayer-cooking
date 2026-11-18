import { Host, ProgressView } from "@expo/ui/swift-ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet } from "react-native";

type StepProgressProps = { value: number };

// The plan's done-steps bar. The Android build lives in step-progress.android.tsx.
export function StepProgress({ value }: StepProgressProps) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.bar}>
      <ProgressView value={value} modifiers={[tint(colors.teal)]} />
    </Host>
  );
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch" },
});
