import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CookingReference } from "./cooking-reference";

const meta = {
  title: "Features/Cooking/Reference",
  component: CookingReference,
  args: {
    alt: "Підготуй овочі",
    status: "pending",
    disabled: false,
    onRetry: fn(),
  },
} satisfies Meta<typeof CookingReference>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const Ready: Story = {
  args: { imageUrl: "/images/cooking-prep-photo.webp", status: "ready" },
};

export const Failed: Story = { args: { status: "error" } };

export const BrokenImage: Story = {
  args: { imageUrl: "/images/missing-reference.webp", status: "ready" },
};
