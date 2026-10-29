import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ADDRESS_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { fonts } from "@/shared/fonts";
import { haptics } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Text } from "@/shared/ui/text";

const minLength = 5;

type AddressPromptProps = { pending: boolean; cartError: string | undefined };

// The address goes straight to `silpoConnections.address`; it never enters the thread.
export function AddressPrompt({ pending, cartError }: AddressPromptProps) {
  const [sessionId] = useSessionId();
  const saveAddress = useMutation(api.silpo.saveAddress);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending || saving;
  const ready = value.trim().length >= minLength;
  const message = error ?? cartError;

  const submit = async () => {
    const address = value.trim();

    if (!sessionId || address.length < minLength || busy) return;
    setSaving(true);
    setError(null);

    try {
      const result = await saveAddress({ sessionId, address });

      if (result.ok) {
        haptics.success();
        setValue("");
      } else {
        haptics.error();
        setError(result.message);
      }
    } catch {
      haptics.error();
      setError("Не вдалося зберегти адресу. Спробуй ще раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card} accessibilityLabel="Адреса доставки">
      <View style={styles.head}>
        <HugeiconsIcon icon={Location01Icon} size={20} color={colors.tealDeep} strokeWidth={1.5} />
        <Text variant="title" style={styles.title}>
          Адреса доставки
        </Text>
      </View>
      <Text variant="secondary" style={styles.copy}>
        Потрібна, щоб Сільпо показало ціни і зібрало кошик. Зберігається лише на сервері, модель її
        не бачить.
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        editable={!busy}
        maxLength={ADDRESS_MAX_CHARACTERS}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        placeholder="Одеса, пров. Семафорний, 4"
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.tealDeep}
        maxFontSizeMultiplier={2}
        accessibilityLabel="Місто, вулиця, будинок"
        style={styles.input}
      />
      {message ? <InlineAlert message={message} /> : null}
      {busy ? (
        <ShimmerText text="Готуємо кошик Сільпо" style={styles.shimmer} />
      ) : (
        <Button
          variant="ghost"
          label="Зберегти адресу"
          disabled={!ready}
          onPress={() => void submit()}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, paddingVertical: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, lineHeight: 22 },
  copy: { fontFamily: fonts.sans, color: colors.mutedForeground },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: radii.button,
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
    backgroundColor: colors.card,
  },
  shimmer: { minHeight: 48, justifyContent: "center" },
});
