import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { CookingHistoryItem, HistoryItem } from "../model/types";
import { HistoryPanel } from "./history-panel";

const createdAt = Date.UTC(2026, 8, 23, 11, 0, 0);

const items = [
  { threadId: "story-thread", title: "Паста з овочами", createdAt, active: true, photos: [] },
  {
    threadId: "older-thread",
    title: "Суп із гарбузом",
    createdAt: createdAt - 86_400_000,
    active: false,
    photos: [],
  },
] satisfies HistoryItem[];

// SAFETY: these IDs identify local Storybook fixtures, not Convex records.
const cookingRooms = [
  {
    _id: "story-cooking-room" as Id<"cookingRooms">,
    source: { title: "Паста з овочами" },
    sourceIdeaId: "story-idea" as Id<"ideas">,
    sourceThreadId: "story-thread",
    sourceImageUrl: null,
    state: "cooking",
    requestedServings: 4,
    createdAt: createdAt + 10_000,
  },
] satisfies CookingHistoryItem[];

const meta = {
  title: "Features/History/HistoryPanel",
  component: HistoryPanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    items,
    cookingRooms: [],
    onOpen: fn(),
    onDelete: fn(),
    onOpenCooking: fn(),
  },
  argTypes: { items: { control: false }, cookingRooms: { control: false } },
} satisfies Meta<typeof HistoryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const openPanel: NonNullable<Story["play"]> = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: "Історія" }));
};

export const Conversations: Story = { play: openPanel };

export const WithCooking: Story = { args: { cookingRooms }, play: openPanel };

export const Empty: Story = { args: { items: [] }, play: openPanel };

export const Loading: Story = { args: { items: undefined }, play: openPanel };
