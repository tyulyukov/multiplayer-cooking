import { useQuestionCard } from "../model/use-question-card";
import { QuestionItem } from "./question-item";
import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/features/chat/ui/question-card.module.scss";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";

import type { QuestionInput } from "@/features/chat/lib/question";
import type { QuestionResponse } from "@/features/chat/model/types";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSubmit,
} from "@/shared/ui/questionnaire";

type QuestionCardProps = {
  input: QuestionInput;
  pending: boolean;
  onSubmit: (answer: QuestionResponse) => void;
};

export const QuestionCard: FC<QuestionCardProps> = ({ input, pending, onSubmit }) => {
  const {
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
  } = useQuestionCard({ input, pending, onSubmit });

  return (
    <Questionnaire
      ref={formRef}
      className={cn(styles["question-card"], styles["composer-questionnaire"])}
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
        className={styles["question-progress"]}
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
      <div className={styles["question-viewport"]} hidden={collapsed}>
        {input.questions.map((question) => (
          <QuestionItem
            key={question.id}
            question={question}
            pending={pending}
            advanceSingleChoice={advanceSingleChoice}
            cancelAdvance={cancelAdvance}
          />
        ))}
      </div>
      <QuestionnaireActions>
        <QuestionnairePrevious disabled={pending}>Назад</QuestionnairePrevious>
        <QuestionnaireNext disabled={pending} className={styles["question-next"]}>
          Далі
        </QuestionnaireNext>
        <QuestionnaireSubmit disabled={pending} className={styles["question-next"]}>
          {pending ? "Надсилаємо…" : "Надіслати"}
        </QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
};
