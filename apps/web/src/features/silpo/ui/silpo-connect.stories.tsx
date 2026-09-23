import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ConnectCard } from "./silpo-connect";

const meta = {
  title: "Features/Сільпо/ConnectCard",
  component: ConnectCard,
  tags: ["autodocs"],
  args: { busy: false, onConnect: fn() },
  render: (args) => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <ConnectCard {...args} />
    </div>
  ),
} satisfies Meta<typeof ConnectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Connecting: Story = { args: { busy: true } };
