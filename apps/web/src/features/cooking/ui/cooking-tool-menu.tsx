import type { FC } from "react";
import { Button } from "@/shared/ui/button";
import cookingStyles from "./cooking-drawers.module.scss";

export type CookingTool = "ingredients" | "convert" | "timer" | "servings";

type Props = {
  setTool: (tool: CookingTool) => void;
  servings: number;
  ask: (prompt?: string) => void;
  onManagePeople: () => void;
  sound: boolean;
  onSound: () => void;
};

export const CookingToolMenu: FC<Props> = ({
  setTool,
  servings,
  ask,
  onManagePeople,
  sound,
  onSound,
}) => (
  <div className={cookingStyles["cooking-tool-menu"]}>
    <Button variant="outline" size="xl" onClick={() => setTool("ingredients")}>
      Інгредієнти
    </Button>
    <Button variant="outline" size="xl" onClick={() => setTool("timer")}>
      Додати таймер
    </Button>
    <Button variant="outline" size="xl" onClick={() => setTool("convert")}>
      Перевести одиниці
    </Button>
    <Button variant="outline" size="xl" onClick={() => setTool("servings")}>
      {servings} порцій
    </Button>
    <Button variant="outline" size="xl" onClick={() => ask()}>
      Відкрити помічника
    </Button>
    <Button variant="outline" size="xl" onClick={onManagePeople}>
      Кухарі та запрошення
    </Button>
    <Button variant="outline" size="xl" aria-pressed={sound} onClick={onSound}>
      {sound ? "Вимкнути звук таймерів" : "Увімкнути звук таймерів"}
    </Button>
    <p>Звук працює, поки застосунок відкритий.</p>
  </div>
);
