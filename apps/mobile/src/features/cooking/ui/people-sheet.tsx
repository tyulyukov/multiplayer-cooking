import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction } from "@expo/ui/community/menu";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { colors, radii } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";
import { useDismissThen } from "../model/use-dismiss-then";

type MemberId = Id<"cookingMembers">;

export function PeopleSheet() {
  const room = useRoomData();
  const { read, roomId, api, steps, invoke, error, pending, online } = room;
  const dismissThen = useDismissThen();
  const [inviteOpen, setInviteOpen] = useState(false);
  const host = read.me.role === "host";
  const done = read.room.state === "done";
  const disabled = !online || pending;

  const vacantSlots = Array.from({ length: read.room.cookCount }, (_, index) => index + 1).filter(
    (slot) => !read.members.some((member) => member.slots.includes(slot)),
  );

  const aloneAllowed =
    !done &&
    vacantSlots.length > 0 &&
    read.members.every((member) => member._id === read.me._id || member.slots.length === 0);

  const member = (memberId: MemberId) => (token: string) => ({
    roomId,
    participantToken: token,
    memberId,
  });

  const onMemberAction = (memberId: MemberId, name: string, action: string) => {
    if (action === "swap") void invoke((t) => steps.swapRoles(member(memberId)(t)));
    else if (action === "transfer") void invoke((t) => api.transferHost(member(memberId)(t)));
    else if (action === "remove") {
      Alert.alert("Прибрати з кухні?", `${name} більше не зможе готувати в цій кухні.`, [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Прибрати",
          style: "destructive",
          onPress: () => void invoke((t) => api.removeMember(member(memberId)(t))),
        },
      ]);
    }
  };

  const memberActions = (): MenuAction[] => [
    { id: "swap", title: "Помінятися місцями", image: "arrow.left.arrow.right" },
    ...(host
      ? [
          {
            id: "host",
            title: "",
            displayInline: true,
            subactions: [
              { id: "transfer", title: "Передати кухню", image: "crown" },
              {
                id: "remove",
                title: "Прибрати з кухні",
                image: "person.badge.minus",
                attributes: { destructive: true },
              },
            ],
          } satisfies MenuAction,
        ]
      : []),
  ];

  return (
    <>
      <SheetHeader title="Кухарі" />
      <ScrollView contentContainerStyle={styles.content}>
        {error && !error.scope ? <InlineAlert message={error.message} /> : null}
        <View accessibilityLabel="Учасники кухні" style={styles.list}>
          {read.members.map((item) => {
            const mine = item._id === read.me._id;
            const canManage = !done && !mine && !disabled;

            const role = `${item.role === "host" ? "Господар · " : ""}${
              item.slots.length ? `Місце ${item.slots.join(", ")}` : "Спостерігає"
            }`;

            const row = (
              <View
                accessible
                accessibilityLabel={`${item.name}${mine ? ", ти" : ""}, ${role}`}
                style={styles.member}
              >
                <Avatar kind={mine ? "me" : "other"} name={item.name} />
                <View style={styles.memberText}>
                  <View style={styles.nameRow}>
                    <Text variant="secondary" numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    {mine ? (
                      <View style={styles.meTag}>
                        <Text variant="meta">Ти</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="meta" color={colors.mutedForeground}>
                    {role}
                  </Text>
                </View>
              </View>
            );

            if (!canManage) return <View key={item._id}>{row}</View>;

            const menu = {
              title: item.name,
              actions: memberActions(),
              onPressAction: ({ nativeEvent }: { nativeEvent: { event: string } }) =>
                onMemberAction(item._id, item.name, nativeEvent.event),
            };

            return (
              <View key={item._id} style={styles.managed}>
                <MenuView {...menu} shouldOpenOnLongPress style={styles.grow}>
                  {row}
                </MenuView>
                <MenuView {...menu}>
                  <View
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Дії для ${item.name}`}
                    style={styles.more}
                  >
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      size={22}
                      color={colors.foreground}
                      strokeWidth={1.5}
                    />
                  </View>
                </MenuView>
              </View>
            );
          })}
        </View>

        {!done && vacantSlots.length > 0 ? (
          <View style={styles.section}>
            <Text variant="label" color={colors.mutedForeground}>
              Вільні місця
            </Text>
            <View style={styles.slots}>
              {vacantSlots.map((slot) => (
                <Button
                  key={slot}
                  compact
                  label={`Взяти місце ${slot}`}
                  disabled={disabled}
                  onPress={() =>
                    void invoke((t) => steps.takeover({ roomId, participantToken: t, slot }))
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {aloneAllowed ? (
          <Button
            label="Готувати самому"
            disabled={disabled}
            onPress={() => void invoke((t) => api.continueAlone({ roomId, participantToken: t }))}
          />
        ) : null}

        {!done && !host ? (
          <Button
            variant="danger"
            label="Вийти з кухні"
            disabled={disabled}
            onPress={() =>
              void invoke((t) => api.leave({ roomId, participantToken: t })).then((left) => {
                if (left) router.back();
              })
            }
          />
        ) : null}

        {host && !done ? (
          <View style={styles.section}>
            <Button
              label="Запросити кухарів"
              disabled={disabled}
              onPress={() => dismissThen(room.actions.invite)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Керування запрошенням"
              accessibilityState={{ expanded: inviteOpen }}
              onPress={() => setInviteOpen(!inviteOpen)}
              style={styles.disclosure}
            >
              <Text variant="secondary">Керування запрошенням</Text>
              <DisclosureChevron open={inviteOpen} />
            </Pressable>
            <Collapsible open={inviteOpen}>
              <View style={styles.inviteBody}>
                <Text color={colors.mutedForeground}>
                  {read.room.inviteOpen ? "Запрошення відкрите." : "Запрошення закрите."}
                </Text>
                {read.room.inviteOpen ? (
                  <Button
                    compact
                    label="Закрити запрошення"
                    disabled={disabled}
                    onPress={() =>
                      void invoke((t) => api.closeInvite({ roomId, participantToken: t }))
                    }
                    style={styles.start}
                  />
                ) : null}
              </View>
            </Collapsible>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingHorizontal: 16, paddingBottom: 48 },
  list: { gap: 4 },
  managed: { flexDirection: "row", alignItems: "center" },
  grow: { flex: 1 },
  member: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 },
  memberText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontSize: 17, lineHeight: 22 },
  meTag: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.muted,
  },
  more: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  section: { gap: 10 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  disclosure: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteBody: { gap: 10 },
  start: { alignSelf: "flex-start" },
});
