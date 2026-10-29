import { ScrollView, StyleSheet, View } from "react-native";

import type { IllustrationName } from "@/shared/lib/illustrations";
import { Button } from "@/shared/ui/button";
import { CheckerBand } from "@/shared/ui/checker-band";
import { Illustration } from "@/shared/ui/illustration";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Text } from "@/shared/ui/text";
import { colors } from "@multiplayer-cooking/theme";

import { goHome } from "../lib/go-home";

type RoomNoticeProps = {
  title: string;
  body: string;
  illustration: IllustrationName;
  homeAction?: boolean;
};

// Full-screen room states that have nothing else to show: a broken link, an unavailable
// backend, or a room that cannot load while offline.
export function RoomNotice({ title, body, illustration, homeAction = false }: RoomNoticeProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <CheckerBand />
      <View style={styles.body}>
        <Illustration name={illustration} size={112} style={styles.art} />
        <SignPlate title={title} style={styles.plate} />
        <Text color={colors.mutedForeground} style={styles.text}>
          {body}
        </Text>
        {homeAction ? <Button label="На головну" variant="ghost" onPress={goHome} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  art: { marginBottom: 4 },
  plate: { alignSelf: "center" },
  text: { maxWidth: 300, textAlign: "center" },
});
