import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { chromeWidth } from "@/shared/ui/chrome-frame";

const stops = [
  [0, "#f2f4f6"],
  [0.4, "#a7b0ba"],
  [0.7, "#6d7883"],
  [1, "#f2f4f6"],
] as const;

// The chrome gradient as a stroke only, for translucent surfaces such as glass where
// ChromeFrame's painted background would show through.
export function ChromeBorder({ radius }: { radius: number }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const gradientId = `chrome-${useId().replaceAll(":", "")}`;
  const inset = chromeWidth / 2;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0.33" y1="0.03" x2="0.67" y2="0.97">
              {stops.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={inset}
            y={inset}
            width={size.width - chromeWidth}
            height={size.height - chromeWidth}
            rx={radius - inset}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={chromeWidth}
          />
        </Svg>
      ) : null}
    </View>
  );
}
