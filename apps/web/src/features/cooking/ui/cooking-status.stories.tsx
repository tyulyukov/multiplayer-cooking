import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { CookingStatus } from "./cooking-status";

const meta = {
  title: "Features/Cooking/Status",
  component: CookingStatus,
  tags: ["autodocs"],
  args: {
    title: "Складаємо план",
    body: "Розподіляємо роботу між кухарями.",
    image: "cooking-preparing.webp",
    loading: true,
    onAction: fn(),
  },
  render: (args) => (
    <div className="w-full max-w-lg">
      <CookingStatus {...args} />
    </div>
  ),
} satisfies Meta<typeof CookingStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Generating: Story = {};

export const Failed: Story = {
  args: {
    title: "План не створився",
    body: "Спробуй ще раз.",
    image: undefined,
    loading: false,
    action: "Спробувати ще раз",
  },
};

export const Waiting: Story = {
  args: {
    title: "План ще готується",
    body: "Інструкції з’являться тут.",
    image: undefined,
    loading: false,
  },
};
