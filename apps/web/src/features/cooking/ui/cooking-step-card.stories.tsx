import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  cookingActions,
  cookingRoomFixture,
  storyNow,
  storyPlan,
  storyTimer,
} from "../testing/fixtures";
import { StepCard } from "./cooking-step-card";

const data = cookingRoomFixture();

const meta = {
  title: "Features/Cooking/StepCard",
  component: StepCard,
  tags: ["autodocs"],
  args: {
    step: storyPlan.steps[1],
    runtime: data.steps[1],
    data,
    timers: [storyTimer],
    now: storyNow,
    actions: cookingActions,
    expanded: true,
    primary: true,
    index: 2,
    onExpand: fn(),
    onAdvance: fn(),
  },
  argTypes: {
    step: { control: false },
    runtime: { control: false },
    data: { control: false },
    timers: { control: false },
    actions: { control: false },
  },
  render: (args) => (
    <div className="w-[min(38rem,calc(100vw-2rem))]">
      <StepCard {...args} />
    </div>
  ),
} satisfies Meta<typeof StepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Collapsed: Story = { args: { expanded: false } };

export const Completed: Story = {
  args: {
    step: storyPlan.steps[0],
    runtime: data.steps[0],
    timers: [],
    primary: false,
    index: 1,
  },
};

export const Blocked: Story = {
  args: {
    step: storyPlan.steps[2],
    runtime: data.steps[2],
    timers: [],
    primary: false,
    index: 3,
  },
};

const sharedRoom = cookingRoomFixture({
  steps: data.steps.map((item) =>
    item.stepKey === "fry"
      ? { ...item, status: "done", checkedIds: ["heat", "add"] }
      : item.stepKey === "serve"
        ? { ...item, status: "waiting", readyMemberIds: [data.me._id] }
        : item,
  ),
  timers: [],
});

export const WaitingForPartner: Story = {
  args: {
    step: storyPlan.steps[2],
    runtime: sharedRoom.steps[2],
    data: sharedRoom,
    timers: [],
    primary: true,
    index: 3,
  },
};
