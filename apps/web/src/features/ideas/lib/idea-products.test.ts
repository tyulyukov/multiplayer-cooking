import { describe, expect, test } from "bun:test";
import { getIdeaProducts } from "./idea-products";

describe("getIdeaProducts", () => {
  test("без товарів усі інгредієнти залишаються в списку покупок", () => {
    const ingredients = [{ name: "Томати", amount: "2 шт." }];
    expect(getIdeaProducts({ ingredients })).toEqual({
      matched: [],
      missing: ingredients,
      total: 0,
      noMatches: true,
    });
  });

  test("зіставляє нормалізовані назви та враховує кількість товару", () => {
    const result = getIdeaProducts({
      ingredients: [
        { name: " Томати ", amount: "2 шт." },
        { name: "Сіль", amount: "1 г" },
      ],
      products: [{ ingredient: "томати", productId: "tomato", quantity: 2, price: 25 }],
    });
    expect(result.matched).toHaveLength(1);
    expect(result.missing).toEqual([{ name: "Сіль", amount: "1 г" }]);
    expect(result.total).toBe(50);
    expect(result.noMatches).toBe(false);
  });

  test("товари без ціни не збільшують суму, а без productId не є збігами", () => {
    const result = getIdeaProducts({
      ingredients: [
        { name: "Сіль", amount: "1 г" },
        { name: "Олія", amount: "1 л" },
      ],
      products: [
        { ingredient: "Сіль", quantity: 1, price: 99 },
        { ingredient: "Олія", productId: "oil", quantity: 2 },
      ],
    });
    expect(result.total).toBe(0);
    expect(result.missing).toEqual([{ name: "Сіль", amount: "1 г" }]);
    expect(result.matched).toHaveLength(1);
  });
});
