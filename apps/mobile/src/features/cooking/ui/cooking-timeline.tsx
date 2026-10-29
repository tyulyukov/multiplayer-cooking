import { Host, ProgressView } from "@expo/ui/swift-ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { colors } from "@multiplayer-cooking/theme";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";

import { layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Text } from "@/shared/ui/text";

import type { sessionView } from "../lib/session-view";
import { useRoomData } from "../model/room-context";
import { StepCard } from "./step-card";

type TimelineProps = {
  view: ReturnType<typeof sessionView>;
  expanded: string | undefined;
  onExpand: (stepKey: string) => void;
  onAdvance: () => void;
  onStepLayout: (stepKey: string, event: LayoutChangeEvent) => void;
};

export function CookingTimeline({
  view,
  expanded,
  onExpand,
  onAdvance,
  onStepLayout,
}: TimelineProps) {
  const { read, actions, error } = useRoomData();
  const { plan, runtimes, current, allDone, completed, orderedTimers, isMine } = view;

  if (!plan) return null;
  const total = plan.steps.length;

  return (
    <View style={styles.timeline}>
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Спільний прогрес"
        accessibilityValue={{
          min: 0,
          max: total,
          now: completed,
          text: `${completed} з ${total} кроків`,
        }}
      >
        <Text variant="secondary">
          {completed} з {total} кроків
        </Text>
        <Host matchContents={{ vertical: true }} style={styles.bar}>
          <ProgressView value={total ? completed / total : 0} modifiers={[tint(colors.teal)]} />
        </Host>
      </View>
      {error && error.scope !== expanded ? <InlineAlert message={error.message} /> : null}
      {plan.steps.map((step, index) => (
        <StepCard
          key={step.id}
          step={step}
          runtime={runtimes.get(step.id)}
          timers={orderedTimers.filter((timer) => timer.stepKey === step.id)}
          index={index + 1}
          expanded={expanded === step.id}
          primary={current?.id === step.id && read.room.state === "cooking"}
          isMine={isMine}
          onExpand={() => onExpand(step.id)}
          onAdvance={onAdvance}
          onLayout={(event) => onStepLayout(step.id, event)}
        />
      ))}
      {read.room.state === "cooking" && allDone ? (
        <Animated.View layout={layout.morph} style={styles.finish}>
          <Text variant="title">Усі кроки виконано</Text>
          <Button
            variant="lime"
            label="Завершити сесію"
            busy={actions.busy}
            busyLabel="Завершуємо…"
            disabled={!actions.online}
            haptic="commit"
            onPress={actions.finish}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: 12 },
  progress: { gap: 8, paddingBottom: 4 },
  bar: { alignSelf: "stretch" },
  finish: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
});
