import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { AddressPrompt } from "./address-prompt";

const meta = {
  title: "Features/Сільпо/AddressPrompt",
  component: AddressPrompt,
  tags: ["autodocs"],
  args: { pending: false, error: null, onSubmit: fn() },
  render: (args) => (
    <div className="w-[min(30rem,calc(100vw-2rem))]">
      <AddressPrompt {...args} />
    </div>
  ),
} satisfies Meta<typeof AddressPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Місто, вулиця, будинок" }),
      "Одеса, пров. Семафорний, 4",
    );
  },
};

export const Saving: Story = { args: { pending: true } };

export const Error: Story = {
  args: { error: "Адресу не вдалося зберегти. Спробуй ще раз." },
};
