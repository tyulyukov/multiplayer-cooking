import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { useMediaQuery } from "@/lib/use-media-query";

import type { QuestionAnswer, QuestionInput } from "@/lib/question";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";

export type QuestionResponse = FunctionArgs<typeof api.chat.answerQuestion>["answer"];

export function QuestionSummary({
  input,
  answer,
}: {
  input: QuestionInput;
  answer: QuestionAnswer;
}) {
  return (
    <section className="question-card" data-answered aria-label="Твої відповіді">
      {input.questions.map((question) => {
        const value = answer.answers.find((item) => item.questionId === question.id);
        if (!value) return null;
        return (
          <div key={question.id}>
            <p className="question-title">{question.question}</p>
            <p className="question-answer">
              {[...value.selected, ...(value.custom ? [value.custom] : [])].join(", ")}
            </p>
          </div>
        );
      })}
    </section>
  );
}

export function QuestionCard({
  input,
  pending,
  onSubmit,
}: {
  input: QuestionInput;
  pending: boolean;
  onSubmit: (answer: QuestionResponse) => void;
}) {
  const [current, setCurrent] = useState(input.questions[0]?.id);
  const [collapsed, setCollapsed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopKeyboard = useMediaQuery("(min-width: 1024px) and (pointer: fine)");

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    },
    [current, pending, collapsed],
  );

  function cancelAdvance() {
    if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }

  function advanceSingleChoice() {
    cancelAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      const form = formRef.current;
      if (!form) return;
      const next = form.querySelector<HTMLButtonElement>(
        '[data-slot="questionnaire-next"]:not([hidden])',
      );
      if (next) next.click();
      else form.requestSubmit();
    }, 200);
  }
  const currentIndex = input.questions.findIndex((question) => question.id === current);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelAdvance();
    if (pending) return;
    const checked = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]:checked, input[type="checkbox"]:checked',
      ),
    );
    const customInputs = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>('[data-slot="questionnaire-input"]'),
    );
    const answers = input.questions.map((question) => ({
      questionId: question.id,
      optionIds: checked.filter((field) => field.name === question.id).map((field) => field.value),
      custom: customInputs.find((field) => field.name === question.id)?.value.trim() || undefined,
    }));
    const missing = answers.find((answer) => !answer.optionIds.length && !answer.custom);
    if (missing) {
      setCurrent(missing.questionId);
      return;
    }
    onSubmit({ answers });
  }

  return (
    <Questionnaire
      ref={formRef}
      className="question-card composer-questionnaire"
      aria-label="Уточнення до страви"
      item={current}
      onItemChange={(id) => {
        cancelAdvance();
        setCurrent(id);
        setCollapsed(false);
      }}
      shortcuts={desktopKeyboard && !collapsed ? "numbers" : undefined}
      items={input.questions.map((question) => ({
        name: question.id,
        required: true,
        choices: question.options.map((option) => ({ value: option.id, disabled: pending })),
      }))}
      onSubmit={handleSubmit}
    >
      <button
        type="button"
        className="question-progress"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Розгорнути питання" : "Згорнути питання"}
        onClick={() => {
          cancelAdvance();
          setCollapsed(!collapsed);
        }}
      >
        <span>{collapsed ? input.questions[currentIndex]?.question : "Уточнення до страви"}</span>
        <span>
          {currentIndex + 1} / {input.questions.length}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <div className="question-viewport" hidden={collapsed}>
        {input.questions.map((question) => (
          <QuestionnaireItem
            key={question.id}
            name={question.id}
            multiple={question.allowMultiple}
            required
            disabled={pending}
          >
            <QuestionnaireTitle className="question-title">{question.question}</QuestionnaireTitle>
            <QuestionnaireDescription>
              {question.allowMultiple ? "Обери всі варіанти, які підходять" : "Обери один варіант"}
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              {question.options.map((option, index) => (
                <QuestionnaireChoice
                  key={option.id}
                  value={option.id}
                  disabled={pending}
                  onClick={(event) => {
                    if (!question.allowMultiple && event.detail > 0) advanceSingleChoice();
                  }}
                >
                  {option.label}
                  <span className="question-option-marker" aria-hidden>
                    <span>{index + 1}</span>
                    <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
                  </span>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            {question.allowCustom && (
              <QuestionnaireInput
                onFocus={cancelAdvance}
                onChange={cancelAdvance}
                placeholder="Або напиши свій варіант"
                maxLength={200}
                disabled={pending}
                aria-label={`Свій варіант: ${question.question}`}
              />
            )}
            <QuestionnaireError>
              {question.allowCustom
                ? "Обери варіант або напиши свою відповідь."
                : "Обери варіант відповіді."}
            </QuestionnaireError>
          </QuestionnaireItem>
        ))}
      </div>
      <QuestionnaireActions>
        <QuestionnairePrevious disabled={pending}>Назад</QuestionnairePrevious>
        <QuestionnaireNext disabled={pending} className="question-next">
          Далі
        </QuestionnaireNext>
        <QuestionnaireSubmit disabled={pending} className="question-next">
          {pending ? "Надсилаємо…" : "Надіслати"}
        </QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}
