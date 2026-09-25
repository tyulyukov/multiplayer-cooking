import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

type AlertStoryArgs = ComponentProps<typeof Alert> & {
  title: string;
  message: string;
  withAction?: boolean;
};

const onRetry = fn();

const meta = {
  title: "Shared/Alert",
  component: Alert,
  tags: ["autodocs"],
  args: {
    variant: "default",
    title: "Рецепт збережено",
    message: "Можеш повернутися до нього з історії розмов.",
    withAction: false,
  },
  argTypes: {
    variant: { control: "select", options: ["default", "destructive"] },
    children: { control: false },
  },
  render: ({ title, message, withAction, ...args }) => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <Alert {...args}>
        {args.variant === "destructive" && (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
        )}
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        {withAction && (
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Повторити
            </Button>
          </AlertAction>
        )}
      </Alert>
    </div>
  ),
} satisfies Meta<AlertStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Informational: Story = {};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    title: "Фото страви не завантажилося",
    message: "Рецепт збережено. Спробуй додати фото ще раз.",
  },
};

export const WithAction: Story = {
  args: {
    variant: "destructive",
    title: "Не вдалося завантажити фото",
    message: "Перевір з’єднання та повтори спробу.",
    withAction: true,
  },
};
