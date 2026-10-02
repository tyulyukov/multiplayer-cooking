import type { FC } from "react";
import cookingStyles from "./cooking-drawers.module.scss";
import { Input } from "@/shared/ui/input";
import {
  convertCookingQuantity,
  cookingUnits,
  isCookingUnit,
  parseCookingQuantity,
} from "../lib/cooking-units";

type Props = {
  amount: string;
  setAmount: (value: string) => void;
  from: keyof typeof cookingUnits;
  setFrom: (value: keyof typeof cookingUnits) => void;
  to: keyof typeof cookingUnits;
  setTo: (value: keyof typeof cookingUnits) => void;
};

export const CookingConverter: FC<Props> = ({ amount, setAmount, from, setFrom, to, setTo }) => {
  let result: number | null = null;

  try {
    const value = parseCookingQuantity(amount);

    if (value !== null) result = convertCookingQuantity(value, from, to);
  } catch {
    /* Incompatible units stay unconverted. */
  }

  return (
    <div className={cookingStyles["cooking-tool-panel"]}>
      <label htmlFor="cooking-amount">Кількість</label>
      <Input
        id="cooking-amount"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <div className={cookingStyles["cooking-unit-row"]}>
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
  );
};
