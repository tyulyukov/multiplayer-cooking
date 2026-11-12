import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ComposerDockProps = { children: ReactNode; onHeightChange?: (height: number) => void };

// Pins a floating composer to the bottom of the screen at `safe inset + 8` and rides the
// keyboard 8pt above its top edge. Lists under it pad their content by the reported height.
export function ComposerDock({ children, onHeightChange }: ComposerDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      style={[styles.dock, { bottom: insets.bottom + 8 }]}
    >
      <View onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}>
        {children}
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", left: 16, right: 16 },
});
