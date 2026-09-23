import type { FC } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { AI_REQUEST_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { QuestionCard } from "@/features/chat/ui/question-card";

import { Composer } from "./composer";
import type { ComposerProps } from "./types";

const InteractiveComposer: FC<ComposerProps> = (args) => {
  const [value, setValue] = useState(args.value);

  return (
    <div className="w-[min(40rem,calc(100vw-2rem))]">
      <Composer
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    </div>
  );
};

const meta = {
  title: "Shared/Composer",
  component: Composer,
  tags: ["autodocs"],
  args: {
    mode: "home",
    value: "",
    busy: false,
    autoFocus: false,
    attachments: [],
    onChange: fn(),
    onSubmit: fn(),
    onAttach: fn(),
    onRemoveAttachment: fn(),
  },
  argTypes: {
    mode: { control: "select", options: ["home", "chat", "helper"] },
    questionnaire: { control: false },
    attachments: { control: false },
  },
  render: (args) => <InteractiveComposer key={args.value} {...args} />,
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {};

export const Chat: Story = {
  args: {
    mode: "chat",
    value: "Додай до рецепта більше овочів",
  },
};

export const Helper: Story = {
  args: {
    mode: "helper",
    value: "Як зрозуміти, що овочі готові?",
  },
};

export const Busy: Story = {
  args: {
    mode: "home",
    value: "Паста з овочами",
    busy: true,
  },
};

export const BusyHelper: Story = {
  args: {
    mode: "helper",
    value: "Чи можна замінити перець?",
    busy: true,
  },
};

export const Attachments: Story = {
  args: {
    mode: "chat",
    value: "Що можна приготувати з цих продуктів?",
    attachments: [
      { id: "photo-ready", previewUrl: "/images/cooking-prep-photo.webp", state: "done" },
      { id: "photo-uploading", previewUrl: "/images/cooking-prep-photo.webp", state: "uploading" },
    ],
  },
};

export const AttachmentError: Story = {
  args: {
    mode: "chat",
    value: "Подивись на це фото",
    attachments: [
      { id: "photo-error", previewUrl: "/images/cooking-prep-photo.webp", state: "error" },
    ],
  },
};

export const OverLimit: Story = {
  args: {
    mode: "home",
    value: "А".repeat(AI_REQUEST_MAX_CHARACTERS + 1),
  },
};

export const Questionnaire: Story = {
  render: (args) => (
    <InteractiveComposer
      key={args.value}
      {...args}
      mode="chat"
      questionnaireKey="story-question"
      questionnaire={
        <QuestionCard
          input={{
            questions: [
              {
                id: "spicy",
                question: "Наскільки гострою має бути страва?",
                options: [
                  { id: "mild", label: "Не гостра" },
                  { id: "hot", label: "Гостра" },
                ],
                allowMultiple: false,
                allowCustom: true,
              },
            ],
          }}
          pending={false}
          onSubmit={fn()}
        />
      }
    />
  ),
};
