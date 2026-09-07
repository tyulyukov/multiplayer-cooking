import { describe, expect, test } from "bun:test";

import { readQuestionAnswer, readQuestionInput, validateQuestionSubmission } from "./questions";

const input = {
  questions: [
    {
      id: "protein",
      question: "Що хочеш додати до страви?",
      options: [
        { id: "meat", label: "М'ясо" },
        { id: "beans", label: "Квасоля" },
      ],
      allowMultiple: false,
      allowCustom: true,
    },
    {
      id: "spice",
      question: "Який рівень гостроти обрати?",
      options: [
        { id: "mild", label: "Не гостре" },
        { id: "hot", label: "Гостре" },
      ],
      allowMultiple: false,
      allowCustom: false,
    },
  ],
};

describe("question contracts", () => {
  test("normalizes historic single-question calls and answers", () => {
    expect(
      readQuestionInput({
        question: "Скільки часу є?",
        options: [
          { id: "quick", label: "До 20 хвилин" },
          { id: "slow", label: "До години" },
        ],
      }),
    ).toEqual({
      questions: [
        {
          id: "question",
          question: "Скільки часу є?",
          options: [
            { id: "quick", label: "До 20 хвилин" },
            { id: "slow", label: "До години" },
          ],
          allowMultiple: false,
          allowCustom: true,
        },
      ],
    });
    expect(readQuestionAnswer({ selected: ["До 20 хвилин"], custom: "" })).toEqual({
      answers: [{ questionId: "question", selected: ["До 20 хвилин"], custom: "" }],
    });
  });

  test("rejects empty, duplicate, and oversized question identifiers", () => {
    for (const questions of [
      [
        {
          ...input.questions[0],
          id: "",
        },
      ],
      [
        input.questions[0],
        {
          ...input.questions[1],
          id: input.questions[0].id,
        },
      ],
      [
        {
          ...input.questions[0],
          options: [
            { id: "", label: "М'ясо" },
            { id: "beans", label: "Квасоля" },
          ],
        },
      ],
      [
        {
          ...input.questions[0],
          options: [
            { id: "meat", label: "М'ясо".repeat(31) },
            { id: "beans", label: "Квасоля" },
          ],
        },
      ],
    ]) {
      expect(readQuestionInput({ questions })).toBeNull();
    }
  });

  test("rejects incomplete, duplicate, unknown, and invalid question answers", () => {
    const parsed = readQuestionInput(input);
    if (!parsed) throw new Error("Fixture must be a valid question input");

    for (const answers of [
      [{ questionId: "protein", optionIds: ["meat"] }],
      [
        { questionId: "protein", optionIds: ["meat"] },
        { questionId: "protein", optionIds: ["beans"] },
      ],
      [
        { questionId: "protein", optionIds: ["unknown"] },
        { questionId: "spice", optionIds: ["mild"] },
      ],
      [
        { questionId: "protein", optionIds: ["meat", "beans"] },
        { questionId: "spice", optionIds: ["mild"] },
      ],
      [
        { questionId: "protein", optionIds: ["meat"] },
        { questionId: "spice", optionIds: [], custom: "свій" },
      ],
    ]) {
      expect(validateQuestionSubmission(parsed, { answers })).toBeNull();
    }
  });

  test("derives selected labels on the server", () => {
    const parsed = readQuestionInput(input);
    if (!parsed) throw new Error("Fixture must be a valid question input");

    expect(
      validateQuestionSubmission(parsed, {
        answers: [
          { questionId: "protein", optionIds: ["beans"], custom: "  нут  " },
          { questionId: "spice", optionIds: ["mild"] },
        ],
      }),
    ).toEqual({
      answers: [
        { questionId: "protein", selected: ["Квасоля"], custom: "нут" },
        { questionId: "spice", selected: ["Не гостре"] },
      ],
    });
  });
});
