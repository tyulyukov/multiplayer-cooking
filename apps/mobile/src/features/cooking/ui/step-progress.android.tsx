import { Host, LinearProgressIndicator } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet } from "react-native";

type StepProgressProps = { value: number };

// SwiftUI's ProgressView has no Android view, so Android draws the Material bar.
export function StepProgress({ value }: StepProgressProps) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.bar}>
      <LinearProgressIndicator
        progress={value}
        color={colors.teal}
        trackColor={colors.muted}
        modifiers={[fillMaxWidth()]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch" },
});
