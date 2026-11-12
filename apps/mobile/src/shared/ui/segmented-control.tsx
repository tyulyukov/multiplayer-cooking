import { SegmentedControl as NativeSegmentedControl } from "@expo/ui/community/segmented-control";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

type SegmentedControlProps = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

// Native UISegmentedControl through SwiftUI; it plays its own selection haptic.
export function SegmentedControl({
  values,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  return (
    <NativeSegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      appearance="light"
      onChange={(event) => onChange(event.nativeEvent.selectedSegmentIndex)}
      style={[styles.control, style]}
    />
  );
}

const styles = StyleSheet.create({ control: { alignSelf: "stretch" } });
