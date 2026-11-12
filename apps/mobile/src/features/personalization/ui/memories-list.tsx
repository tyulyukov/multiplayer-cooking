import type { Memory } from "@multiplayer-cooking/core/personalization/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Pressable, StyleSheet, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { fonts } from "@/shared/fonts";
import { EmptyState } from "@/shared/ui/empty-state";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

const kinds: Record<Memory["kind"], { label: string; background: string; color: string }> = {
  allergy: { label: "Алергія", background: colors.destructiveSoft, color: colors.destructive },
  dislike: { label: "Не подобається", background: colors.muted, color: colors.foreground },
  preference: { label: "Вподобання", background: `${colors.teal}47`, color: colors.tealDeep },
};

const memoryDate = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type MemoriesListProps = {
  memories: Memory[];
  loading: boolean;
  deletingId: string | null;
  error: string | null;
  onDelete: (id: Memory["_id"]) => Promise<boolean>;
};

export function MemoriesList({
  memories,
  loading,
  deletingId,
  error,
  onDelete,
}: MemoriesListProps) {
  if (loading) {
    return (
      <View style={styles.loading}>
        <ShimmerText text="Завантажуємо спогади…" />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </View>
    );
  }

  const sorted = [...memories].sort((first, second) => second.updatedAt - first.updatedAt);

  return (
    <View style={styles.list}>
      {error ? <InlineAlert message={error} /> : null}
      {sorted.length === 0 ? (
        <EmptyState
          illustration="memory-fridge"
          message="Щойно щось стане для тебе важливим, агент збереже це тут."
        />
      ) : (
        <View style={styles.group}>
          {sorted.map((memory, index) => (
            <MemoryRow
              key={memory._id}
              memory={memory}
              first={index === 0}
              deleting={deletingId === memory._id}
              onDelete={() => onDelete(memory._id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type MemoryRowProps = {
  memory: Memory;
  first: boolean;
  deleting: boolean;
  onDelete: () => Promise<boolean>;
};

function MemoryRow({ memory, first, deleting, onDelete }: MemoryRowProps) {
  const kind = kinds[memory.kind];
  const deleteLabel = `Видалити спогад: ${memory.text}`;

  return (
    <ReanimatedSwipeable
      enabled={!deleting}
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
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
      <View
        accessible
        accessibilityLabel={`${kind.label}. ${memory.text}. ${memoryDate.format(memory.updatedAt)}`}
        accessibilityActions={[{ name: "delete", label: "Видалити" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "delete") void onDelete();
        }}
        style={[styles.row, !first && styles.divider, deleting && styles.deleting]}
      >
        <View style={styles.rowTop}>
          <View style={[styles.badge, { backgroundColor: kind.background }]}>
            <Text variant="meta" color={kind.color} style={styles.badgeText}>
              {kind.label}
            </Text>
          </View>
          <Text variant="meta" color={colors.mutedForeground}>
            {memoryDate.format(memory.updatedAt)}
          </Text>
        </View>
        <Text>{memory.text}</Text>
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 10 },
  list: { gap: 12 },
  group: {
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  row: { gap: 6, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.card },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  deleting: { opacity: 0.5 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badge: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.sansSemiBold },
  delete: {
    width: 104,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive,
  },
  deletePressed: { opacity: 0.8 },
});
