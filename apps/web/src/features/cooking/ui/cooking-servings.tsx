import type { FC } from "react";
import cookingStyles from "./cooking-drawers.module.scss";
import type { CookingActions, CookingRoomData } from "../model/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type Props = {
  data: CookingRoomData;
  actions: Pick<CookingActions, "online" | "busy">;
  servings: string;
  setServings: (value: string) => void;
  ask: (prompt?: string) => void;
};

export const CookingServings: FC<Props> = ({ data, actions, servings, setServings, ask }) => {
  return (
    <div className={cookingStyles["cooking-tool-panel"]}>
      <label htmlFor="cooking-servings">Нова кількість порцій</label>
      <Input
        id="cooking-servings"
        type="number"
        min={1}
        max={24}
        value={servings}
        onChange={(event) => setServings(event.target.value)}
      />
      <p>
        Помічник запропонує зміни з урахуванням уже виконаної роботи. Переглянь їх перед
        підтвердженням.
      </p>
      <Button
        size="xl"
        disabled={
          !actions.online ||
          actions.busy ||
          data.room.state === "done" ||
          !Number.isInteger(Number(servings)) ||
          Number(servings) < 1 ||
          Number(servings) > 24
        }
        onClick={() =>
          ask(`Запропонуй зміну на ${servings} порцій. Урахуй уже використані продукти.`)
        }
      >
        Переглянути зміну порцій
      </Button>
    </div>
  );
};
