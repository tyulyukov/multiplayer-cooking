import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { fonts } from "@/shared/fonts";
import { Brand } from "@/shared/ui/brand";
import { CheckerBand } from "@/shared/ui/checker-band";

const kitchenMobile = require("@/assets/images/starter-kitchen-mobile.webp");

const kitchenTablet = require("@/assets/images/starter-kitchen-tablet.webp");

const starterSign = require("@/assets/images/starter-sign.webp");

// lean-coding: mock sign-in that only shows the busy state; replace with Сільпо OAuth when the app talks to Convex.
const mockConnectMs = 1500;

export default function ConnectScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const titleSize = clamp(32, width * 0.032, 44);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusy(false), mockConnectMs);

    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: wide ? 800 : 760 }}>
      <Image
        source={wide ? kitchenTablet : kitchenMobile}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
      />
      <CheckerBand height={28} />
      <View style={styles.topbar}>
        <Brand />
      </View>

      <View style={[styles.card, wide && styles.cardWide]}>
        <Image
          source={starterSign}
          style={wide ? styles.signWide : styles.sign}
          contentFit="contain"
        />
        <Text
          role="heading"
          style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}
        >
          Що приготуємо сьогодні?
        </Text>
        <Pressable
          role="button"
          disabled={busy}
          aria-busy={busy}
          onPress={() => setBusy(true)}
          style={({ pressed }) => [
            styles.button,
            wide && styles.buttonWide,
            pressed && styles.buttonPressed,
            busy && styles.buttonBusy,
          ]}
        >
          <HugeiconsIcon
            icon={Store01Icon}
            size={20}
            strokeWidth={1.5}
            color={colors.primaryForeground}
          />
          <Text style={styles.buttonLabel}>
            {busy ? "Відкриваємо Сільпо…" : "Підключити Сільпо"}
          </Text>
        </Pressable>
        <Text style={styles.note}>Вхід за номером телефону на сайті Сільпо.</Text>
      </View>
    </ScrollView>
  );
}

function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 50,
    marginTop: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    alignItems: "center",
    gap: 24,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  cardWide: { marginTop: 28 },
  sign: { width: 132, height: 140 },
  signWide: { width: 160, height: 164 },
  title: {
    marginBottom: 12,
    color: colors.foreground,
    fontFamily: fonts.sign,
    textAlign: "center",
  },
  button: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.foreground}, inset 0 -3px 0 rgba(0, 0, 0, 0.15)`,
  },
  buttonWide: { minWidth: 320 },
  buttonPressed: {
    boxShadow: `0 0 0 2px ${colors.foreground}, inset 0 -1px 0 rgba(0, 0, 0, 0.15)`,
    transform: [{ scale: 0.97 }, { translateY: 1 }, { rotate: "-0.3deg" }],
  },
  buttonBusy: { opacity: 0.5 },
  buttonLabel: {
    color: colors.primaryForeground,
    fontFamily: fonts.sansBold,
    fontSize: 16,
  },
  note: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
