import type { FC } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { QuestionInput } from "../lib/question";
import {
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireTitle,
} from "@/shared/ui/questionnaire";
import styles from "./question-card.module.scss";

type Props = {
  question: QuestionInput["questions"][number];
  pending: boolean;
  advanceSingleChoice: () => void;
  cancelAdvance: () => void;
};

export const QuestionItem: FC<Props> = ({
  question,
  pending,
  advanceSingleChoice,
  cancelAdvance,
}) => (
  <QuestionnaireItem
    name={question.id}
    multiple={question.allowMultiple}
    required
    disabled={pending}
  >
    <QuestionnaireTitle className={styles["question-title"]}>
      {question.question}
    </QuestionnaireTitle>
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
          <span className={styles["question-option-marker"]} aria-hidden>
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
);
