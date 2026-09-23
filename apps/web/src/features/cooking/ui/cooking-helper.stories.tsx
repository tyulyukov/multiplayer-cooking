import type { FC } from "react";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn, screen } from "storybook/test";

import { useAttachments } from "@/shared/hooks/use-attachments";

import type { CookingHelperProps } from "../model/helper-types";
import { storyNow, storyPlan } from "../testing/fixtures";
import { CookingHelper } from "./cooking-helper";

type HelperStoryArgs = Omit<CookingHelperProps, "attachments">;

const InteractiveHelper: FC<HelperStoryArgs> = (args) => {
  const attachments = useAttachments(null);
  const [open, setOpen] = useState(args.open);
  const [prompt, setPrompt] = useState(args.prompt);

  return (
    <CookingHelper
      {...args}
      attachments={attachments}
      open={open}
      prompt={prompt}
      onOpenChange={(next) => {
        setOpen(next);
        args.onOpenChange(next);
      }}
      onPromptChange={(next) => {
        setPrompt(next);
        args.onPromptChange(next);
      }}
    />
  );
};

const message = {
  _id: "story-helper-message",
  role: "user",
  text: "Як зрозуміти, що овочі готові?",
  createdAt: storyNow - 60_000,
  authorName: "Аня",
} satisfies CookingHelperProps["messages"][number];

const reply = {
  _id: "story-helper-reply",
  role: "assistant",
  text: "Овочі мають стати м’якими, але не втратити форму.",
  createdAt: storyNow - 30_000,
} satisfies CookingHelperProps["messages"][number];

const note = {
  _id: "story-note" as Id<"cookingNotes">,
  authorMemberId: "story-host" as Id<"cookingMembers">,
  text: "Марко не любить гостре.",
  createdAt: storyNow - 120_000,
  canDelete: true,
} satisfies CookingHelperProps["notes"][number];

const proposal = {
  _id: "story-proposal" as Id<"cookingProposals">,
  authorMemberId: "story-host" as Id<"cookingMembers">,
  status: "open",
  planVersion: 1,
  preview: "Можна додати трохи більше помідорів і пропустити перець.",
  plan: {
    ...storyPlan,
    ingredients: storyPlan.ingredients.filter((item) => item.id !== "pepper"),
  },
  affectedStepKeys: ["fry"],
  selectedStepKey: undefined,
  selectedStepStatus: undefined,
  selectedStepCheckedIds: undefined,
  approvedBy: undefined,
  resolvedAt: undefined,
  createdAt: storyNow - 20_000,
} satisfies CookingHelperProps["proposals"][number];

const meta = {
  title: "Features/Cooking/Helper",
  component: InteractiveHelper,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    plan: storyPlan,
    contextStepKey: "fry",
    onContextChange: fn(),
    messages: [],
    proposals: [],
    notes: [],
    loaded: true,
    helperBusy: false,
    open: true,
    onOpenChange: fn(),
    prompt: "",
    onPromptChange: fn(),
    online: true,
    finished: false,
    onAsk: fn(async () => undefined),
    onRetry: fn(async () => undefined),
    onApprove: fn(async () => true),
    onReject: fn(async () => true),
    onNote: fn(async () => undefined),
    onDeleteNote: fn(async () => true),
  },
  argTypes: {
    plan: { control: false },
    messages: { control: false },
    proposals: { control: false },
    notes: { control: false },
  },
  render: (args) => <InteractiveHelper key={`${args.open}:${args.prompt}`} {...args} />,
} satisfies Meta<HelperStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {};

export const Conversation: Story = {
  args: { messages: [message, reply] },
};

export const Responding: Story = {
  args: { messages: [message], helperBusy: true },
};

export const SuggestedChange: Story = {
  args: { messages: [message], proposals: [proposal] },
};

export const Failed: Story = {
  args: { messages: [message], helperError: "Помічник не відповів. Спробуй ще раз." },
};

export const Notes: Story = {
  args: { notes: [note] },
  play: async ({ userEvent }) => {
    await userEvent.click(await screen.findByRole("button", { name: /Нотатки/ }));
  },
};

export const Closed: Story = { args: { open: false } };
