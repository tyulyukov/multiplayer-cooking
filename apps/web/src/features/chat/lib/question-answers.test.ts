import { expect, test } from "bun:test";
import type { QuestionInput } from "./question";
import { collectQuestionAnswers } from "./question-answers";

const questions: QuestionInput["questions"] = [
  {
    id: "spicy",
    question: "Наскільки гостро?",
    options: [],
    allowMultiple: false,
    allowCustom: true,
  },
  {
    id: "vegetables",
    question: "Які овочі?",
    options: [],
    allowMultiple: true,
    allowCustom: false,
  },
];

test("зберігає всі вибрані варіанти та зіставляє їх за питанням", () => {
  const answers = collectQuestionAnswers(
    questions,
    [
      { name: "vegetables", value: "tomatoes" },
      { name: "spicy", value: "mild" },
      { name: "vegetables", value: "pepper" },
      { name: "other", value: "ignored" },
    ],
    [],
  );

  expect(answers).toEqual([
    { questionId: "spicy", optionIds: ["mild"], custom: undefined },
    { questionId: "vegetables", optionIds: ["tomatoes", "pepper"], custom: undefined },
  ]);
});

test("власна відповідь обрізає пробіли та може доповнювати вибраний варіант", () => {
  expect(
    collectQuestionAnswers(
      questions,
      [{ name: "spicy", value: "mild" }],
      [
        { name: "spicy", value: "  Без перцю  " },
        { name: "vegetables", value: "   " },
      ],
    ),
  ).toEqual([
    { questionId: "spicy", optionIds: ["mild"], custom: "Без перцю" },
    { questionId: "vegetables", optionIds: [], custom: undefined },
  ]);
});

test("питання без відповіді залишається в результаті для перевірки перед надсиланням", () => {
  const answers = collectQuestionAnswers(questions, [], [{ name: "spicy", value: "Помірно" }]);
  expect(answers.find((answer) => !answer.optionIds.length && !answer.custom)?.questionId).toBe(
    "vegetables",
  );
});
