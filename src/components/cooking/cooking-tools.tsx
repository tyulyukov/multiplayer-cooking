import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  convertCookingQuantity,
  cookingUnits,
  isCookingUnit,
  parseCookingQuantity,
} from "@/lib/cooking-units";
import type { CookingActions, CookingRoomData } from "./cooking-session";

export function CookingTools({
  data,
  actions,
  sound,
  onSound,
}: {
  data: CookingRoomData;
  actions: CookingActions;
  sound: boolean;
  onSound: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<"ingredients" | "convert" | "timer" | "servings" | null>(null);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<keyof typeof cookingUnits>("g");
  const [to, setTo] = useState<keyof typeof cookingUnits>("oz");
  const [minutes, setMinutes] = useState("5");
  const [label, setLabel] = useState("");
  const [stepKey, setStepKey] = useState("");
  const [servings, setServings] = useState(String(data.room.requestedServings));
  let result: number | null = null;
  try {
    const value = parseCookingQuantity(amount);
    if (value !== null) result = convertCookingQuantity(value, from, to);
  } catch {
    /* Incompatible units stay unconverted. */
  }
  const allowedSteps = data.steps.filter(
    (step) =>
      step.startedAt &&
      step.status !== "done" &&
      (data.me.role === "host" || step.slots.some((slot) => data.me.slots.includes(slot))),
  );
  const selectedStep = stepKey || allowedSteps[0]?.stepKey;
  const duration = parseCookingQuantity(minutes);
  const validDuration = duration !== null && duration > 0 && duration <= 10080;
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
        className="cooking-drawer"
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
        <div className="cooking-drawer-body">
          {tool && (
            <Button variant="ghost" size="chip" onClick={() => setTool(null)}>
              До інструментів
            </Button>
          )}
          {!tool && (
            <div className="cooking-tool-menu">
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
                {data.room.requestedServings} порцій
              </Button>
              <Button variant="outline" size="xl" onClick={() => ask()}>
                Помічник і нотатки
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => {
                  setOpen(false);
                  actions.managePeople();
                }}
              >
                Кухарі та запрошення
              </Button>
              <Button variant="outline" size="xl" aria-pressed={sound} onClick={onSound}>
                {sound ? "Вимкнути звук таймерів" : "Увімкнути звук таймерів"}
              </Button>
              <p>Звук працює, поки застосунок відкритий.</p>
            </div>
          )}
          {tool === "ingredients" && (
            <div className="cooking-tool-panel">
              {data.room.plan?.ingredients.map((ingredient) => (
                <label key={ingredient.id}>
                  <input
                    type="checkbox"
                    checked={data.room.checkedIngredientIds.includes(ingredient.id)}
                    disabled={!actions.online || actions.busy || data.room.state === "done"}
                    onChange={(event) =>
                      actions.toggleIngredient(ingredient.id, event.target.checked)
                    }
                  />
                  <span>
                    {ingredient.name} · <strong>{ingredient.amount}</strong>
                  </span>
                </label>
              )) ?? <p>Інгредієнти з’являться разом із планом.</p>}
            </div>
          )}
          {tool === "convert" && (
            <div className="cooking-tool-panel">
              <label htmlFor="cooking-amount">Кількість</label>
              <Input
                id="cooking-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <div className="cooking-unit-row">
                <label>
                  З
                  <select
                    value={from}
                    onChange={(event) => {
                      if (isCookingUnit(event.target.value)) setFrom(event.target.value);
                    }}
                  >
                    {Object.entries(cookingUnits).map(([unit, definition]) => (
                      <option key={unit} value={unit}>
                        {definition.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  У
                  <select
                    value={to}
                    onChange={(event) => {
                      if (isCookingUnit(event.target.value)) setTo(event.target.value);
                    }}
                  >
                    {Object.entries(cookingUnits).map(([unit, definition]) => (
                      <option key={unit} value={unit}>
                        {definition.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <output aria-live="polite">
                {result === null
                  ? "Введи кількість та обери сумісні одиниці."
                  : `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 3 }).format(result)} ${cookingUnits[to].label}`}
              </output>
              <p>Об’єм у масу залежить від інгредієнта. Для такої заміни запитай помічника.</p>
            </div>
          )}
          {tool === "timer" && (
            <div className="cooking-tool-panel">
              {allowedSteps.length ? (
                <>
                  <label htmlFor="manual-timer-step">Для якого кроку</label>
                  <select
                    id="manual-timer-step"
                    value={selectedStep}
                    onChange={(event) => setStepKey(event.target.value)}
                  >
                    {allowedSteps.map((step) => (
                      <option key={step.stepKey} value={step.stepKey}>
                        {data.room.plan?.steps.find((item) => item.id === step.stepKey)?.title}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="manual-timer-label">Назва</label>
                  <Input
                    id="manual-timer-label"
                    value={label}
                    maxLength={140}
                    placeholder="Наприклад, перевірити тісто"
                    onChange={(event) => setLabel(event.target.value)}
                  />
                  <label htmlFor="manual-timer-minutes">Хвилини</label>
                  <Input
                    id="manual-timer-minutes"
                    inputMode="decimal"
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                  />
                  <Button
                    size="xl"
                    disabled={!actions.online || actions.busy || !validDuration || !label.trim()}
                    onClick={() => {
                      if (selectedStep && duration) {
                        actions.createTimer(selectedStep, label.trim(), Math.round(duration * 60));
                        setOpen(false);
                      }
                    }}
                  >
                    Додати таймер
                  </Button>
                </>
              ) : (
                <p>Спочатку почни крок, для якого потрібен таймер.</p>
              )}
            </div>
          )}
          {tool === "servings" && (
            <div className="cooking-tool-panel">
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
          )}
          <Button variant="ghost" size="chip" onClick={() => setOpen(false)}>
            Закрити
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
