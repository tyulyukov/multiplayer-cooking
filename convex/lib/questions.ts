export type QuestionOption = Readonly<{ id: string; label: string }>;

export type Question = Readonly<{
  id: string;
  question: string;
  options: readonly QuestionOption[];
  allowMultiple: boolean;
  allowCustom: boolean;
}>;

export type QuestionInput = Readonly<{ questions: readonly Question[] }>;

export type QuestionAnswer = Readonly<{
  answers: readonly Readonly<{
    questionId: string;
    selected: readonly string[];
    custom?: string;
  }>[];
}>;

export type QuestionSubmission = Readonly<{
  answers: readonly Readonly<{
    questionId: string;
    optionIds: readonly string[];
    custom?: string;
  }>[];
}>;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readOption(value: unknown): QuestionOption | null {
  const option = record(value);
  if (
    !option ||
    typeof option.id !== "string" ||
    option.id.length < 1 ||
    option.id.length > 30 ||
    typeof option.label !== "string" ||
    option.label.length < 1 ||
    option.label.length > 60
  ) {
    return null;
  }
  return { id: option.id, label: option.label };
}

function readQuestion(value: unknown, legacy = false): Question | null {
  const item = record(value);
  const id = legacy ? "question" : item?.id;
  if (
    !item ||
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 30 ||
    typeof item.question !== "string" ||
    item.question.length < 5 ||
    item.question.length > 160 ||
    !Array.isArray(item.options) ||
    item.options.length < 2 ||
    item.options.length > 5
  ) {
    return null;
  }

  const optionIds = new Set<string>();
  const options: QuestionOption[] = [];
  for (const value of item.options) {
    const option = readOption(value);
    if (!option || optionIds.has(option.id)) return null;
    optionIds.add(option.id);
    options.push(option);
  }

  return {
    id,
    question: item.question,
    options,
    allowMultiple: item.allowMultiple === true,
    allowCustom: item.allowCustom !== false,
  };
}

// Historic ask_user calls used one question directly at the input root.
export function readQuestionInput(value: unknown): QuestionInput | null {
  const input = record(value);
  if (!input) return null;

  const batched = "questions" in input;
  let source: readonly unknown[];
  if (batched) {
    if (!Array.isArray(input.questions)) return null;
    source = input.questions;
  } else {
    source = [input];
  }
  const ids = new Set<string>();
  const questions: Question[] = [];

  for (const value of source) {
    const question = readQuestion(value, !batched);
    if (!question || ids.has(question.id)) return null;
    ids.add(question.id);
    questions.push(question);
  }

  return questions.length >= 1 && questions.length <= 4 ? { questions } : null;
}

// Historic tool results had { selected, custom } for the implicit "question" id.
export function readQuestionAnswer(value: unknown): QuestionAnswer | null {
  const output = record(value);
  if (!output) return null;

  const batched = "answers" in output;
  let source: readonly unknown[];
  if (batched) {
    if (!Array.isArray(output.answers)) return null;
    source = output.answers;
  } else {
    source = [output];
  }
  const answers: { questionId: string; selected: string[]; custom?: string }[] = [];

  for (const value of source) {
    const answer = record(value);
    const questionId = batched ? answer?.questionId : "question";
    if (
      !answer ||
      typeof questionId !== "string" ||
      !Array.isArray(answer.selected) ||
      answer.selected.some((selection) => typeof selection !== "string") ||
      ("custom" in answer && typeof answer.custom !== "string")
    ) {
      return null;
    }
    answers.push({
      questionId,
      selected: answer.selected,
      ...(typeof answer.custom === "string" ? { custom: answer.custom } : {}),
    });
  }

  return { answers };
}

export function validateQuestionSubmission(
  input: QuestionInput,
  submission: QuestionSubmission,
): QuestionAnswer | null {
  if (submission.answers.length !== input.questions.length) return null;

  const submitted = new Map<string, QuestionSubmission["answers"][number]>();

  for (const answer of submission.answers) {
    if (!answer.questionId || submitted.has(answer.questionId)) return null;
    submitted.set(answer.questionId, answer);
  }

  const answers: { questionId: string; selected: string[]; custom?: string }[] = [];

  for (const question of input.questions) {
    const answer = submitted.get(question.id);
    if (!answer || new Set(answer.optionIds).size !== answer.optionIds.length) return null;

    const custom = answer.custom?.trim();
    if (
      (answer.custom !== undefined && (!question.allowCustom || answer.custom.length > 200)) ||
      (!custom && answer.optionIds.length === 0)
    ) {
      return null;
    }

    if (
      (!question.allowMultiple && answer.optionIds.length > 1) ||
      answer.optionIds.some((id) => !question.options.some((option) => option.id === id))
    ) {
      return null;
    }

    answers.push({
      questionId: question.id,
      selected: answer.optionIds.map(
        (id) => question.options.find((option) => option.id === id)?.label ?? "",
      ),
      ...(custom ? { custom } : {}),
    });
  }

  return { answers };
}
