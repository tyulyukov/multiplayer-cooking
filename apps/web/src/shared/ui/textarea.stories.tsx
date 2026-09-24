import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { Textarea } from "./textarea";

type TextareaStoryArgs = ComponentProps<typeof Textarea> & {
  label: string;
  hint?: string;
};

const meta = {
  title: "Shared/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    id: "story-cooking-notes",
    label: "Що ще враховувати",
    placeholder: "Наприклад, запропонуй простішу альтернативу",
    rows: 4,
    variant: "default",
    onChange: fn(),
  },
  argTypes: {
    variant: { control: "select", options: ["default", "ghost"] },
    children: { control: false },
  },
  render: ({ label, hint, ...args }) => (
    <div className="flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      <label htmlFor={args.id} className="text-sm font-medium">
        {label}
      </label>
      <Textarea {...args} aria-describedby={hint ? `${args.id}-hint` : undefined} />
      {hint && (
        <p
          id={`${args.id}-hint`}
          className={
            args["aria-invalid"] ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {hint}
        </p>
      )}
    </div>
  ),
} satisfies Meta<TextareaStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    defaultValue: "Готую для двох і не люблю гостре.",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    hint: "Скороти опис до 1000 символів.",
    defaultValue: "Дуже довгий опис уподобань…",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    label: "Повідомлення помічнику",
    placeholder: "Запитай про поточний крок",
  },
  render: ({ label, hint, ...args }) => (
    <div className="chrome flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-[22px] p-3">
      <label htmlFor={args.id} className="text-sm font-medium">
        {label}
      </label>
      <Textarea {...args} aria-describedby={hint ? `${args.id}-hint` : undefined} />
      {hint && (
        <p id={`${args.id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    defaultValue: "Готую для двох.",
    disabled: true,
  },
};
