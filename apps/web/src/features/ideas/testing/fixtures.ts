import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { fn } from "storybook/test";

import type { Idea, IdeaVersions } from "../model/types";

// SAFETY: these IDs identify local Storybook fixtures, not Convex records.
export const storyIdea = {
  _id: "story-idea" as Id<"ideas">,
  _creationTime: Date.UTC(2026, 8, 23, 11, 0, 0),
  userId: "story-user" as Id<"users">,
  threadId: "story-thread",
  promptMessageId: "story-prompt",
  title: "Паста з овочами",
  summary: "Швидка вечеря з помідорами та перцем.",
  body: "## Приготування\n\n1. Відвари пасту до готовності.\n2. Обсмаж овочі й змішай із пастою.",
  timeMinutes: 25,
  servings: 4,
  ingredients: [
    { name: "Паста", amount: "300 г" },
    { name: "Помідори", amount: "2 шт." },
    { name: "Перець", amount: "1 шт." },
  ],
  imageUrl: undefined,
  productsStatus: "empty",
} satisfies Idea;

export const storyIdeaWithProducts = {
  ...storyIdea,
  productsStatus: undefined,
  products: [
    {
      ingredient: "Паста",
      quantity: 1,
      productId: "story-pasta",
      title: "Паста, 300 г",
      unit: "упаковка",
      price: 64.9,
    },
    {
      ingredient: "Помідори",
      quantity: 0.5,
      productId: "story-tomatoes",
      title: "Помідори",
      unit: "кг",
      price: 98,
    },
  ],
} satisfies Idea;

export const storyIdeaVersions = {
  index: 0,
  count: 1,
  restoring: false,
  restoreError: null,
  onSelect: fn(),
  onRestore: fn(),
} satisfies IdeaVersions;
