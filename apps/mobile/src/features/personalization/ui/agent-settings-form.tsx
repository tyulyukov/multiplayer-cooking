import type { AgentSettings } from "@multiplayer-cooking/core/personalization/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fonts } from "@/shared/fonts";
import { haptics } from "@/shared/lib/haptics";
import { maxFontScale } from "@/shared/lib/type-scale";
import { Text } from "@/shared/ui/text";

const tones: { value: AgentSettings["tone"]; label: string; description: string }[] = [
  { value: "friendly", label: "Теплий", description: "Пояснює спокійно і по-людськи" },
  { value: "concise", label: "Лаконічний", description: "Каже тільки потрібне" },
  { value: "playful", label: "Грайливий", description: "Додає трохи настрою" },
];

type AgentSettingsFormProps = {
  cookName: string;
  onCookName: (value: string) => void;
  draft: AgentSettings;
  onChange: (changes: Partial<AgentSettings>) => void;
  loading: boolean;
};

export function AgentSettingsForm({
  cookName,
  onCookName,
  draft,
  onChange,
  loading,
}: AgentSettingsFormProps) {
  return (
    <View style={styles.form}>
      <Field label="Твоє ім’я на кухні">
        <Input
          value={cookName}
          maxLength={80}
          autoComplete="name"
          textContentType="givenName"
          placeholder="Наприклад, Аня"
          editable={!loading}
          onChangeText={onCookName}
        />
      </Field>
      <View accessibilityRole="radiogroup" accessibilityLabel="Тон агента" style={styles.field}>
        <Text variant="label">Тон агента</Text>
        <View style={styles.group}>
          {tones.map((tone, index) => {
            const selected = draft.tone === tone.value;

            return (
              <Pressable
                key={tone.value}
                accessibilityRole="radio"
                accessibilityLabel={`${tone.label}. ${tone.description}`}
                accessibilityState={{ checked: selected, disabled: loading }}
                disabled={loading}
                onPress={() => {
                  if (selected) return;
                  haptics.selection();
                  onChange({ tone: tone.value });
                }}
                style={({ pressed }) => [
                  styles.tone,
                  index > 0 && styles.toneDivider,
                  pressed && styles.tonePressed,
                ]}
              >
                <View style={styles.toneText}>
                  <Text variant="secondary">{tone.label}</Text>
                  <Text variant="meta" color={colors.mutedForeground}>
                    {tone.description}
                  </Text>
                </View>
                {selected ? (
                  <SymbolView
                    name="checkmark"
                    size={17}
                    weight="semibold"
                    tintColor={colors.tealDeep}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Field label="Що ще враховувати" counter={`${draft.customInstructions.length}/1000`}>
        <Input
          multiline
          value={draft.customInstructions}
          maxLength={1000}
          placeholder="Наприклад, завжди пропонуй простішу альтернативу"
          editable={!loading}
          onChangeText={(customInstructions) => onChange({ customInstructions })}
          style={styles.multiline}
        />
      </Field>
      <Field label="Розкажи про себе" counter={`${draft.about.length}/600`}>
        <Input
          multiline
          value={draft.about}
          maxLength={600}
          placeholder="Наприклад, готую для двох і не люблю довго стояти біля плити"
          editable={!loading}
          onChangeText={(about) => onChange({ about })}
          style={styles.multiline}
        />
      </Field>
    </View>
  );
}

type FieldProps = { label: string; counter?: string; children: ReactNode };

function Field({ label, counter, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
      {counter ? (
        <Text variant="meta" color={colors.mutedForeground} style={styles.counter}>
          {counter}
        </Text>
      ) : null}
    </View>
  );
}

function Input({ style, placeholder, ...props }: TextInputProps) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      maxFontSizeMultiplier={maxFontScale.body}
      {...props}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  field: { gap: 6 },
  group: {
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  tone: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toneDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tonePressed: { backgroundColor: colors.muted },
  toneText: { flex: 1, gap: 2 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
  },
  multiline: { minHeight: 104, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontVariant: ["tabular-nums"] },
});
