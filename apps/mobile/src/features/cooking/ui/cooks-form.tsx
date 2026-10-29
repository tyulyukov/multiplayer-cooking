import { normalizeCookName, resolveCookName } from "@multiplayer-cooking/core/cooking/cook-name";
import type { CookingSetup } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { useOnline } from "@/shared/hooks/use-online";
import { fonts } from "@/shared/fonts";
import { readSavedCookName, saveCookName } from "@/shared/lib/storage";
import { maxFontScale } from "@/shared/lib/type-scale";
import { Button } from "@/shared/ui/button";
import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Stepper } from "@/shared/ui/stepper";
import { Text } from "@/shared/ui/text";

const minCooks = 1;

const maxCooks = 12;

const countLabel = (count: number) => {
  if (count === 1) return "1 кухар";

  if (count >= 2 && count <= 4) return `${count} кухарі`;

  return `${count} кухарів`;
};

type CooksFormProps = {
  initialCount: number;
  servings: number;
  initialName?: string;
  suggestedName?: string;
  disabled?: boolean;
  onCreate: (setup: CookingSetup) => Promise<void>;
};

export function CooksForm({
  initialCount,
  servings,
  initialName = "",
  suggestedName = "",
  disabled = false,
  onCreate,
}: CooksFormProps) {
  const online = useOnline();
  const [count, setCount] = useState(initialCount);

  const [name, setName] = useState(() =>
    resolveCookName(initialName, readSavedCookName(), suggestedName),
  );

  const [needsName] = useState(() => !name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (disabled || busy || !online) return;
    const cookName = normalizeCookName(name);

    if (!cookName) {
      setError("Напиши, як тебе називати на кухні.");

      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onCreate({ cookCount: count, servings, name: cookName, constraints: "" });
      saveCookName(cookName);
    } catch {
      setError("Не вдалося створити кухню. Спробуй ще раз.");
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Illustration name="oven-mitts" size={88} style={styles.illustration} />
      <View style={styles.stepper}>
        <Stepper
          value={count}
          min={minCooks}
          max={maxCooks}
          onChange={setCount}
          label="Кількість кухарів"
          format={countLabel}
          disabled={busy}
        />
      </View>
      {needsName ? (
        <View style={styles.field}>
          <Text variant="label" nativeID="cook-name-label">
            Твоє ім’я
          </Text>
          <TextInput
            accessibilityLabelledBy="cook-name-label"
            accessibilityLabel="Твоє ім’я"
            value={name}
            maxLength={80}
            autoComplete="name"
            textContentType="givenName"
            returnKeyType="done"
            placeholder="Наприклад, Аня"
            placeholderTextColor={colors.mutedForeground}
            editable={!busy}
            maxFontSizeMultiplier={maxFontScale.body}
            onChangeText={setName}
            onSubmitEditing={() => void create()}
            style={styles.input}
          />
        </View>
      ) : null}
      {online ? null : <InlineAlert message="Немає з’єднання." />}
      {error ? <InlineAlert message={error} /> : null}
      <Button
        variant="lime"
        label="Створити кухню"
        busy={busy}
        busyLabel="Створюємо кухню…"
        disabled={disabled || !online}
        haptic="commit"
        onPress={() => void create()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingHorizontal: 16, paddingBottom: 24 },
  illustration: { alignSelf: "center" },
  stepper: { alignItems: "center" },
  field: { gap: 6 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
  },
});
