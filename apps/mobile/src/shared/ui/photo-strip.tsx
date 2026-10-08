import { colors, radii } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CloseButton } from "@/shared/ui/close-button";

type PhotoStripProps = { urls: readonly string[]; alt: string; size?: number };

export function PhotoStrip({ urls, alt, size = 96 }: PhotoStripProps) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      <View style={styles.strip}>
        {urls.map((url, index) => (
          <Pressable
            key={url}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Відкрити фото ${index + 1}`}
            onPress={() => setOpenUrl(url)}
            style={({ pressed }) => [
              { width: size, height: size },
              styles.thumb,
              pressed && styles.pressed,
            ]}
          >
            <Image source={url} style={styles.fill} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </View>
      <PhotoLightbox url={openUrl} alt={alt} onClose={() => setOpenUrl(null)} />
    </>
  );
}

const spring = { damping: 20, stiffness: 220, reduceMotion: ReduceMotion.System };

const maxZoom = 4;

type PhotoLightboxProps = { url: string | null; alt: string; onClose: () => void };

export function PhotoLightbox({ url, alt, onClose }: PhotoLightboxProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.set(withSpring(1, spring));
    savedScale.set(1);
    offsetX.set(withSpring(0, spring));
    offsetY.set(withSpring(0, spring));
    savedX.set(0);
    savedY.set(0);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.min(maxZoom, Math.max(0.8, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      if (scale.get() <= 1) {
        reset();

        return;
      }

      savedScale.set(scale.get());
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((event) => {
      if (savedScale.get() <= 1) return;
      offsetX.set(savedX.get() + event.translationX);
      offsetY.set(savedY.get() + event.translationY);
    })
    .onEnd(() => {
      savedX.set(offsetX.get());
      savedY.set(offsetY.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.get() > 1) {
        reset();

        return;
      }

      scale.set(withSpring(2.5, spring));
      savedScale.set(2.5);
    });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={url !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.backdrop}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
          <Animated.View style={[styles.stage, zoomStyle]}>
            {url ? (
              <Image
                source={url}
                style={styles.fill}
                contentFit="contain"
                accessibilityLabel={alt}
                accessible
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
        <View style={[styles.close, { top: insets.top + 8 }]}>
          <CloseButton size={36} onDark onPress={close} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  thumb: { borderRadius: 10, overflow: "hidden", backgroundColor: colors.muted },
  pressed: { opacity: 0.8 },
  fill: { width: "100%", height: "100%" },
  backdrop: { flex: 1, backgroundColor: `${colors.foreground}f2` },
  stage: { flex: 1, padding: 6, borderRadius: radii.card },
  close: { position: "absolute", right: 16 },
});
