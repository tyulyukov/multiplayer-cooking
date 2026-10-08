import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { haptics } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { CheckerBand } from "@/shared/ui/checker-band";
import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { Illustration } from "@/shared/ui/illustration";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Text } from "@/shared/ui/text";

import { roomUrl } from "../lib/invite-url";
import { pluralize } from "../lib/session-view";
import { useRoomData } from "../model/room-context";
import { CompletionConfetti } from "./completion-confetti";

const scallop = 12;

export function CompletionTicket() {
  const room = useRoomData();
  const { read, actions, online, roomId } = room;
  const reducedMotion = useReducedMotion();
  const [confetti] = useState(() => !room.celebrated);
  const [playing, setPlaying] = useState(confetti);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const photo = read.room.dishImage;
  const showPhoto = photo && photo.url !== failedImage;
  const title = read.room.source.title;
  const servings = read.room.plan?.servings ?? read.room.requestedServings;
  const { setCelebrated, setShowInstructions } = room;

  useEffect(() => {
    if (!confetti) return;
    haptics.success();
    setCelebrated(true);
  }, [confetti, setCelebrated]);

  useEffect(() => () => setShowInstructions(true), [setShowInstructions]);

  const toInstructions = () => router.back();

  const share = () => {
    Share.share({
      title,
      message: `${title} — приготували разом у Multiplayer Cooking`,
      url: roomUrl(roomId),
    }).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={toInstructions}>До інструкцій</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          accessibilityLabel="Поділитися"
          onPress={share}
        />
      </Stack.Toolbar>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <CheckerBand />
        {online ? null : <OfflineBanner message="Немає зв’язку. Інструкції доступні." />}
        <View style={styles.content}>
          <SignPlate title="Смачного!" style={styles.plate} />
          <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
            <View style={styles.paper}>
              {showPhoto ? (
                <View style={styles.photoBlock}>
                  <ChromeFrame radius={radii.card} fill="none" contentStyle={styles.photoFrame}>
                    <Image
                      source={photo.url}
                      accessibilityLabel={title}
                      contentFit="cover"
                      transition={400}
                      style={StyleSheet.absoluteFill}
                      onError={() => setFailedImage(photo.url)}
                    />
                  </ChromeFrame>
                  {photo.credit && photo.sourceUrl ? (
                    <Text
                      variant="meta"
                      color={colors.tealDeep}
                      accessibilityRole="link"
                      onPress={() => {
                        if (photo.sourceUrl) void WebBrowser.openBrowserAsync(photo.sourceUrl);
                      }}
                      style={styles.credit}
                    >
                      {photo.credit}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {photo && !showPhoto ? (
                <View style={styles.photoError}>
                  <Illustration name="serving-dome" size={48} />
                  <Text variant="meta" color={colors.mutedForeground}>
                    Фото не завантажилося.
                  </Text>
                </View>
              ) : null}
              <Text variant="title" role="heading" style={styles.center}>
                {title}
              </Text>
              <Text variant="meta" color={colors.mutedForeground} style={styles.center}>
                {pluralize(read.room.cookCount, "кухар", "кухарі", "кухарів")} ·{" "}
                {pluralize(servings, "порція", "порції", "порцій")}
              </Text>
              <View style={styles.tear} />
              <View style={styles.actions}>
                <Button
                  variant="lime"
                  label="Приготувати ще раз"
                  disabled={!online || actions.busy}
                  onPress={actions.cookAgain}
                />
                <Button variant="ghost" label="До інструкцій" onPress={toInstructions} />
              </View>
            </View>
            {width > 0 ? <TicketEdge width={width} /> : null}
          </View>
          <Illustration name="serving-bell" size={88} style={styles.bell} />
        </View>
      </ScrollView>
      {playing && !reducedMotion ? <CompletionConfetti onDone={setPlaying} /> : null}
    </View>
  );
}

function TicketEdge({ width }: { width: number }) {
  const count = Math.max(1, Math.round((width - 2) / (scallop * 2)));
  const step = (width - 2) / count;

  const arcs = Array.from({ length: count }, () => `q${step / 2} ${scallop * 1.6} ${step} 0`).join(
    " ",
  );

  return (
    <Svg width={width} height={scallop + 2} style={styles.edge}>
      <Path d={`M1 0 ${arcs}`} fill={colors.card} stroke={colors.foreground} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  plate: { alignSelf: "center", zIndex: 1, marginBottom: -14 },
  paper: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.foreground,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingTop: 30,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  photoBlock: { gap: 6, marginBottom: 8 },
  photoFrame: { aspectRatio: 16 / 10 },
  credit: { alignSelf: "flex-end" },
  photoError: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "center" },
  center: { textAlign: "center" },
  tear: {
    marginVertical: 12,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  actions: { gap: 10 },
  edge: { marginTop: -1 },
  bell: { alignSelf: "flex-end", marginTop: 8, marginRight: 8 },
});
