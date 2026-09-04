// Readers for the ask_user tool call input and its saved answer.

export type QuestionInput = Readonly<{
  question: string;
  options: readonly { id: string; label: string }[];
  allowMultiple?: boolean;
  allowCustom?: boolean;
}>;

export type QuestionAnswer = Readonly<{ selected: readonly string[]; custom?: string }>;

export function readQuestionInput(value: unknown): QuestionInput | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const options = Array.isArray(record.options)
    ? record.options.filter(
        (option): option is { id: string; label: string } =>
          typeof option === "object" &&
          option !== null &&
          typeof (option as { id?: unknown }).id === "string" &&
          typeof (option as { label?: unknown }).label === "string",
      )
    : [];

  if (typeof record.question !== "string" || options.length === 0) {
    return null;
  }

  return {
    question: record.question,
    options,
    allowMultiple: record.allowMultiple === true,
    allowCustom: record.allowCustom !== false,
  };
}

export function readQuestionAnswer(value: unknown): QuestionAnswer | null {
  if (typeof value !== "object" || value === null || !("selected" in value)) {
    return null;
  }

  const selected = (value as { selected?: unknown }).selected;
  const custom = (value as { custom?: unknown }).custom;

  return Array.isArray(selected)
    ? {
        selected: selected.filter((item): item is string => typeof item === "string"),
        custom: typeof custom === "string" ? custom : undefined,
      }
    : null;
}
