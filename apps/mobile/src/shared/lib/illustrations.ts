export const illustrations = {
  "recipe-box": require("@/assets/images/recipe-box.webp"),
  "memory-fridge": require("@/assets/images/memory-fridge.webp"),
  "ingredients-basket": require("@/assets/images/ingredients-basket.webp"),
  "basket-filled": require("@/assets/images/basket-filled.webp"),
  "serving-dome": require("@/assets/images/serving-dome.webp"),
  "oven-mitts": require("@/assets/images/oven-mitts.webp"),
  "cooking-preparing": require("@/assets/images/cooking-preparing.webp"),
  "cooking-waiting": require("@/assets/images/cooking-waiting.webp"),
  "serving-bell": require("@/assets/images/serving-bell.webp"),
  "bag-pot": require("@/assets/images/bag-pot.webp"),
  "apron-hook": require("@/assets/images/apron-hook.webp"),
  "blank-sign": require("@/assets/images/blank-sign.webp"),
  "helper-ladle": require("@/assets/images/helper-ladle.webp"),
  "notes-clip": require("@/assets/images/notes-clip.webp"),
  "kitchen-timer": require("@/assets/images/kitchen-timer.webp"),
  "unplugged-kettle": require("@/assets/images/unplugged-kettle.webp"),
} as const;

export type IllustrationName = keyof typeof illustrations;

// SAFETY: Object.keys of a const literal returns exactly its keys.
export const illustrationNames = Object.keys(illustrations) as IllustrationName[];
