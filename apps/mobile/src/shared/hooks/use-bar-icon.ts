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

const sources = new Map<AndroidSymbol, Promise<ImageSourcePropType | null>>();

function materialSource(symbol: AndroidSymbol) {
  let source = sources.get(symbol);

  if (!source) {
    source = unstable_getMaterialSymbolSourceAsync(symbol, ICON_SIZE, colors.foreground).catch(
      () => null,
    );
    sources.set(symbol, source);
  }

  return source;
}

// Native bar icon: the SF Symbol on iOS, the matching Material Symbol on Android.
// On Android it is undefined for the first frames while the image renders.
export function useBarIcon(sf: SFSymbol, material: AndroidSymbol) {
  const [loaded, setLoaded] = useState<
    Readonly<{ symbol: AndroidSymbol; source: ImageSourcePropType }> | undefined
  >();

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
