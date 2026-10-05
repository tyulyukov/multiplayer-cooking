import type { FC } from "react";
import type { QuestionAnswer, QuestionInput } from "../lib/question";
import styles from "./question-summary.module.scss";

type QuestionSummaryProps = {
  input: QuestionInput;
  answer: QuestionAnswer;
};

export const QuestionSummary: FC<QuestionSummaryProps> = ({ input, answer }) => {
  return (
    <section className={styles["question-summary"]} data-answered aria-label="Твої відповіді">
      {input.questions.map((question) => {
        const value = answer.answers.find((item) => item.questionId === question.id);

        if (!value) return null;

        return (
          <div key={question.id}>
            <p className={styles["question-title"]}>{question.question}</p>
            <p className={styles["question-answer"]}>
              {[...value.selected, ...(value.custom ? [value.custom] : [])].join(", ")}
            </p>
          </div>
        );
      })}
    </section>
  );
};
