import type { CookingRoomData, HelperProposal } from "@multiplayer-cooking/core/cooking/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { Markdown } from "@/shared/ui/markdown";
import { Text } from "@/shared/ui/text";

type Plan = NonNullable<CookingRoomData["room"]["plan"]>;

const receipts = {
  approved: "Зміни вже бачать усі кухарі.",
  rejected: "Залишили рецепт без змін.",
  stale: "Ви вже просунулися далі. Попроси оновити цю пропозицію.",
} as const;

type HelperProposalCardProps = {
  proposal: HelperProposal;
  currentPlan: Plan;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function HelperProposalCard({
  proposal,
  currentPlan,
  disabled,
  onApprove,
  onReject,
}: HelperProposalCardProps) {
  const [open, setOpen] = useState(false);
  const next = proposal.plan;

  const removedSteps = currentPlan.steps.filter(
    (step) => !next.steps.some((item) => item.id === step.id),
  );

  const changedIngredients = next.ingredients.filter((item) => {
    const current = currentPlan.ingredients.find((candidate) => candidate.id === item.id);

    return !current || current.name !== item.name || current.amount !== item.amount;
  });

  const removedIngredients = currentPlan.ingredients.filter(
    (item) => !next.ingredients.some((candidate) => candidate.id === item.id),
  );

  const affected = next.steps.filter((step) => proposal.affectedStepKeys.includes(step.id));

  return (
    <View accessibilityLabel="Зміни до рецепта" style={styles.card}>
      <Text variant="label" color={colors.tealDeep}>
        {proposal.status === "approved" ? "Рецепт оновлено" : "Пропоную змінити рецепт"}
      </Text>
      <View style={styles.markdown}>
        <Markdown text={proposal.preview} noImages />
      </View>
      {proposal.status === "open" ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Що зміниться"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(!open)}
            style={styles.disclosure}
          >
            <Text variant="secondary">Що зміниться</Text>
            <DisclosureChevron open={open} />
          </Pressable>
          <Collapsible open={open}>
            <View style={styles.details}>
              {next.servings === currentPlan.servings ? null : (
                <Text variant="secondary">Порцій буде: {next.servings}</Text>
              )}
              {removedIngredients.length > 0 ? (
                <Text>Приберемо: {removedIngredients.map((item) => item.name).join(", ")}.</Text>
              ) : null}
              {changedIngredients.map((item) => (
                <Text key={item.id}>
                  • {item.name}: {item.amount}
                </Text>
              ))}
              {removedSteps.length > 0 ? (
                <Text>Пропустимо: {removedSteps.map((step) => step.title).join(", ")}.</Text>
              ) : null}
              {affected.map((step) => (
                <View key={step.id} style={styles.step}>
                  <Text variant="step">{step.title}</Text>
                  <Markdown text={step.body} noImages />
                </View>
              ))}
            </View>
          </Collapsible>
          <Animated.View layout={layout.disclosure} style={styles.actions}>
            <Button
              variant="lime"
              label="Застосувати зміни"
              haptic="commit"
              disabled={disabled}
              onPress={onApprove}
            />
            <Button variant="text" label="Залишити як є" disabled={disabled} onPress={onReject} />
          </Animated.View>
        </>
      ) : (
        <Text variant="meta" color={colors.mutedForeground}>
          {receipts[proposal.status]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  markdown: { marginBottom: -10 },
  disclosure: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  details: { gap: 8, paddingBottom: 4 },
  step: { gap: 4, paddingTop: 4 },
  actions: { gap: 4 },
});
