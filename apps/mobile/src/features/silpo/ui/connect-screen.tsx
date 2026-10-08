import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { colors } from "@multiplayer-cooking/theme";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { useOffline } from "@/shared/hooks/use-offline";
import { useSilpoConnect } from "@/features/silpo/model/use-silpo-connect";
import { Brand } from "@/shared/ui/brand";
import { Button } from "@/shared/ui/button";
import { CheckerBand } from "@/shared/ui/checker-band";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

const kitchenMobile = require("@/assets/images/starter-kitchen-mobile.webp");

const kitchenTablet = require("@/assets/images/starter-kitchen-tablet.webp");

const starterSign = require("@/assets/images/starter-sign.webp");

const notes = {
  idle: "Вхід за номером телефону на сайті Сільпо.",
  offline: "Немає зв’язку. Підключення стане доступним після відновлення.",
  notReady: "Сервер ще не налаштований.",
};

export function ConnectScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const status = useQuery(api.status.current);
  const offline = useOffline();
  const { connect, connecting, error } = useSilpoConnect();
  const loading = connection === undefined && !offline;
  const notReady = status?.ready === false;
  const note = offline ? notes.offline : notReady ? notes.notReady : notes.idle;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { minHeight: wide ? 800 : 760 }]}
      bounces={false}
    >
      <Image
        source={wide ? kitchenTablet : kitchenMobile}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        accessible={false}
      />
      <CheckerBand underStatusBar />
      <View style={styles.topbar}>
        <Brand />
      </View>
      <View style={styles.card}>
        <Image source={starterSign} style={styles.sign} contentFit="contain" accessible={false} />
        <Text role="heading" variant="title" style={styles.title}>
          Що приготуємо сьогодні?
        </Text>
        {loading ? (
          <Skeleton width={220} height={52} radius={12} style={styles.button} />
        ) : (
          <Button
            variant="lime"
            label="Підключити Сільпо"
            busyLabel="Відкриваємо Сільпо…"
            icon={Store01Icon}
            busy={connecting}
            disabled={offline || notReady}
            onPress={() => void connect()}
            style={styles.button}
          />
        )}
        <Text variant="meta" color={colors.mutedForeground} style={styles.note}>
          {note}
        </Text>
        {error ? <InlineAlert message={error} style={styles.alert} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  topbar: { minHeight: 44, marginTop: 12, paddingHorizontal: 20, justifyContent: "center" },
  card: { alignItems: "center", paddingHorizontal: 20, marginTop: 16 },
  sign: { width: 132, height: 140 },
  title: { marginTop: 16, textAlign: "center" },
  button: { marginTop: 36, minWidth: 220 },
  note: { marginTop: 24, maxWidth: 280, textAlign: "center" },
  alert: { marginTop: 16, alignSelf: "stretch", maxWidth: 420 },
});
