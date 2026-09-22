import { describe, expect, test } from "bun:test";

import { readQuestionAnswer, readQuestionInput } from "./question";

describe("question readers", () => {
  test("reads batched question contracts", () => {
    expect(
      readQuestionInput({
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
      }),
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
      readQuestionInput({
        question: "Скільки часу маєш?",
        options: [
          { id: "quick", label: "До 20 хвилин" },
          { id: "slow", label: "До години" },
        ],
      }),
    ).toMatchObject({ questions: [{ id: "question", allowMultiple: false, allowCustom: true }] });
    expect(readQuestionAnswer({ selected: ["До 20 хвилин"] })).toEqual({
      answers: [{ questionId: "question", selected: ["До 20 хвилин"] }],
    });
  });
});
