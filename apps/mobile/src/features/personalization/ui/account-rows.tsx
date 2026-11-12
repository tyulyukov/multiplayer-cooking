import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { Text } from "@/shared/ui/text";

const letters = "abcdefghijklmnopqrstuvwxyz";

const randomFrom = (pool: string) => pool[Math.floor(Math.random() * pool.length)] ?? pool[0];

// Same length and character classes as the real value, so the hidden row is as wide as the revealed one.
const scramble = (value: string) => {
  return value
    .replace(/\d/g, () => randomFrom("0123456789"))
    .replace(/[a-zа-яіїєґ]/gi, () => randomFrom(letters));
};

export function AccountRows() {
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");

  if (!connection) return null;

  return (
    <View style={styles.card}>
      <Text variant="secondary" numberOfLines={1}>
        {connection.name ?? "Акаунт Сільпо"}
      </Text>
      {connection.phone ? <RedactedContact kind="phone" value={connection.phone} /> : null}
      {connection.email ? <RedactedContact kind="email" value={connection.email} /> : null}
    </View>
  );
}

type RedactedContactProps = { kind: "phone" | "email"; value: string };

function RedactedContact({ kind, value }: RedactedContactProps) {
  const [revealed, setRevealed] = useState(false);
  const [scrambled] = useState(() => scramble(value));
  const label = kind === "phone" ? "телефон" : "пошту";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={revealed ? `Сховати ${label}: ${value}` : `Показати ${label}`}
      onPress={() => {
        haptics.selection();
        setRevealed((current) => !current);
      }}
      style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
    >
      <Text variant="meta" color={colors.mutedForeground}>
        {kind === "phone" ? "Телефон:" : "Пошта:"}
      </Text>
      <View style={styles.value}>
        <Text variant="meta" numberOfLines={1} selectable={revealed}>
          {revealed ? value : scrambled}
        </Text>
        {revealed ? null : <BlurView intensity={14} tint="light" style={StyleSheet.absoluteFill} />}
      </View>
      <Text variant="meta" color={colors.tealDeep}>
        {revealed ? "Сховати" : "Показати"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  contact: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8 },
  pressed: { opacity: 0.6 },
  value: { flexShrink: 1, overflow: "hidden", borderRadius: 4, marginRight: "auto" },
});
