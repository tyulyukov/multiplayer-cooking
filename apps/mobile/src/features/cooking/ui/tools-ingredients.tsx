import { ScrollView, StyleSheet, View } from "react-native";

import { EmptyState } from "@/shared/ui/empty-state";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SheetHeader } from "@/shared/ui/sheet-header";

import { useRoomData } from "../model/room-context";
import { CheckRow } from "./check-row";

export function ToolsIngredients() {
  const { read, actions, error } = useRoomData();
  const ingredients = read.room.plan?.ingredients;
  const disabled = !actions.online || actions.busy || read.room.state === "done";

  return (
    <>
      <SheetHeader title="Інгредієнти" />
      <ScrollView contentContainerStyle={styles.content}>
        {error && !error.scope ? <InlineAlert message={error.message} /> : null}
        {ingredients ? (
          <View accessibilityLabel="Інгредієнти">
            {ingredients.map((ingredient) => (
              <CheckRow
                key={ingredient.id}
                label={`${ingredient.name} · ${ingredient.amount}`}
                checked={read.room.checkedIngredientIds.includes(ingredient.id)}
                disabled={disabled}
                onChange={(checked) => actions.toggleIngredient(ingredient.id, checked)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            illustration="ingredients-basket"
            size={80}
            message="Інгредієнти з’являться разом із планом."
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 48 },
});
