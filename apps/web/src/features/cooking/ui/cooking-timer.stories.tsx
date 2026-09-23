import type { Meta, StoryObj } from "@storybook/react-vite";

import { cookingActions, storyNow, storyTimer } from "../testing/fixtures";
import { Timer } from "./cooking-timer";

const meta = {
  title: "Features/Cooking/Timer",
  component: Timer,
  tags: ["autodocs"],
  args: { timer: storyTimer, now: storyNow, disabled: false, actions: cookingActions },
  argTypes: { timer: { control: false }, actions: { control: false } },
  render: (args) => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <Timer {...args} />
    </div>
  ),
} satisfies Meta<typeof Timer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {};

export const Ready: Story = {
  args: { timer: { ...storyTimer, status: "ready", deadline: undefined } },
};

export const Paused: Story = {
  args: { timer: { ...storyTimer, status: "paused", deadline: undefined, remainingMs: 155_000 } },
};

export const Fired: Story = {
  args: { timer: { ...storyTimer, status: "fired", deadline: storyNow - 1_000 } },
};

export const Cancelled: Story = {
  args: {
    timer: { ...storyTimer, status: "cancelled", deadline: undefined, remainingMs: 130_000 },
  },
};

export const Acknowledged: Story = {
  args: { timer: { ...storyTimer, status: "acknowledged", deadline: undefined, remainingMs: 0 } },
};

export const Disabled: Story = { args: { disabled: true } };
