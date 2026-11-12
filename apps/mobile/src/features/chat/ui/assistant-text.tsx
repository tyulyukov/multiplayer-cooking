import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import {
  markdownBlocks,
  splitBufferedText,
} from "@multiplayer-cooking/core/chat/split-buffered-text";
import { entering } from "@/shared/lib/motion";
import { Markdown } from "@/shared/ui/markdown";

const revealIntervalMs = 400;

const freshMessageMs = 3000;

type AssistantTextProps = { text: string; streaming: boolean; createdAt: number };

// While streaming, only finished blocks render, at most one update per 400ms; each new block
// fades in. On success the full text renders. Blocks already on screen keep their keys.
export function AssistantText({ text, streaming, createdAt }: AssistantTextProps) {
  const target = streaming ? splitBufferedText(text).ready : text;
  const [revealed, setRevealed] = useState(target);
  const lastRevealAt = useRef(0);
  const shown = streaming ? revealed : text;

  const [settledOffsets] = useState(() =>
    Date.now() - createdAt < freshMessageMs
      ? new Set<number>()
      : new Set(markdownBlocks(target).map((block) => block.offset)),
  );

  useEffect(() => {
    if (!streaming || target === revealed) return;

    const wait = Math.max(0, lastRevealAt.current + revealIntervalMs - Date.now());

    const timer = setTimeout(() => {
      lastRevealAt.current = Date.now();
      setRevealed(target);
    }, wait);

    return () => clearTimeout(timer);
  }, [streaming, target, revealed]);

  return (
    <View style={styles.blocks}>
      {markdownBlocks(shown).map((block) => (
        <Animated.View
          key={block.offset}
          entering={settledOffsets.has(block.offset) ? undefined : entering.morph}
        >
          <Markdown text={block.text} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ blocks: { gap: 10 } });
