import * as z from "zod/mini";

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

type AnsweredQuestion = { questionId: string; selected: string[]; custom?: string };

const questionOptionSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(30)),
  label: z.string().check(z.minLength(1), z.maxLength(60)),
});

const questionSchema = z.object({
  id: z.optional(z.string().check(z.minLength(1), z.maxLength(30))),
  question: z.string().check(z.minLength(5), z.maxLength(160)),
  options: z.array(questionOptionSchema).check(z.minLength(2), z.maxLength(5)),
  allowMultiple: z.optional(z.unknown()),
  allowCustom: z.optional(z.unknown()),
});

type RawQuestion = z.output<typeof questionSchema>;

function toQuestion(raw: RawQuestion, id: string): Question | null {
  const optionIds = new Set(raw.options.map((option) => option.id));

  if (optionIds.size !== raw.options.length) return null;

  return {
    id,
    question: raw.question,
    options: raw.options,
    allowMultiple: raw.allowMultiple === true,
    allowCustom: raw.allowCustom !== false,
  };
}

function buildQuestionInput(rawQuestions: readonly RawQuestion[], legacy: boolean) {
  const ids = new Set<string>();
  const questions: Question[] = [];

  for (const raw of rawQuestions) {
    const id = legacy ? "question" : raw.id;
    const question = id ? toQuestion(raw, id) : null;

    if (!question || ids.has(question.id)) return null;
    ids.add(question.id);
    questions.push(question);
  }

  return questions.length >= 1 && questions.length <= 4 ? { questions } : null;
}

// Parses a raw ask_user tool-call payload. Historic calls put one question at the input root.
export const questionInputSchema = z.pipe(
  z.union([z.object({ questions: z.array(questionSchema) }), questionSchema]),
  z.transform((payload): QuestionInput | null =>
    "questions" in payload
      ? buildQuestionInput(payload.questions, false)
      : buildQuestionInput([payload], true),
  ),
);

const answerEntrySchema = z.object({
  questionId: z.optional(z.string()),
  selected: z.array(z.string()),
  custom: z.optional(z.string()),
});

type RawAnswer = z.output<typeof answerEntrySchema>;

function buildQuestionAnswer(rawAnswers: readonly RawAnswer[], batched: boolean) {
  const answers: AnsweredQuestion[] = [];

  for (const raw of rawAnswers) {
    const questionId = batched ? raw.questionId : "question";

    if (!questionId) return null;

    const entry: AnsweredQuestion = { questionId, selected: raw.selected };

    if (raw.custom !== undefined) entry.custom = raw.custom;
    answers.push(entry);
  }

  return { answers };
}

// Parses a raw ask_user tool result. Historic results had { selected, custom } for the
// implicit "question" id.
export const questionAnswerSchema = z.pipe(
  z.union([z.object({ answers: z.array(answerEntrySchema) }), answerEntrySchema]),
  z.transform((payload): QuestionAnswer | null =>
    "answers" in payload
      ? buildQuestionAnswer(payload.answers, true)
      : buildQuestionAnswer([payload], false),
  ),
);

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

  const answers: AnsweredQuestion[] = [];

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

    const entry: AnsweredQuestion = {
      questionId: question.id,
      selected: answer.optionIds.map(
        (id) => question.options.find((option) => option.id === id)?.label ?? "",
      ),
    };

    if (custom) entry.custom = custom;
    answers.push(entry);
  }

  return { answers };
}
