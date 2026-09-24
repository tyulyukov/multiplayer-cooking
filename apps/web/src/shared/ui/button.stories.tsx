import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button } from "./button";

const meta = {
  title: "Shared/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "xl", "chip", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
    asChild: { control: false },
  },
  args: {
    children: "Створити кухню",
    onClick: fn(),
    type: "button",
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    size: "xl",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Додати інгредієнт",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Зберегти на потім",
  },
};

export const SelectedChip: Story = {
  args: {
    variant: "outline",
    size: "chip",
    "aria-pressed": true,
    children: "Без м’яса",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Назад",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Видалити фото",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Детальніше",
  },
};

export const Disabled: Story = {
  args: {
    size: "xl",
    disabled: true,
  },
};
