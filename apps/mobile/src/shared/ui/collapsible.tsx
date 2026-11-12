import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors } from "@multiplayer-cooking/theme";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { entering, exiting, layout, timeTo } from "@/shared/lib/motion";

type CollapsibleProps = { open: boolean; children: ReactNode; style?: StyleProp<ViewStyle> };

// Body of a disclosure. The header is the caller's own pressable; give siblings below
// `layout={layout.disclosure}` so they glide instead of jumping.
export function Collapsible({ open, children, style }: CollapsibleProps) {
  return (
    <Animated.View layout={layout.disclosure} style={[{ overflow: "hidden" }, style]}>
      {open ? (
        <Animated.View entering={entering.disclosure} exiting={exiting.fadeOut}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

type DisclosureChevronProps = { open: boolean; color?: string };

export function DisclosureChevron({ open, color = colors.foreground }: DisclosureChevronProps) {
  const rotation = useSharedValue(open ? 180 : 0);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  useEffect(() => {
    rotation.set(timeTo(open ? 180 : 0, "disclosure"));
  }, [open, rotation]);

  return (
    <Animated.View accessible={false} style={rotationStyle}>
      <HugeiconsIcon icon={ArrowDown01Icon} size={20} color={color} strokeWidth={1.5} />
    </Animated.View>
  );
}
