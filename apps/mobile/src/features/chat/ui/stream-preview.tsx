import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "@/shared/ui/button";

import { AssistantText } from "./assistant-text";

const sample = `Шукаю щось легке й швидке, щоб вечеря була за **30 хвилин**.

Пропоную домашню шавуху з куркою:

- курка в маринаді з паприкою
- часниковий соус на йогурті
- свіжі огірки й маринована цибуля

Почни з маринаду, поки гріється пательня. Лаваш підсуш наприкінці, щоб він не розмок.`;

const chunk = 6;

const tickMs = 60;

// Dev-only: replays a reply in small chunks so the paragraph reveal can be checked without the AI.
export function StreamPreview() {
  const [length, setLength] = useState(sample.length);
  const [startedAt, setStartedAt] = useState(0);
  const streaming = length < sample.length;

  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setLength(Math.min(sample.length, length + chunk)), tickMs);

    return () => clearTimeout(timer);
  }, [length, streaming]);

  return (
    <View>
      <Button
        variant="ghost"
        compact
        label={streaming ? "Стрімимо…" : "Запустити стрім"}
        disabled={streaming}
        onPress={() => {
          setStartedAt(Date.now());
          setLength(0);
        }}
      />
      <AssistantText
        key={startedAt}
        text={sample.slice(0, length)}
        streaming={streaming}
        createdAt={startedAt}
      />
    </View>
  );
}
