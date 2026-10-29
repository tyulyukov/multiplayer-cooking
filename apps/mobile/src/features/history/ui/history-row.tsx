import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { MenuView } from "@expo/ui/community/menu";
import type { CookingHistoryItem, HistoryEntry } from "@multiplayer-cooking/core/history/types";
import { formatRelativeTime } from "@multiplayer-cooking/core/shared/relative-time";
import { colors } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { fonts } from "@/shared/fonts";
import { Text } from "@/shared/ui/text";

const roomDate = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const roomStates: Record<CookingHistoryItem["state"], string> = {
  done: "Приготовано",
  cooking: "Готуємо",
  error: "Потрібна повторна спроба",
  ready: "Підготовка",
  generating: "Підготовка",
};

type HistoryRowProps = {
  entry: HistoryEntry;
  now: number;
  canDelete: boolean;
  onOpen: () => void;
  onOpenRoom: (roomId: string) => void;
  onDelete: () => Promise<boolean>;
};

export function HistoryRow({
  entry,
  now,
  canDelete,
  onOpen,
  onOpenRoom,
  onDelete,
}: HistoryRowProps) {
  const title = entry.title ?? entry.prompt ?? "Без назви";
  const time = `${formatRelativeTime(entry.createdAt, now)}${entry.active ? " · відкрита" : ""}${entry.failed ? " · відповідь не вдалася" : ""}`;

  const row = (
    <View style={[styles.row, entry.active && styles.active]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${time}`}
        accessibilityActions={
          entry.threadId && canDelete ? [{ name: "delete", label: "Видалити" }] : undefined
        }
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "delete") void onDelete();
        }}
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <PhotoStack urls={entry.photos} />
        <View style={styles.text}>
          <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </Text>
          <Text variant="meta" color={colors.mutedForeground} numberOfLines={2}>
            {time}
          </Text>
        </View>
      </Pressable>
      {entry.rooms.length > 0 ? (
        <KitchenButton rooms={entry.rooms} title={title} onOpenRoom={onOpenRoom} />
      ) : null}
    </View>
  );

  if (!entry.threadId) return row;

  return (
    <ReanimatedSwipeable
      enabled={canDelete}
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Видалити розмову ${title}`}
          onPress={() => {
            void onDelete().then((deleted) => {
              if (!deleted) swipeable.close();
            });
          }}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
        >
          <Text variant="secondary" color={colors.card}>
            Видалити
          </Text>
        </Pressable>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

function PhotoStack({ urls }: { urls: readonly string[] }) {
  const shown = urls.slice(0, 3);

  if (shown.length === 0) {
    return (
      <View style={styles.stack}>
        <View style={[styles.photo, styles.photoEmpty]}>
          <HugeiconsIcon
            icon={Image01Icon}
            size={18}
            color={colors.mutedForeground}
            strokeWidth={1.5}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {shown.map((url, index) => (
        <Image
          key={url}
          source={url}
          contentFit="cover"
          transition={150}
          style={[styles.photo, styles.stacked, { left: index * 6, zIndex: shown.length - index }]}
        />
      ))}
    </View>
  );
}

type KitchenButtonProps = {
  rooms: readonly CookingHistoryItem[];
  title: string;
  onOpenRoom: (roomId: string) => void;
};

function KitchenButton({ rooms, title, onOpenRoom }: KitchenButtonProps) {
  const [first] = rooms;
  const label = `Відкрити кухню: ${title}`;

  const icon = (
    <HugeiconsIcon icon={CookingPotIcon} size={22} color={colors.tealDeep} strokeWidth={1.5} />
  );

  if (rooms.length === 1 && first) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onOpenRoom(first._id)}
        style={({ pressed }) => [styles.kitchen, pressed && styles.pressed]}
      >
        {icon}
      </Pressable>
    );
  }

  return (
    <MenuView
      title="Відкрити кухню"
      actions={rooms.map((room) => ({
        id: room._id,
        title: `${roomDate.format(room.createdAt)} · ${roomStates[room.state]}`,
        image: room.state === "done" ? "checkmark.circle" : "frying.pan",
      }))}
      onPressAction={({ nativeEvent }) => onOpenRoom(nativeEvent.event)}
      style={styles.kitchen}
    >
      <View accessible accessibilityRole="button" accessibilityLabel={label} style={styles.kitchen}>
        {icon}
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    backgroundColor: colors.background,
  },
  active: { backgroundColor: `${colors.teal}40` },
  open: {
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingVertical: 10,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.sign, fontSize: 17, lineHeight: 22 },
  stack: { width: 52, height: 40 },
  photo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.muted },
  stacked: { position: "absolute", top: 0, borderWidth: 2, borderColor: colors.background },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  kitchen: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  delete: {
    width: 104,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive,
  },
  deletePressed: { opacity: 0.8 },
});
