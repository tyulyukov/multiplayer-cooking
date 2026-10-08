import { getCookingStepState } from "@multiplayer-cooking/core/cooking/cooking-step-state";
import type { PlanStep, RoomTimer, RuntimeStep } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { Fragment, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";

import { entering, exiting, layout } from "@/shared/lib/motion";
import { DisclosureChevron } from "@/shared/ui/collapsible";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Markdown } from "@/shared/ui/markdown";
import { NumberTile } from "@/shared/ui/number-tile";
import { Text } from "@/shared/ui/text";

import { convertTemperature, isLiveTimer } from "../lib/session-view";
import { useRoomData } from "../model/room-context";
import { CheckRow } from "./check-row";
import { CookingReference } from "./cooking-reference";
import { StepControls } from "./step-controls";
import { StepTimer } from "./step-timer";

type StepCardProps = {
  step: PlanStep;
  runtime?: RuntimeStep;
  timers: RoomTimer[];
  index: number;
  expanded: boolean;
  primary: boolean;
  isMine: (timer: RoomTimer) => boolean;
  onExpand: () => void;
  onAdvance: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export function StepCard({
  step,
  runtime,
  timers,
  index,
  expanded,
  primary,
  isMine,
  onExpand,
  onAdvance,
  onLayout,
}: StepCardProps) {
  const { read, actions, error } = useRoomData();
  const state = getCookingStepState({ step, runtime, data: read, timers, actions });
  const { done, active, waiting, people, blockers, title, canInteract } = state;
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationDone, setConfirmationDone] = useState(done);

  if (confirmationDone !== done) {
    setConfirmationDone(done);
    setConfirmed(false);
  }

  const owner = `${title}${done ? " · Виконано" : active ? " · Готує" : waiting ? " · Очікує" : ""}`;

  const anchorOf = (timer: RoomTimer) =>
    step.timers.find((item) => item.id === timer.timerKey)?.afterChecklistItemId;

  const timerView = (timer: RoomTimer) => (
    <StepTimer
      key={timer._id}
      timer={timer}
      mine={isMine(timer)}
      disabled={!canInteract}
      controls
    />
  );

  return (
    <Animated.View
      layout={layout.morph}
      onLayout={onLayout}
      style={[styles.card, expanded && styles.expanded, done && !expanded && styles.done]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Крок ${index}. ${step.title}. ${owner}`}
        onPress={onExpand}
        style={styles.header}
      >
        <NumberTile value={index} done={done} />
        <View style={styles.heading}>
          <Text variant="label" color={colors.tealDeep} numberOfLines={2}>
            {owner}
          </Text>
          <Text variant="title" style={done && styles.struck}>
            {step.title}
          </Text>
        </View>
        <DisclosureChevron open={expanded} />
      </Pressable>
      {expanded ? (
        <Animated.View entering={entering.fadeIn} exiting={exiting.fadeOut} style={styles.body}>
          {blockers.length > 0 ? (
            <Text variant="secondary" color={colors.accentDeep}>
              Чекаємо: {blockers.join(", ")}
            </Text>
          ) : null}
          <Markdown text={step.body} noImages />
          {step.temperature ? (
            <Text variant="secondary">
              {step.temperature.label}: {step.temperature.value} °{step.temperature.unit} ·{" "}
              {convertTemperature(step.temperature.value, step.temperature.unit)} °
              {step.temperature.unit === "C" ? "F" : "C"}
            </Text>
          ) : null}
          <View style={styles.checklist}>
            {step.checklist.map((item) => (
              <Fragment key={item.id}>
                <CheckRow
                  label={item.label}
                  checked={runtime?.checkedIds.includes(item.id) ?? false}
                  disabled={!canInteract}
                  onChange={(checked) => actions.toggleChecklist(step.id, item.id, checked)}
                />
                {timers.filter((timer) => anchorOf(timer) === item.id).map(timerView)}
              </Fragment>
            ))}
            {timers.filter((timer) => !anchorOf(timer)).map(timerView)}
            {step.confirmation && !done ? (
              <CheckRow
                label={step.confirmation}
                checked={confirmed}
                disabled={!canInteract}
                onChange={setConfirmed}
              />
            ) : null}
          </View>
          {step.reference ? (
            <CookingReference
              key={`${step.id}:${runtime?.imageUrl ?? "pending"}`}
              imageUrl={runtime?.imageUrl}
              status={runtime?.imageStatus}
              alt={step.reference.alt}
              disabled={!actions.online || actions.busy}
              onRetry={() => actions.requestReference(step.id)}
            />
          ) : null}
          {waiting && step.kind === "together" ? (
            <Text variant="meta" color={colors.mutedForeground} accessibilityLiveRegion="polite">
              Готові:{" "}
              {people
                .filter((member) => runtime?.readyMemberIds.includes(member._id))
                .map((member) => member.name)
                .join(", ") || "ще ніхто"}
              . Потрібні всі призначені кухарі.
            </Text>
          ) : null}
          <StepControls
            step={step}
            runtime={runtime}
            state={state}
            primary={primary}
            confirmed={confirmed}
            onAdvance={onAdvance}
          />
          {error?.scope === step.id ? <InlineAlert message={error.message} /> : null}
        </Animated.View>
      ) : (
        timers
          .filter((timer) => isLiveTimer(timer))
          .map((timer) => (
            <View key={timer._id} style={styles.collapsedTimer}>
              <StepTimer timer={timer} mine={isMine(timer)} disabled controls={false} />
            </View>
          ))
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  expanded: { borderColor: colors.foreground },
  done: { opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  heading: { flex: 1, gap: 2 },
  struck: { textDecorationLine: "line-through" },
  body: { gap: 12, paddingTop: 12 },
  checklist: { gap: 4 },
  collapsedTimer: { paddingTop: 10 },
});
