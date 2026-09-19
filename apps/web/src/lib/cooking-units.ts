export const cookingUnits = {
  g: { label: "г", kind: "mass", factor: 1 },
  kg: { label: "кг", kind: "mass", factor: 1000 },
  oz: { label: "унція", kind: "mass", factor: 28.349523125 },
  lb: { label: "фунт", kind: "mass", factor: 453.59237 },
  ml: { label: "мл", kind: "volume", factor: 1 },
  l: { label: "л", kind: "volume", factor: 1000 },
  tsp: { label: "ч. л. · 5 мл", kind: "volume", factor: 5 },
  tbsp: { label: "ст. л. · 15 мл", kind: "volume", factor: 15 },
  cup: { label: "склянка · 250 мл", kind: "volume", factor: 250 },
  usCup: { label: "чашка США · 236,6 мл", kind: "volume", factor: 236.5882365 },
  C: { label: "°C", kind: "temperature", factor: 1 },
  F: { label: "°F", kind: "temperature", factor: 1 },
} as const;

export type CookingUnit = keyof typeof cookingUnits;

export function isCookingUnit(value: string): value is CookingUnit {
  return Object.hasOwn(cookingUnits, value);
}

export function convertCookingQuantity(value: number, from: CookingUnit, to: CookingUnit) {
  if (!Number.isFinite(value) || cookingUnits[from].kind !== cookingUnits[to].kind) return null;
  if (cookingUnits[from].kind === "temperature") {
    const celsius = from === "C" ? value : ((value - 32) * 5) / 9;
    if (celsius < -273.15) return null;
    const converted = to === "C" ? celsius : (celsius * 9) / 5 + 32;
    return Number.isFinite(converted) ? converted : null;
  }
  if (value < 0) return null;
  const converted = (value * cookingUnits[from].factor) / cookingUnits[to].factor;
  return Number.isFinite(converted) ? converted : null;
}

export function parseCookingQuantity(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
