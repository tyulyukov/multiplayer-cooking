import { colors } from "@multiplayer-cooking/theme";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { NeonLine } from "@/shared/ui/neon-line";

type CheckerBandProps = { height?: number; underStatusBar?: boolean };

// Root screens put it first in their scroll content, under the glass header. Screens without
// a header pass `underStatusBar`: the band grows upward by the top inset and whole tile rows
// still end at its bottom edge.
export function CheckerBand({ height = 24, underStatusBar = false }: CheckerBandProps) {
  const topInset = useSafeAreaInsets().top;
  const bandHeight = height + (underStatusBar ? topInset : 0);
  const tilesHeight = Math.ceil(bandHeight / height) * height;
  const square = height / 2;

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={{ height: bandHeight, overflow: "hidden" }}>
        <Svg
          width="100%"
          height={tilesHeight}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <Defs>
            <Pattern id="checker" width={height} height={height} patternUnits="userSpaceOnUse">
              <Rect width={height} height={height} fill={colors.card} />
              <Rect x={square} width={square} height={square} fill={colors.foreground} />
              <Rect y={square} width={square} height={square} fill={colors.foreground} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#checker)" />
        </Svg>
      </View>
      <NeonLine />
    </View>
  );
}
