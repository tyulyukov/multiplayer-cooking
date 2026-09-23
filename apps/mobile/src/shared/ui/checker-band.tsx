import { colors } from "@multiplayer-cooking/theme";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

// Whole tile rows end at the band's bottom edge; the band grows upward by the top inset.
export function CheckerBand({ height = 48 }: { height?: number }) {
  const bandHeight = height + useSafeAreaInsets().top;
  const tilesHeight = Math.ceil(bandHeight / height) * height;
  const square = height / 2;

  return (
    <View style={{ height: bandHeight, zIndex: 1 }}>
      <View style={{ flex: 1, overflow: "hidden" }}>
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
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -3,
          height: 3,
          backgroundColor: colors.neonBlue,
          boxShadow: `0 0 8px ${colors.neonBlue}, 0 2px 14px ${colors.neonBlue}80`,
        }}
      />
    </View>
  );
}
