import type { FormEvent } from "react";

import { Input } from "@/components/ui/input";
import type { QuestionAnswer, QuestionInput } from "@/lib/question";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";

// The agent's question with its options; after the answer it stays as a read-only summary.
export function QuestionCard({
  input,
  answer,
  pending,
  onSubmit,
}: {
  input: QuestionInput;
  answer: QuestionAnswer | null;
  pending: boolean;
  onSubmit: (answer: { optionIds: string[]; labels: string[]; custom?: string }) => void;
}) {
  if (answer) {
    const parts = [...answer.selected, ...(answer.custom ? [answer.custom] : [])];

    return (
      <section className="question-card chrome" data-answered aria-label={input.question}>
        <p className="question-title">{input.question}</p>
        <p className="question-answer">{parts.length > 0 ? parts.join(", ") : "Без відповіді"}</p>
      </section>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const optionIds = data
      .getAll("answer")
      .filter((item): item is string => typeof item === "string");
    const custom = String(data.get("custom") ?? "").trim();
    const labels = input.options
      .filter((option) => optionIds.includes(option.id))
      .map((option) => option.label);

    if (optionIds.length === 0 && !custom) {
      return;
    }

    onSubmit({ optionIds, labels, custom: custom || undefined });
  }

  return (
    <Questionnaire
      className="question-card chrome"
      aria-label={input.question}
      items={[
        {
          name: "answer",
          choices: input.options.map((option) => ({ value: option.id, disabled: pending })),
        },
      ]}
      shortcuts="numbers"
      onSubmit={handleSubmit}
    >
      <QuestionnaireItem name="answer" multiple={input.allowMultiple}>
        <QuestionnaireTitle className="question-title">{input.question}</QuestionnaireTitle>
        <QuestionnaireChoices>
          {input.options.map((option) => (
            <QuestionnaireChoice key={option.id} value={option.id} disabled={pending}>
              {option.label}
            </QuestionnaireChoice>
          ))}
        </QuestionnaireChoices>
      </QuestionnaireItem>
      {input.allowCustom && (
        <Input
          name="custom"
          placeholder="Або напиши свій варіант"
          maxLength={200}
          disabled={pending}
          aria-label="Свій варіант"
        />
      )}
      <QuestionnaireActions>
        <QuestionnaireSubmit disabled={pending}>
          {pending ? "Надсилаємо…" : "Відповісти"}
        </QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}
