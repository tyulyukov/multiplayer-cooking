import type { QuestionInput } from "./question";
import type { QuestionResponse } from "../model/types";

type AnswerField = { name: string; value: string };

export const collectQuestionAnswers = (
  questions: QuestionInput["questions"],
  checked: readonly AnswerField[],
  customInputs: readonly AnswerField[],
): QuestionResponse["answers"] => {
  return questions.map((question) => ({
    questionId: question.id,
    optionIds: checked.flatMap((field) => (field.name === question.id ? [field.value] : [])),
    custom: customInputs.find((field) => field.name === question.id)?.value.trim() || undefined,
  }));
};
