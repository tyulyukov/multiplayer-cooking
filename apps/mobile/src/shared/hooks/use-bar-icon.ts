import { colors } from "@multiplayer-cooking/theme";
import {
  type AndroidSymbol,
  type SFSymbol,
  unstable_getMaterialSymbolSourceAsync,
} from "expo-symbols";
import { useEffect, useState } from "react";
import { type ImageSourcePropType, Platform } from "react-native";

// Android header items take only image sources, so Material Symbols are rendered to images
// once and shared across screens. The toolbar tints them, so the colour here does not show.
const ICON_SIZE = 24;

type BarIcon = SFSymbol | ImageSourcePropType;

const pending = new Map<AndroidSymbol, Promise<ImageSourcePropType | null>>();

const rendered = new Map<AndroidSymbol, ImageSourcePropType>();

function materialSource(symbol: AndroidSymbol) {
  let source = pending.get(symbol);

  if (!source) {
    source = unstable_getMaterialSymbolSourceAsync(symbol, ICON_SIZE, colors.foreground)
      .then((image) => {
        if (image) rendered.set(symbol, image);

        return image;
      })
      .catch(() => null);
    pending.set(symbol, source);
  }

  return source;
}

// Native bar icon: the SF Symbol on iOS, the matching Material Symbol on Android.
// On Android it is undefined until the image first renders; later screens start from it.
// The image lives in state: the React Compiler memoizes reads of the module cache.
export function useBarIcon(sf: SFSymbol, material: AndroidSymbol): BarIcon | undefined {
  const [loaded, setLoaded] = useState(() => {
    const source = rendered.get(material);

    return source ? { symbol: material, source } : undefined;
  });

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let live = true;

    void materialSource(material).then((source) => {
      if (live && source) setLoaded({ symbol: material, source });
    });

    return () => {
      live = false;
    };
  }, [material]);

  if (Platform.OS !== "android") return sf;

  return loaded?.symbol === material ? loaded.source : undefined;
}

// Android warns on a toolbar item without an image, so a toolbar waits for all of its icons.
export function barIconsReady(...icons: ReadonlyArray<BarIcon | undefined>) {
  return icons.every((icon) => icon !== undefined);
}
