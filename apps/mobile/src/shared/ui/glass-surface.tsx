import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { StyleSheet } from "react-native";
import type { ViewProps } from "react-native";

const glassAvailable = isGlassEffectAPIAvailable();

type GlassSurfaceProps = ViewProps & { interactive?: boolean; dark?: boolean };

// Liquid Glass on iOS 26+, a light blur elsewhere. Only for floating controls.
export function GlassSurface({
  interactive = false,
  dark = false,
  style,
  ...props
}: GlassSurfaceProps) {
  if (glassAvailable) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={dark ? "dark" : "light"}
        isInteractive={interactive}
        style={style}
        {...props}
      />
    );
  }

  return (
    <BlurView
      tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
      intensity={80}
      style={[styles.blur, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({ blur: { overflow: "hidden" } });
