import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { Question, QuestionInput } from "@multiplayer-cooking/core/chat/question";
import type { QuestionResponse } from "@multiplayer-cooking/core/chat/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";

import { fonts } from "@/shared/fonts";
import { haptics } from "@/shared/lib/haptics";
import { layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { Text } from "@/shared/ui/text";

type Choice = { optionIds: readonly string[]; custom: string };

type QuestionCardProps = {
  input: QuestionInput;
  pending: boolean;
  onSubmit: (answer: QuestionResponse) => void;
  onDismiss: () => void;
};

const autoAdvanceMs = 200;

const emptyChoice: Choice = { optionIds: [], custom: "" };

const answered = (choice: Choice) => choice.optionIds.length > 0 || Boolean(choice.custom.trim());

export function QuestionCard({ input, pending, onSubmit, onDismiss }: QuestionCardProps) {
  const { questions } = input;
  const [index, setIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [invalid, setInvalid] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = questions[index];

  const cancelAdvance = () => {
    if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  useEffect(() => cancelAdvance, []);

  if (!question) return null;

  const last = index === questions.length - 1;
  const choiceOf = (id: string) => choices[id] ?? emptyChoice;

  const submit = (next: Record<string, Choice>) => {
    cancelAdvance();

    if (pending) return;

    const missing = questions.findIndex((item) => !answered(next[item.id] ?? emptyChoice));

    if (missing !== -1) {
      setIndex(missing);
      setInvalid(questions[missing]?.id ?? null);

      return;
    }

    haptics.send();
    onSubmit({
      answers: questions.map((item) => {
        const choice = next[item.id] ?? emptyChoice;

        return {
          questionId: item.id,
          optionIds: [...choice.optionIds],
          custom: choice.custom.trim() || undefined,
        };
      }),
    });
  };

  const goNext = (next: Record<string, Choice>) => {
    cancelAdvance();

    if (!answered(next[question.id] ?? emptyChoice)) {
      setInvalid(question.id);

      return;
    }

    setInvalid(null);

    if (last) submit(next);
    else setIndex(index + 1);
  };

  const toggle = (optionId: string) => {
    const current = choiceOf(question.id);

    const optionIds = question.allowMultiple
      ? current.optionIds.includes(optionId)
        ? current.optionIds.filter((id) => id !== optionId)
        : [...current.optionIds, optionId]
      : [optionId];

    const next = { ...choices, [question.id]: { ...current, optionIds } };

    setChoices(next);
    setInvalid(null);

    if (!question.allowMultiple) {
      cancelAdvance();
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        goNext(next);
      }, autoAdvanceMs);
    }
  };

  const changeCustom = (custom: string) => {
    cancelAdvance();
    setInvalid(null);
    setChoices({ ...choices, [question.id]: { ...choiceOf(question.id), custom } });
  };

  return (
    <Card active style={styles.card} accessibilityLabel="Уточнення до страви">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Розгорнути питання" : "Згорнути питання"}
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => {
          cancelAdvance();
          setCollapsed(!collapsed);
        }}
        style={styles.header}
      >
        <Text variant="label" color={colors.tealDeep} numberOfLines={1} style={styles.eyebrow}>
          {collapsed ? question.question : "Уточнення до страви"}
        </Text>
        <Text variant="label" color={colors.mutedForeground} style={styles.counter}>
          {index + 1} / {questions.length}
        </Text>
        <DisclosureChevron open={!collapsed} color={colors.mutedForeground} />
      </Pressable>
      <Collapsible open={!collapsed}>
        <QuestionPage
          key={question.id}
          question={question}
          choice={choiceOf(question.id)}
          invalid={invalid === question.id}
          pending={pending}
          onToggle={toggle}
          onCustomFocus={cancelAdvance}
          onCustomChange={changeCustom}
        />
      </Collapsible>
      <Animated.View layout={layout.disclosure} style={styles.actions}>
        <Button
          variant="text"
          compact
          label="Написати повідомлення"
          onPress={onDismiss}
          style={styles.dismiss}
        />
        {index > 0 ? (
          <Button
            variant="text"
            compact
            label="Назад"
            disabled={pending}
            onPress={() => {
              cancelAdvance();
              setInvalid(null);
              setIndex(index - 1);
            }}
          />
        ) : null}
        <Button
          variant="ghost"
          compact
          label={last ? "Надіслати" : "Далі"}
          busy={pending && last}
          busyLabel="Надсилаємо…"
          disabled={pending}
          onPress={() => {
            setCollapsed(false);
            goNext(choices);
          }}
        />
      </Animated.View>
    </Card>
  );
}

type QuestionPageProps = {
  question: Question;
  choice: Choice;
  invalid: boolean;
  pending: boolean;
  onToggle: (optionId: string) => void;
  onCustomFocus: () => void;
  onCustomChange: (value: string) => void;
};

function QuestionPage({
  question,
  choice,
  invalid,
  pending,
  onToggle,
  onCustomFocus,
  onCustomChange,
}: QuestionPageProps) {
  return (
    <View style={styles.page}>
      <View style={styles.titleBlock}>
        <Text style={styles.question}>{question.question}</Text>
        <Text variant="meta" color={colors.mutedForeground}>
          {question.allowMultiple ? "Обери всі варіанти, які підходять" : "Обери один варіант"}
        </Text>
      </View>
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const selected = choice.optionIds.includes(option.id);

          return (
            <Pressable
              key={option.id}
              accessibilityRole={question.allowMultiple ? "checkbox" : "radio"}
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, disabled: pending }}
              disabled={pending}
              onPress={() => {
                haptics.selection();
                onToggle(option.id);
              }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !selected && styles.optionPressed,
                pending && styles.optionDisabled,
              ]}
            >
              <View style={styles.marker}>
                {selected ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={16}
                    color={colors.primary}
                    strokeWidth={2}
                  />
                ) : (
                  <Text variant="tag" color={colors.tealDeep}>
                    {optionIndex + 1}
                  </Text>
                )}
              </View>
              <Text
                variant="tag"
                color={selected ? colors.card : colors.foreground}
                style={styles.optionLabel}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {question.allowCustom ? (
        <TextInput
          value={choice.custom}
          onChangeText={onCustomChange}
          onFocus={onCustomFocus}
          editable={!pending}
          maxLength={200}
          placeholder="Або напиши свій варіант"
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.tealDeep}
          maxFontSizeMultiplier={2}
          accessibilityLabel={`Свій варіант: ${question.question}`}
          style={styles.custom}
        />
      ) : null}
      {invalid ? (
        <Text variant="meta" color={colors.destructive} accessibilityRole="alert">
          {question.allowCustom
            ? "Обери варіант або напиши свою відповідь."
            : "Обери варіант відповіді."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, paddingTop: 4, paddingBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  eyebrow: { flex: 1 },
  counter: { fontVariant: ["tabular-nums"] },
  page: { gap: 12, paddingBottom: 4 },
  titleBlock: { gap: 4 },
  question: { fontFamily: fonts.sansSemiBold },
  options: { gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  optionSelected: { backgroundColor: colors.foreground },
  optionPressed: { backgroundColor: colors.muted },
  optionDisabled: { opacity: 0.4 },
  marker: { width: 18, alignItems: "center" },
  optionLabel: { flex: 1 },
  custom: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.button,
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
    backgroundColor: colors.card,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  dismiss: { marginRight: "auto", marginLeft: -12 },
});
