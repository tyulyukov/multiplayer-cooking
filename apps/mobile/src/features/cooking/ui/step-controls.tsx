import type { getCookingStepState } from "@multiplayer-cooking/core/cooking/cooking-step-state";
import type { PlanStep, RuntimeStep } from "@multiplayer-cooking/core/cooking/types";
import { colors } from "@multiplayer-cooking/theme";
import { Alert, StyleSheet, View } from "react-native";

import { haptics } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { TagRow, InkTag } from "@/shared/ui/ink-tag";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";

type StepControlsProps = {
  step: PlanStep;
  runtime?: RuntimeStep;
  state: ReturnType<typeof getCookingStepState>;
  primary: boolean;
  confirmed: boolean;
  onAdvance: () => void;
};

// Every button, label and disabled rule of the web StepControls.
export function StepControls({
  step,
  runtime,
  state,
  primary,
  confirmed,
  onAdvance,
}: StepControlsProps) {
  const { read, actions, pendingScope } = useRoomData();
  const { active, waiting, canAct, recipient, sender, canInteract, canComplete, checked } = state;
  const { timerPending, blockers, done } = state;
  const variant = primary ? "lime" : "ghost";
  const needsConfirmation = Boolean(step.confirmation && !confirmed);

  const complete = (skipChecklist = false) => {
    actions.complete(step.id, confirmed, skipChecklist);
    onAdvance();
  };

  const askSkip = () => {
    haptics.warning();
    Alert.alert(
      "Пропустити пункти?",
      "Непозначені пункти залишаться без позначки. Перевір, чи крок справді можна завершити.",
      [
        { text: "Повернутися", style: "cancel" },
        { text: "Пропустити пункти", onPress: () => complete(true) },
      ],
    );
  };

  const completeLabel = timerPending
    ? "Дочекайся таймера"
    : recipient
      ? "Отримав, далі"
      : "Готово, далі";

  return (
    <View style={styles.controls}>
      {runtime?.status === "pending" && step.kind === "together" && canAct ? (
        <Button
          variant={variant}
          label="Я готовий"
          disabled={actions.busy || blockers.length > 0 || Boolean(recipient && !sender)}
          onPress={() => actions.start(step.id)}
        />
      ) : null}
      {waiting && step.kind === "together" && canAct ? (
        <Button
          variant={variant}
          label="Я готовий"
          disabled={actions.busy || runtime?.readyMemberIds.includes(read.me._id)}
          onPress={() => actions.ready(step.id)}
        />
      ) : null}
      {(active || runtime?.status === "pending") && sender && canAct ? (
        <Button
          variant={variant}
          label="Передаю, забирай"
          disabled={!canInteract}
          onPress={() => actions.ready(step.id)}
        />
      ) : null}
      {canComplete && canAct ? (
        <Button
          variant={variant}
          label={completeLabel}
          busy={actions.busy && pendingScope === step.id}
          busyLabel="Зберігаємо…"
          disabled={actions.busy || needsConfirmation || timerPending}
          haptic={primary ? "commit" : undefined}
          onPress={() => (checked ? complete() : askSkip())}
        />
      ) : null}
      {canComplete && canAct && needsConfirmation && !timerPending ? (
        <Text variant="meta" color={colors.mutedForeground}>
          Відміть останній пункт, щоб продовжити.
        </Text>
      ) : null}
      <View style={styles.secondary}>
        {active && canAct && step.canWait && step.kind === "task" ? (
          <Button
            variant="ghost"
            compact
            label="Поки готується, до іншого кроку"
            disabled={actions.busy}
            onPress={() => {
              actions.wait(step.id);
              onAdvance();
            }}
          />
        ) : null}
        {waiting && step.kind === "task" && canAct ? (
          <Button
            variant="ghost"
            compact
            label="Повернутися до кроку"
            disabled={actions.busy}
            onPress={() => actions.start(step.id)}
          />
        ) : null}
        {done &&
        actions.online &&
        read.room.state === "cooking" &&
        (runtime?.completedBy === read.me._id || read.me.role === "host") ? (
          <Button
            variant="text"
            label="Скасувати завершення"
            disabled={actions.busy}
            onPress={() => actions.undo(step.id)}
          />
        ) : null}
        <Button
          variant="ghost"
          compact
          label="Є питання?"
          onPress={() => actions.ask(undefined, step.id)}
        />
      </View>
      {step.choices?.length ? (
        <TagRow>
          {step.choices.map((choice) => (
            <InkTag
              key={choice.id}
              label={choice.label}
              onPress={() => actions.ask(choice.prompt, step.id)}
            />
          ))}
        </TagRow>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 10 },
  secondary: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
