import { describe, expect, test } from "bun:test";

import { questionAnswerSchema, questionInputSchema } from "./question";

describe("question readers", () => {
  test("reads batched question contracts", () => {
    expect(
      questionInputSchema.safeParse({
        questions: [
          {
            id: "time",
            question: "Скільки часу маєш?",
            options: [
              { id: "quick", label: "До 20 хвилин" },
              { id: "slow", label: "До години" },
            ],
            allowMultiple: false,
            allowCustom: false,
          },
        ],
      }).data ?? null,
    ).toEqual({
      questions: [
        {
          id: "time",
          question: "Скільки часу маєш?",
          options: [
            { id: "quick", label: "До 20 хвилин" },
            { id: "slow", label: "До години" },
          ],
          allowMultiple: false,
          allowCustom: false,
        },
      ],
    });
  });

  test("normalizes historic single question inputs and answers", () => {
    expect(
      questionInputSchema.safeParse({
        question: "Скільки часу маєш?",
        options: [
          { id: "quick", label: "До 20 хвилин" },
          { id: "slow", label: "До години" },
        ],
      }).data ?? null,
    ).toMatchObject({ questions: [{ id: "question", allowMultiple: false, allowCustom: true }] });
    expect(questionAnswerSchema.safeParse({ selected: ["До 20 хвилин"] }).data ?? null).toEqual({
      answers: [{ questionId: "question", selected: ["До 20 хвилин"] }],
    });
  });
});
