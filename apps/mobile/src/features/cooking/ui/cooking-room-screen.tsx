import { colors } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";

import { Button } from "@/shared/ui/button";
import { CheckerBand } from "@/shared/ui/checker-band";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

import { pluralize, sessionView } from "../lib/session-view";
import { useCookingRoom, useRoomData } from "../model/room-context";
import { CookingLobby } from "./cooking-lobby";
import { CookingStatus } from "./cooking-status";
import { CookingTimeline } from "./cooking-timeline";
import { JoinRoom } from "./join-room";
import { RoomNotice } from "./room-notice";
import { RoomToolbar } from "./room-toolbar";
import { timerDockHeight, TimerDock } from "./timer-dock";

type CookingRoomScreenProps = { inviteToken?: string };

export function CookingRoomScreen({ inviteToken }: CookingRoomScreenProps) {
  const { credential, read, online } = useCookingRoom();

  if (!credential || read === null) {
    return (
      <>
        <RoomToolbar full={false} />
        <JoinRoom inviteToken={inviteToken} />
      </>
    );
  }

  if (read === undefined) {
    return (
      <>
        <RoomToolbar full={false} />
        {online ? (
          <RoomLoading />
        ) : (
          <RoomNotice
            illustration="unplugged-kettle"
            title="Немає зв’язку"
            body="Кухня відкриється, щойно з’явиться інтернет."
          />
        )}
      </>
    );
  }

  return (
    <>
      <RoomToolbar full />
      <RoomContent />
    </>
  );
}

function RoomLoading() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.screen}>
      <CheckerBand />
      <View style={styles.content}>
        <SignPlate title="Відкриваємо кухню" />
        <ShimmerText text="Перевіряємо твоє місце." />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    </ScrollView>
  );
}

const offlineMessage =
  "Немає зв’язку. План і відлік доступні. Спільні дії стануть доступні після підключення.";

function RoomContent() {
  const room = useRoomData();
  const { read, roomId, online } = room;
  const view = sessionView(read);
  const headerHeight = useHeaderHeight();
  const viewport = useWindowDimensions().height;
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const stepY = useRef(new Map<string, number>());
  const listY = useRef(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currentId = view.current?.id;
  const expanded = expandedId ?? currentId;
  const done = read.room.state === "done";
  const showDock = !view.inLobby && view.running.length > 0;

  const scrollToStep = (stepKey: string, onlyWhenHidden: boolean) => {
    const y = stepY.current.get(stepKey);

    if (y === undefined) return;
    const top = listY.current + y;
    const onScreen = top - scrollY.current;

    if (onlyWhenHidden && onScreen >= headerHeight && onScreen <= viewport * 0.65) return;
    scroll.current?.scrollTo({ y: top - headerHeight - 24, animated: true });
  };

  const revealCurrent = useEffectEvent((stepKey: string) => scrollToStep(stepKey, true));

  useEffect(() => {
    if (view.inLobby || expandedId !== null || !currentId) return;
    const id = setTimeout(() => revealCurrent(currentId), 260);

    return () => clearTimeout(id);
  }, [currentId, expandedId, view.inLobby]);

  const { showInstructions, setShowInstructions } = room;

  useEffect(() => {
    if (!done || showInstructions) return;
    router.push({ pathname: "/cook/[roomId]/done", params: { roomId } });
  }, [done, roomId, showInstructions]);

  const onStepLayout = (stepKey: string, event: LayoutChangeEvent) => {
    stepY.current.set(stepKey, event.nativeEvent.layout.y);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={64}
        onScroll={onScroll}
        contentContainerStyle={{ paddingBottom: showDock ? timerDockHeight + 56 : 32 }}
      >
        <CheckerBand />
        {online ? null : <OfflineBanner message={offlineMessage} />}
        <View style={styles.content}>
          <SignPlate title={read.room.source.title} />
          {view.inLobby ? null : <RoomMeta />}
          {done ? (
            <Button
              variant="ghost"
              compact
              label="До завершення"
              style={styles.toTicket}
              onPress={() => setShowInstructions(false)}
            />
          ) : null}
          {view.inLobby ? (
            <CookingLobby />
          ) : read.room.state === "generating" || read.room.state === "error" || !view.plan ? (
            <CookingStatus />
          ) : (
            <View
              onLayout={(event) => {
                listY.current = event.nativeEvent.layout.y;
              }}
            >
              <CookingTimeline
                view={view}
                expanded={expanded}
                onExpand={(stepKey) => setExpandedId(expanded === stepKey ? "" : stepKey)}
                onAdvance={() => setExpandedId(null)}
                onStepLayout={onStepLayout}
              />
            </View>
          )}
        </View>
      </ScrollView>
      {showDock ? (
        <TimerDock
          timers={view.running}
          isMine={view.isMine}
          onSelect={(stepKey) => {
            setExpandedId(stepKey);
            setTimeout(() => scrollToStep(stepKey, false), 260);
          }}
        />
      ) : null}
    </View>
  );
}

function RoomMeta() {
  const { read } = useRoomData();
  const others = read.members.filter((member) => member._id !== read.me._id);
  const names = others.length ? `Ти й ${others.map((member) => member.name).join(", ")}` : "Ти";
  const servings = read.room.plan?.servings ?? read.room.requestedServings;

  return (
    <Text variant="meta" color={colors.mutedForeground}>
      {names} · {pluralize(servings, "порція", "порції", "порцій")}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  toTicket: { alignSelf: "flex-start" },
});
