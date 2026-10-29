import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import Share08Icon from "@hugeicons/core-free-icons/Share08Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";

const copiedMs = 2000;

export function InviteSheet() {
  const { read, inviteUrl, online, pending, error, rotateInviteLink } = useRoomData();
  const [copy, setCopy] = useState<"idle" | "copied" | "manual">("idle");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const disabled = !online || pending;
  const { inviteOpen, inviteExpiresAt } = read.room;
  const valid = Boolean(inviteUrl) && inviteOpen && inviteExpiresAt > read.serverNow;

  useEffect(() => {
    if (copy !== "copied") return;
    const id = setTimeout(() => setCopy("idle"), copiedMs);

    return () => clearTimeout(id);
  }, [copy]);

  const copyLink = async () => {
    if (!inviteUrl) return;

    try {
      if (!(await Clipboard.setStringAsync(inviteUrl))) throw new Error("Clipboard unavailable");
      haptics.send();
      setCopy("copied");
    } catch {
      setCopy("manual");
    }
  };

  const share = () => {
    if (!inviteUrl) return;
    void Share.share({
      message: `Готуємо «${read.room.source.title}» разом — приєднуйся`,
      url: inviteUrl,
    }).catch(() => undefined);
  };

  const rotate = () => {
    setCopy("idle");
    setReplaceOpen(false);
    void rotateInviteLink();
  };

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Запросити кухарів" />
      <View style={styles.body}>
        {error && !error.scope ? <InlineAlert message={error.message} /> : null}
        {valid && inviteUrl ? (
          <>
            <View style={styles.field}>
              <Text variant="label" color={colors.mutedForeground}>
                Посилання на кухню
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Посилання на кухню"
                accessibilityHint="Копіює посилання"
                disabled={disabled}
                onPress={() => void copyLink()}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <HugeiconsIcon
                  icon={Link01Icon}
                  size={18}
                  color={colors.tealDeep}
                  strokeWidth={1.5}
                />
                <Text variant="meta" numberOfLines={1} ellipsizeMode="middle" style={styles.url}>
                  {inviteUrl}
                </Text>
              </Pressable>
            </View>
            <Button
              variant="lime"
              label="Поділитися посиланням"
              icon={Share08Icon}
              disabled={disabled}
              onPress={share}
            />
            <Button
              label={copy === "copied" ? "Посилання скопійовано" : "Скопіювати"}
              disabled={disabled}
              onPress={() => void copyLink()}
            />
            {copy === "manual" ? (
              <Text variant="meta" color={colors.mutedForeground} accessibilityLiveRegion="polite">
                Скопіюй посилання з поля вручну.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Замінити посилання"
              accessibilityState={{ expanded: replaceOpen }}
              onPress={() => setReplaceOpen(!replaceOpen)}
              style={styles.disclosure}
            >
              <Text variant="secondary">Замінити посилання</Text>
              <DisclosureChevron open={replaceOpen} />
            </Pressable>
            <Collapsible open={replaceOpen}>
              <View style={styles.replace}>
                <Text color={colors.mutedForeground}>
                  Попереднє посилання перестане працювати. Учасники залишаться в кухні.
                </Text>
                <Button
                  compact
                  label="Створити нове посилання"
                  busy={pending}
                  busyLabel="Створюємо…"
                  disabled={!online}
                  onPress={rotate}
                  style={styles.start}
                />
              </View>
            </Collapsible>
          </>
        ) : (
          <>
            <Text color={colors.mutedForeground}>
              {inviteOpen && inviteExpiresAt <= read.serverNow
                ? "Термін запрошення минув. Створи нове посилання."
                : inviteOpen
                  ? "Посилання немає на цьому пристрої. Нове запрошення припинить роботу попереднього."
                  : "Запрошення закрите. Створи нове посилання, щоб запросити кухарів."}
            </Text>
            <Button
              variant="lime"
              label={inviteOpen ? "Створити нове посилання" : "Відкрити нове запрошення"}
              busy={pending}
              busyLabel="Створюємо…"
              disabled={!online}
              onPress={rotate}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 16 },
  body: { gap: 12, paddingHorizontal: 16 },
  field: { gap: 6 },
  link: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: { backgroundColor: colors.muted },
  url: { flex: 1 },
  disclosure: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replace: { gap: 10, paddingBottom: 4 },
  start: { alignSelf: "flex-start" },
});
