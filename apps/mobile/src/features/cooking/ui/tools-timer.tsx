import { Picker } from "@expo/ui/community/picker";
import { colors } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { Text } from "@/shared/ui/text";

import { useRoomData } from "../model/room-context";
import { ToolsField } from "./tools-field";
import { SelectMenu } from "./tools-select";

const maxMinutes = 10_080;

const hourValues = Array.from({ length: maxMinutes / 60 + 1 }, (_, index) => String(index));

const minuteValues = Array.from({ length: 60 }, (_, index) => String(index));

export function ToolsTimer() {
  const { read, actions } = useRoomData();
  const [stepKey, setStepKey] = useState("");
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const plan = read.room.plan;

  const allowed = read.steps.filter(
    (step) =>
      step.startedAt &&
      step.status !== "done" &&
      (read.me.role === "host" || step.slots.some((slot) => read.me.slots.includes(slot))),
  );

  const selected = allowed.some((step) => step.stepKey === stepKey) ? stepKey : allowed[0]?.stepKey;

  const total = hours * 60 + minutes;
  const valid = total > 0 && total <= maxMinutes;
  const titleOf = (key: string) => plan?.steps.find((step) => step.id === key)?.title ?? key;

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Новий таймер" />
      {selected ? (
        <View style={styles.form}>
          <SelectMenu
            label="Для якого кроку"
            value={selected}
            options={allowed.map((step) => ({ value: step.stepKey, label: titleOf(step.stepKey) }))}
            onChange={setStepKey}
          />
          <ToolsField
            label="Назва"
            value={label}
            onChangeText={setLabel}
            maxLength={140}
            placeholder="Наприклад, перевірити тісто"
            returnKeyType="done"
          />
          <View style={styles.duration}>
            <Text variant="label" color={colors.mutedForeground}>
              Тривалість
            </Text>
            <View style={styles.wheels}>
              <Wheel
                values={hourValues}
                value={hours}
                unit="год"
                onChange={(next) => setHours(next)}
              />
              <Wheel
                values={minuteValues}
                value={minutes}
                unit="хв"
                onChange={(next) => setMinutes(next)}
              />
            </View>
          </View>
          <Button
            variant="lime"
            label="Додати таймер"
            disabled={!actions.online || actions.busy || !valid || !label.trim()}
            onPress={() => {
              actions.createTimer(selected, label.trim(), total * 60);
              router.back();
            }}
          />
        </View>
      ) : (
        <EmptyState
          illustration="kitchen-timer"
          size={96}
          message="Спочатку почни крок, для якого потрібен таймер."
          style={styles.empty}
        />
      )}
    </View>
  );
}

type WheelProps = {
  values: readonly string[];
  value: number;
  unit: string;
  onChange: (value: number) => void;
};

function Wheel({ values, value, unit, onChange }: WheelProps) {
  return (
    <View style={styles.wheel}>
      <Picker
        selectedValue={String(value)}
        onValueChange={(next) => onChange(Number(next))}
        style={styles.wheel}
      >
        {values.map((item) => (
          <Picker.Item key={item} label={`${item} ${unit}`} value={item} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 16 },
  form: { gap: 16, paddingHorizontal: 16 },
  duration: { gap: 6 },
  wheels: { flexDirection: "row", gap: 8 },
  wheel: { flex: 1, overflow: "hidden" },
  picker: { alignSelf: "stretch" },
  empty: { paddingBottom: 24 },
});
