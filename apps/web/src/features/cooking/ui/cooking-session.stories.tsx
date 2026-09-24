import type { Meta, StoryObj } from "@storybook/react-vite";

import { cookingActions, cookingRoomFixture, storyNow } from "../testing/fixtures";
import { CookingSession } from "./cooking-session";

const activeRoom = cookingRoomFixture();

const meta = {
  title: "Features/Cooking/FullSession",
  component: CookingSession,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { data: activeRoom, actions: cookingActions },
  argTypes: { data: { control: false }, actions: { control: false } },
} satisfies Meta<typeof CookingSession>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Lobby: Story = {
  args: {
    data: cookingRoomFixture({
      room: { state: "ready", lobbyCompletedAt: undefined },
      members: [activeRoom.me],
      steps: [],
      timers: [],
    }),
  },
};

export const LobbyLongTitle: Story = {
  args: {
    data: cookingRoomFixture({
      room: {
        state: "ready",
        lobbyCompletedAt: undefined,
        source: {
          ...activeRoom.room.source,
          title: "Вечеря з овочевою пастою та домашнім соусом для всієї компанії",
        },
      },
      members: [activeRoom.me],
      steps: [],
      timers: [],
    }),
  },
};

export const Generating: Story = {
  args: {
    data: cookingRoomFixture({
      room: { state: "generating", lobbyCompletedAt: storyNow, plan: undefined },
      steps: [],
      timers: [],
    }),
  },
};

export const GenerationError: Story = {
  args: {
    data: cookingRoomFixture({
      room: {
        state: "error",
        lobbyCompletedAt: storyNow,
        plan: undefined,
        generationError: "План не створився. Спробуй ще раз.",
      },
      steps: [],
      timers: [],
    }),
  },
};

export const Offline: Story = {
  args: { actions: { ...cookingActions, online: false } },
};

export const Completed: Story = {
  args: {
    data: cookingRoomFixture({
      room: { state: "done" },
      steps: activeRoom.steps.map((step) => ({
        ...step,
        status: "done" as const,
        checkedIds:
          step.stepKey === "fry"
            ? ["heat", "add"]
            : step.stepKey === "serve"
              ? ["mix"]
              : step.checkedIds,
        completedAt: storyNow,
      })),
      timers: [],
    }),
  },
};
