import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import type { QuestionInput } from "../lib/question";
import type { QuestionResponse } from "./types";
import { collectQuestionAnswers } from "../lib/question-answers";

type Props = {
  input: QuestionInput;
  pending: boolean;
  onSubmit: (answer: QuestionResponse) => void;
};

export const useQuestionCard = ({ input, pending, onSubmit }: Props) => {
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

  const cancelAdvance = () => {
    if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  const advanceSingleChoice = () => {
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
  };

  const currentIndex = input.questions.findIndex((question) => question.id === current);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const answers = collectQuestionAnswers(input.questions, checked, customInputs);

    const missing = answers.find((answer) => !answer.optionIds.length && !answer.custom);

    if (missing) {
      setCurrent(missing.questionId);

      return;
    }

    onSubmit({ answers });
  };

  return {
    current,
    setCurrent,
    collapsed,
    setCollapsed,
    formRef,
    desktopKeyboard,
    currentIndex,
    cancelAdvance,
    advanceSingleChoice,
    handleSubmit,
  };
};
