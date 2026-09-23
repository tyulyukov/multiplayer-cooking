import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { QuestionInput } from "@/features/chat/lib/question";

import { QuestionCard, QuestionSummary } from "./question-card";

const input = {
  questions: [
    {
      id: "spicy",
      question: "Наскільки гострою має бути страва?",
      options: [
        { id: "mild", label: "Не гостра" },
        { id: "medium", label: "Помірно гостра" },
        { id: "hot", label: "Гостра" },
      ],
      allowMultiple: false,
      allowCustom: true,
    },
    {
      id: "ingredients",
      question: "Які овочі використати?",
      options: [
        { id: "tomatoes", label: "Помідори" },
        { id: "pepper", label: "Перець" },
        { id: "carrot", label: "Морква" },
      ],
      allowMultiple: true,
      allowCustom: false,
    },
  ],
} satisfies QuestionInput;

const meta = {
  title: "Features/Chat/QuestionCard",
  component: QuestionCard,
  tags: ["autodocs"],
  args: { input, pending: false, onSubmit: fn() },
  argTypes: { input: { control: false } },
  render: (args) => (
    <div className="w-[min(30rem,calc(100vw-2rem))]">
      <QuestionCard {...args} />
    </div>
  ),
} satisfies Meta<typeof QuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstQuestion: Story = {};

export const Pending: Story = { args: { pending: true } };

export const SingleQuestion: Story = {
  args: { input: { questions: [input.questions[0]] } },
};

export const MultipleChoices: Story = {
  args: { input: { questions: [input.questions[1]] } },
};

export const Answered: Story = {
  render: () => (
    <div className="w-[min(30rem,calc(100vw-2rem))]">
      <QuestionSummary
        input={input}
        answer={{
          answers: [
            { questionId: "spicy", selected: ["Помірно гостра"] },
            { questionId: "ingredients", selected: ["Помідори", "Перець"] },
          ],
        }}
      />
    </div>
  ),
};
