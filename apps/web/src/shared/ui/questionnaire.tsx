import type { FC } from "react";
import * as React from "react";
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire";
import { cn } from "cn";

import { buttonVariants, type Button } from "@/shared/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

type QuestionnaireProps = React.ComponentProps<typeof QuestionnairePrimitive.Root>;

const Questionnaire: FC<QuestionnaireProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Root
      data-slot="questionnaire"
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    />
  );
};

type QuestionnaireProgressProps = React.ComponentProps<typeof QuestionnairePrimitive.Progress>;

const QuestionnaireProgress: FC<QuestionnaireProgressProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Progress
      data-slot="questionnaire-progress"
      className={cn(
        "min-h-[1lh] w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    />
  );
};

type QuestionnaireItemProps = React.ComponentProps<typeof QuestionnairePrimitive.Item>;

const QuestionnaireItem: FC<QuestionnaireItemProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Item
      data-slot="questionnaire-item"
      className={cn("flex min-w-0 flex-col gap-4 border-0 p-0 outline-none", className)}
      {...props}
    />
  );
};

type QuestionnaireTitleProps = React.ComponentProps<typeof QuestionnairePrimitive.Title>;

const QuestionnaireTitle: FC<QuestionnaireTitleProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Title
      data-slot="questionnaire-title"
      className={cn("mb-1 text-base leading-snug font-medium text-pretty", className)}
      {...props}
    />
  );
};

type QuestionnaireDescriptionProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Description
>;

const QuestionnaireDescription: FC<QuestionnaireDescriptionProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Description
      data-slot="questionnaire-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
};

type QuestionnaireChoicesProps = React.ComponentProps<typeof QuestionnairePrimitive.Choices>;

const QuestionnaireChoices: FC<QuestionnaireChoicesProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Choices
      data-slot="questionnaire-choices"
      className={cn("group/questionnaire-choices grid min-w-0 gap-2", className)}
      {...props}
    />
  );
};

type QuestionnaireChoiceProps = React.ComponentProps<typeof QuestionnairePrimitive.Choice>;

const QuestionnaireChoice: FC<QuestionnaireChoiceProps> = ({ children, className, ...props }) => {
  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-input bg-transparent px-3 py-2.5 text-start text-sm transition-colors outline-none select-none hover:bg-muted/50 has-[>input:focus-visible]:border-ring has-[>input:focus-visible]:ring-3 has-[>input:focus-visible]:ring-ring/50 data-invalid:border-destructive dark:bg-input/20 data-checked:border-primary/40 data-checked:bg-muted dark:data-checked:bg-muted",
        "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        className="pointer-events-none relative flex size-4 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-[4px] border border-input group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[type=radio]/questionnaire-choice:rounded-full group-data-checked/questionnaire-choice:border-primary group-data-checked/questionnaire-choice:bg-primary group-data-checked/questionnaire-choice:text-primary-foreground dark:bg-input/30 dark:group-data-checked/questionnaire-choice:bg-primary"
      >
        <span
          data-slot="questionnaire-choice-indicator-dot"
          className="hidden size-2 rounded-full bg-primary-foreground group-data-[type=checkbox]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
        />
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2}
          data-slot="questionnaire-choice-indicator-check"
          className="hidden size-3.5 group-data-[type=radio]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
        />
      </span>
      <QuestionnairePrimitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug"
      >
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <QuestionnairePrimitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        className="pointer-events-none ms-auto hidden size-5 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-md border border-input bg-background font-mono text-[0.625rem] leading-none font-medium text-muted-foreground group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[shortcut]/questionnaire-choice:inline-flex"
      />
    </QuestionnairePrimitive.Choice>
  );
};

type QuestionnaireChoiceDescriptionProps = React.ComponentProps<"span">;

const QuestionnaireChoiceDescription: FC<QuestionnaireChoiceDescriptionProps> = ({
  className,
  ...props
}) => {
  return (
    <span
      data-slot="questionnaire-choice-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
};

type QuestionnaireInputProps = React.ComponentProps<typeof QuestionnairePrimitive.Input>;

const QuestionnaireInput: FC<QuestionnaireInputProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="questionnaire-input-wrapper"
      className="group/questionnaire-input relative w-full min-w-0"
    >
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        className={cn(
          "h-8 min-h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:min-h-0 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
};

type QuestionnaireErrorProps = React.ComponentProps<typeof QuestionnairePrimitive.Error>;

const QuestionnaireError: FC<QuestionnaireErrorProps> = ({ className, ...props }) => {
  return (
    <QuestionnairePrimitive.Error
      data-slot="questionnaire-error"
      className={cn("mt-2 text-sm text-destructive", className)}
      {...props}
    />
  );
};

type QuestionnaireActionsProps = React.ComponentProps<"div">;

const QuestionnaireActions: FC<QuestionnaireActionsProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn(
        "grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:min-h-8",
        className,
      )}
      {...props}
    />
  );
};

type QuestionnairePreviousProps = React.ComponentProps<typeof QuestionnairePrimitive.Previous> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

const QuestionnairePrevious: FC<QuestionnairePreviousProps> = ({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}) => {
  return (
    <QuestionnairePrimitive.Previous
      data-slot="questionnaire-previous"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0",
        className,
      )}
      {...props}
    >
      {children ?? "Previous"}
    </QuestionnairePrimitive.Previous>
  );
};

type QuestionnaireSkipProps = React.ComponentProps<typeof QuestionnairePrimitive.Skip> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

const QuestionnaireSkip: FC<QuestionnaireSkipProps> = ({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}) => {
  return (
    <QuestionnairePrimitive.Skip
      data-slot="questionnaire-skip"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className,
      )}
      {...props}
    >
      {children ?? "Skip"}
    </QuestionnairePrimitive.Skip>
  );
};

type QuestionnaireNextProps = React.ComponentProps<typeof QuestionnairePrimitive.Next> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

const QuestionnaireNext: FC<QuestionnaireNextProps> = ({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}) => {
  return (
    <QuestionnairePrimitive.Next
      data-slot="questionnaire-next"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className,
      )}
      {...props}
    >
      {children ?? "Next"}
    </QuestionnairePrimitive.Next>
  );
};

type QuestionnaireSubmitProps = React.ComponentProps<typeof QuestionnairePrimitive.Submit> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

const QuestionnaireSubmit: FC<QuestionnaireSubmitProps> = ({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}) => {
  return (
    <QuestionnairePrimitive.Submit
      data-slot="questionnaire-submit"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className,
      )}
      {...props}
    >
      {children ?? "Submit"}
    </QuestionnairePrimitive.Submit>
  );
};

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
};
