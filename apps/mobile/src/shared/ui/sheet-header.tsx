import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { CloseButton } from "@/shared/ui/close-button";
import { Text } from "@/shared/ui/text";

type SheetHeaderProps = { title: string; onClose?: () => void; children?: ReactNode };

// A sheet opened by a deep link has nothing under it, so closing falls back to Home.
const closeSheet = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/");
};

export function SheetHeader({ title, onClose = closeSheet, children }: SheetHeaderProps) {
  return (
    <View collapsable={false} style={styles.header}>
      <View style={styles.row}>
        <Text role="heading" variant="sheetTitle" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <CloseButton onPress={onClose} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1 },
});
