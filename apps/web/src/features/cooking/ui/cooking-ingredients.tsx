import type { FC } from "react";
import cookingStyles from "./cooking-drawers.module.scss";
import type { CookingActions, CookingRoomData } from "../model/types";

type Props = {
  data: CookingRoomData;
  actions: Pick<CookingActions, "online" | "busy" | "toggleIngredient">;
};

export const CookingIngredients: FC<Props> = ({ data, actions }) => {
  return (
    <div className={cookingStyles["cooking-tool-panel"]}>
      {data.room.plan?.ingredients.map((ingredient) => (
        <label key={ingredient.id}>
          <input
            type="checkbox"
            checked={data.room.checkedIngredientIds.includes(ingredient.id)}
            disabled={!actions.online || actions.busy || data.room.state === "done"}
            onChange={(event) => actions.toggleIngredient(ingredient.id, event.target.checked)}
          />
          <span>
            {ingredient.name} · <strong>{ingredient.amount}</strong>
          </span>
        </label>
      )) ?? <p>Інгредієнти з’являться разом із планом.</p>}
    </div>
  );
};
