import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { Input } from "./input";

type InputStoryArgs = ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
};

const meta = {
  title: "Shared/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    id: "story-cook-name",
    label: "Твоє ім’я на кухні",
    placeholder: "Наприклад, Аня",
    type: "text",
    onChange: fn(),
  },
  argTypes: {
    children: { control: false },
  },
  render: ({ label, hint, ...args }) => (
    <div className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      <label htmlFor={args.id} className="text-sm font-medium">
        {label}
      </label>
      <Input {...args} aria-describedby={hint ? `${args.id}-hint` : undefined} />
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
} satisfies Meta<InputStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    defaultValue: "Аня",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    hint: "Введи ім’я, щоб інші кухарі впізнали тебе.",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "Аня",
    disabled: true,
  },
};
