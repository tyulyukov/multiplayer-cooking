import { colors } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { useHistory } from "@/features/history/api/use-history";
import { HistoryRow } from "@/features/history/ui/history-row";
import { useOnline } from "@/shared/hooks/use-online";
import { EmptyState } from "@/shared/ui/empty-state";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Skeleton } from "@/shared/ui/skeleton";

// Relative labels ("5 хвилин тому") go stale while the sheet is open; tick once a minute.
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);

    return () => clearInterval(id);
  }, []);

  return now;
};

export function HistorySheet() {
  const { entries, error, openThread, deleteThread } = useHistory();
  const online = useOnline();
  const now = useNow();

  const openRoom = (roomId: string) => {
    router.back();
    router.push({ pathname: "/cook/[roomId]", params: { roomId } });
  };

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Історія розмов" />
      <View style={styles.body}>
        {online ? null : <OfflineBanner message="Немає зв’язку." />}
        {error ? <InlineAlert message={error} style={styles.error} /> : null}
        {entries === undefined ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map((key) => (
              <View key={key} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={10} />
                <View style={styles.skeletonText}>
                  <Skeleton width="60%" height={16} radius={6} />
                  <Skeleton width="35%" height={12} radius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.key}
            style={styles.list}
            contentContainerStyle={styles.content}
            ListEmptyComponent={
              <EmptyState illustration="recipe-box" message="Тут з'являться попередні розмови." />
            }
            renderItem={({ item }) => (
              <HistoryRow
                entry={item}
                now={now}
                canDelete={online}
                onOpen={() => {
                  const { threadId, rooms } = item;

                  if (threadId) {
                    void openThread(threadId).then((opened) => {
                      if (opened) router.back();
                    });
                  } else if (rooms[0]) {
                    openRoom(rooms[0]._id);
                  }
                }}
                onOpenRoom={openRoom}
                onDelete={() =>
                  item.threadId ? deleteThread(item.threadId) : Promise.resolve(false)
                }
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  error: { marginHorizontal: 16, marginBottom: 8 },
  list: { flex: 1 },
  content: { paddingBottom: 32 },
  skeletons: { paddingHorizontal: 16, gap: 8 },
  skeletonRow: { height: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  skeletonText: { flex: 1, gap: 8 },
});
