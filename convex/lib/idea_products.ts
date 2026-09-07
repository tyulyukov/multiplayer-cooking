import type { Doc } from "../_generated/dataModel";
import { productRegistryKey } from "./ingredient";
import type { ProductRegistry } from "./silpo_tools";

export function productsStatus(
  registry: ProductRegistry,
): "not_connected" | "needs_address" | "unavailable" | "empty" | undefined {
  if (registry.status) return registry.status;
  return [...registry.candidates.values()].some((candidates) => candidates.length > 0)
    ? undefined
    : "empty";
}

export function buildIdeaProducts(
  ingredients: readonly { name: string }[],
  selections: readonly { ingredient: string; quantity: number; productId?: string }[],
  registry: ProductRegistry,
): NonNullable<Doc<"ideas">["products"]> {
  const seen = new Set<string>();
  return ingredients.flatMap(({ name }) => {
    const key = productRegistryKey(name);
    if (seen.has(key)) return [];
    seen.add(key);
    const selection = selections.find((item) => productRegistryKey(item.ingredient) === key);
    const candidate = selection?.productId
      ? registry.candidates.get(key)?.find((item) => item.productId === selection.productId)
      : undefined;
    if (!candidate || !selection) return [{ ingredient: name, quantity: 1 }];
    return [
      {
        ingredient: name,
        quantity: selection.quantity,
        productId: candidate.productId,
        companyId: candidate.companyId,
        branchId: candidate.branchId,
        title: candidate.title,
        price: candidate.price,
        oldPrice: candidate.oldPrice,
        unit: candidate.unit,
        imageUrl: candidate.imageUrl,
        slug: candidate.slug,
        productUrl: candidate.productUrl,
      },
    ];
  });
}
