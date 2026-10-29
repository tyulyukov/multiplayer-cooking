import { colors } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";

export function CookingLobby() {
  const { read, actions } = useRoomData();
  const host = read.me.role === "host";
  const missing = Math.max(0, read.room.cookCount - read.members.length);
  const failed = read.room.state === "error";
  const blocked = !actions.online || actions.busy;

  useEffect(() => {
    if (failed) haptics.error();
  }, [failed]);

  return (
    <View style={styles.lobby}>
      <View style={styles.intro}>
        <View style={styles.copy}>
          <Text variant="title" role="heading">
            Збираємося{"\n"}на кухні
          </Text>
          <Text variant="meta" color={colors.mutedForeground} accessibilityLiveRegion="polite">
            Приєдналися {read.members.length} з {read.room.cookCount}
          </Text>
        </View>
        <Illustration name="oven-mitts" size={96} />
      </View>
      <View accessibilityLabel="Кухарі в лобі" style={styles.list}>
        {read.members.map((member) => {
          const mine = member._id === read.me._id;

          return (
            <Pressable
              key={member._id}
              accessibilityRole="button"
              accessibilityLabel={`Кухарі: ${member.name}${mine ? ", ти" : ""}${member.role === "host" ? ", господар" : ""}`}
              onPress={actions.managePeople}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Avatar kind={mine ? "me" : "other"} name={member.name} />
              <Text variant="secondary" numberOfLines={1} style={styles.name}>
                {member.name}
                {mine ? " · ти" : ""}
              </Text>
              {member.role === "host" ? (
                <Text variant="meta" color={colors.tealDeep}>
                  Господар
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        {Array.from({ length: missing }, (_, index) => (
          <View key={`empty-${index}`} style={styles.row}>
            <Avatar kind="empty" />
            <Text variant="secondary" color={colors.mutedForeground} style={styles.name}>
              Чекаємо на кухаря
            </Text>
          </View>
        ))}
      </View>
      {failed ? (
        <InlineAlert
          message={`План не створився. ${read.room.generationError ?? "Спробуй ще раз."}`}
        />
      ) : null}
      {host && read.room.cookCount > 1 ? (
        <Button
          variant="ghost"
          label="Запросити за посиланням"
          disabled={blocked}
          onPress={actions.invite}
        />
      ) : null}
      {host ? (
        <Button
          variant="lime"
          label={failed ? "Спробувати ще раз" : "Почати готувати"}
          busy={actions.busy}
          busyLabel={failed ? "Пробуємо…" : "Починаємо…"}
          disabled={blocked || (!failed && missing > 0)}
          haptic="commit"
          onPress={failed ? actions.retryGeneration : actions.startSession}
        />
      ) : (
        <Text color={colors.mutedForeground} style={styles.wait}>
          {failed
            ? "Господар може повторити створення плану."
            : "Господар почне, коли всі приєднаються."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lobby: { gap: 16 },
  intro: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  copy: { flex: 1, gap: 6 },
  list: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.muted },
  name: { flex: 1 },
  wait: { textAlign: "center", fontSize: 15, lineHeight: 21 },
});
