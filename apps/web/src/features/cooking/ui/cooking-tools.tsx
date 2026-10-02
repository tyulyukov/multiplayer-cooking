import { CookingToolMenu, type CookingTool } from "./cooking-tool-menu";
import { CookingServings } from "./cooking-servings";
import { CookingManualTimer } from "./cooking-manual-timer";
import { CookingConverter } from "./cooking-converter";
import { CookingIngredients } from "./cooking-ingredients";
import type { FC } from "react";
import cookingStyles from "@/features/cooking/ui/cooking-drawers.module.scss";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import type { cookingUnits } from "../lib/cooking-units";
import type { CookingActions, CookingRoomData } from "@/features/cooking/model/types";

type CookingToolsProps = {
  data: CookingRoomData;
  actions: CookingActions;
  sound: boolean;
  onSound: () => void;
};

export const CookingTools: FC<CookingToolsProps> = ({ data, actions, sound, onSound }) => {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<CookingTool | null>(null);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<keyof typeof cookingUnits>("g");
  const [to, setTo] = useState<keyof typeof cookingUnits>("oz");
  const [minutes, setMinutes] = useState("5");
  const [label, setLabel] = useState("");
  const [stepKey, setStepKey] = useState("");
  const [servings, setServings] = useState(String(data.room.requestedServings));

  const ask = (prompt?: string) => {
    setOpen(false);
    actions.ask(prompt);
  };

  return (
    <Drawer autoFocus open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="chip">
          Інструменти
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className={cookingStyles["cooking-drawer"]}
        onCloseAutoFocus={(event) => {
          if (document.querySelector('[role="dialog"][data-state="open"]')) event.preventDefault();
        }}
      >
        <DrawerHeader>
          <DrawerTitle>
            {tool === "ingredients"
              ? "Інгредієнти"
              : tool === "convert"
                ? "Конвертер"
                : tool === "timer"
                  ? "Новий таймер"
                  : tool === "servings"
                    ? "Порції"
                    : "Під рукою"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Інструменти для спільного готування
          </DrawerDescription>
        </DrawerHeader>
        <div className={cookingStyles["cooking-drawer-body"]}>
          {tool && (
            <Button variant="ghost" size="chip" onClick={() => setTool(null)}>
              До інструментів
            </Button>
          )}
          {!tool && (
            <CookingToolMenu
              setTool={setTool}
              servings={data.room.requestedServings}
              ask={ask}
              onManagePeople={() => {
                setOpen(false);
                actions.managePeople();
              }}
              sound={sound}
              onSound={onSound}
            />
          )}
          {tool === "ingredients" && <CookingIngredients data={data} actions={actions} />}
          {tool === "convert" && (
            <CookingConverter
              amount={amount}
              setAmount={setAmount}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
            />
          )}
          {tool === "timer" && (
            <CookingManualTimer
              data={data}
              actions={actions}
              stepKey={stepKey}
              setStepKey={setStepKey}
              label={label}
              setLabel={setLabel}
              minutes={minutes}
              setMinutes={setMinutes}
              onClose={() => setOpen(false)}
            />
          )}
          {tool === "servings" && (
            <CookingServings
              data={data}
              actions={actions}
              servings={servings}
              setServings={setServings}
              ask={ask}
            />
          )}
          <Button variant="ghost" size="chip" onClick={() => setOpen(false)}>
            Закрити
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
