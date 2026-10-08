import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useCookAgain, useCreateCookingRoom } from "@/features/cooking/api/use-create-cooking-room";
import { CooksForm } from "@/features/cooking/ui/cooks-form";
import { EmptyState } from "@/shared/ui/empty-state";
import { SheetHeader } from "@/shared/ui/sheet-header";

const title = "Скільки вас готує?";

type FromIdeaProps = { ideaId: Id<"ideas">; servings: number; cookCount: number };

export function CookTogetherSheet({ ideaId, servings, cookCount }: FromIdeaProps) {
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const createRoom = useCreateCookingRoom();

  return (
    <View>
      <SheetHeader title={title} />
      {connection === undefined ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <CooksForm
          initialCount={cookCount}
          servings={servings}
          suggestedName={connection?.name}
          onCreate={async (setup) => {
            const roomId = await createRoom(ideaId, setup);
            router.back();
            router.push({ pathname: "/cook/[roomId]", params: { roomId } });
          }}
        />
      )}
    </View>
  );
}

export function CookAgainSheet({ roomId }: { roomId: string }) {
  const { read, submit } = useCookAgain(roomId);

  return (
    <View>
      <SheetHeader title={title} />
      {read === undefined ? (
        <ActivityIndicator style={styles.loading} />
      ) : read === null ? (
        <EmptyState illustration="blank-sign" size={96} message="Ця кухня більше недоступна." />
      ) : (
        <CooksForm
          initialCount={read.room.cookCount}
          servings={read.room.requestedServings}
          initialName={read.me.name}
          onCreate={async (setup) => {
            const nextRoomId = await submit(setup);
            router.back();
            router.replace({ pathname: "/cook/[roomId]", params: { roomId: nextRoomId } });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ loading: { paddingVertical: 48 } });
