import { colors, radii } from "@multiplayer-cooking/theme";
import { useId } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fonts } from "@/shared/fonts";
import { Text } from "@/shared/ui/text";

type ToolsFieldProps = Omit<TextInputProps, "style"> & { label: string };

// Labelled text input of the room sheets: white field, 2pt ink border, body type.
export function ToolsField({ label, multiline, ...props }: ToolsFieldProps) {
  const labelId = useId();

  return (
    <View style={styles.field}>
      <Text variant="label" color={colors.mutedForeground} nativeID={labelId}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.tealDeep}
        maxFontSizeMultiplier={2}
        multiline={multiline}
        {...props}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
    color: colors.foreground,
  },
  multiline: { minHeight: 96, borderRadius: radii.card, textAlignVertical: "top" },
});
