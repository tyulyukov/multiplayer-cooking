import type { Meta, StoryObj } from "@storybook/react-vite";

import { cookingActions, cookingRoomFixture } from "../testing/fixtures";
import { CookingLobby } from "./cooking-lobby";

const fullRoom = cookingRoomFixture({
  room: { state: "ready", lobbyCompletedAt: undefined },
  steps: [],
  timers: [],
});

const meta = {
  title: "Features/Cooking/Lobby",
  component: CookingLobby,
  tags: ["autodocs"],
  args: { data: fullRoom, actions: cookingActions },
  argTypes: { data: { control: false }, actions: { control: false } },
  render: (args) => (
    <div className="w-[min(30rem,calc(100vw-2rem))]">
      <CookingLobby {...args} />
    </div>
  ),
} satisfies Meta<typeof CookingLobby>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyToStart: Story = {};

export const WaitingForCook: Story = {
  args: {
    data: cookingRoomFixture({
      room: fullRoom.room,
      members: [fullRoom.me],
      steps: [],
      timers: [],
    }),
  },
};

export const Guest: Story = {
  args: {
    data: cookingRoomFixture({
      room: fullRoom.room,
      me: fullRoom.members[1]!,
      steps: [],
      timers: [],
    }),
  },
};

export const PlanFailed: Story = {
  args: {
    data: cookingRoomFixture({
      room: {
        state: "error",
        lobbyCompletedAt: undefined,
        plan: undefined,
        generationError: "Не вдалося скласти план. Спробуй ще раз.",
      },
      steps: [],
      timers: [],
    }),
  },
};

export const Solo: Story = {
  args: {
    data: cookingRoomFixture({
      room: { state: "generating", cookCount: 1, lobbyCompletedAt: undefined, plan: undefined },
      members: [fullRoom.me],
      steps: [],
      timers: [],
    }),
  },
};

export const TwelveCooks: Story = {
  args: {
    data: cookingRoomFixture({
      room: { state: "ready", cookCount: 12, lobbyCompletedAt: undefined },
      steps: [],
      timers: [],
    }),
  },
};
