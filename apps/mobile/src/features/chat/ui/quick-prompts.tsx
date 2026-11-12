import type { QuickPrompt } from "@multiplayer-cooking/core/chat/quick-prompts";
import { StyleSheet, useWindowDimensions } from "react-native";

import { InkTag, TagRow } from "@/shared/ui/ink-tag";

type QuickPromptsProps = {
  prompts: readonly QuickPrompt[];
  selectedId: string | undefined;
  disabled: boolean;
  onToggle: (prompt: QuickPrompt) => void;
};

const stackedFontScale = 1.2;

export function QuickPrompts({ prompts, selectedId, disabled, onToggle }: QuickPromptsProps) {
  const { fontScale } = useWindowDimensions();

  return (
    <TagRow
      accessibilityLabel="Швидкі запити"
      style={fontScale >= stackedFontScale && styles.stacked}
    >
      {prompts.map((prompt) => (
        <InkTag
          key={prompt.id}
          label={prompt.label}
          icon={prompt.icon}
          selected={prompt.id === selectedId}
          disabled={disabled}
          haptic="selection"
          onPress={() => onToggle(prompt)}
        />
      ))}
    </TagRow>
  );
}

const styles = StyleSheet.create({
  stacked: { flexDirection: "column", alignItems: "flex-start" },
});
