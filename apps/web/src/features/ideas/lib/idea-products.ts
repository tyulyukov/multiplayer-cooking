import { productRegistryKey } from "@multiplayer-cooking/backend/convex/lib/ingredient";
import type { Idea } from "../model/types";
export const getIdeaProducts = (idea: Pick<Idea, "products" | "ingredients">) => {
  const products = idea.products ?? [];

  const matched = products.filter((product) => product.productId);
  const matchedIngredients = new Set(
    matched.map((product) => productRegistryKey(product.ingredient)),
  );
  const missing = idea.ingredients.filter(
    (ingredient) => !matchedIngredients.has(productRegistryKey(ingredient.name)),
  );
  const total = matched.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);
  const noMatches = matched.length === 0;

  return { matched, missing, total, noMatches };
};
