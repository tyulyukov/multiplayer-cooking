import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, screen } from "storybook/test";

import { CookTogether } from "./cook-together";

const openSetup: NonNullable<StoryObj<typeof meta>["play"]> = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: "Готуємо разом" }));
  await screen.findByRole("dialog", { name: "Скільки вас готує?" });
};

const meta = {
  title: "Features/Cooking/CookTogether",
  component: CookTogether,
  tags: ["autodocs"],
  args: { cookCount: 2, servings: 4, profileName: "Аня", onGenerate: fn() },
  argTypes: { onGenerate: { control: false } },
} satisfies Meta<typeof CookTogether>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trigger: Story = {};

export const Setup: Story = { play: openSetup };

export const Solo: Story = { args: { cookCount: 1, servings: 2 }, play: openSetup };

export const TwelveCooks: Story = { args: { cookCount: 12, servings: 12 }, play: openSetup };
