import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, waitFor } from "storybook/test";

import type { QuestionInput } from "@/features/chat/lib/question";

import { QuestionCard } from "./question-card";
import { QuestionSummary } from "./question-summary";

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
    <div className="w-full max-w-lg">
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
    <div className="w-full max-w-lg">
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

export const CustomAndMultipleAnswers: Story = {
  play: async ({ args, canvas, userEvent }) => {
    fireEvent.input(canvas.getByRole("textbox", { name: /Свій варіант/ }), {
      target: { value: "  Без перцю  " },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Далі" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: /Помідори/ }));
    await userEvent.click(canvas.getByRole("checkbox", { name: /Перець/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Назад" }));
    await expect(canvas.getByRole("textbox", { name: /Свій варіант/ })).toHaveValue(
      "  Без перцю  ",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Далі" }));
    await userEvent.click(canvas.getByRole("button", { name: "Надіслати" }));
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({
        answers: [
          { questionId: "spicy", optionIds: [], custom: "Без перцю" },
          { questionId: "ingredients", optionIds: ["tomatoes", "pepper"], custom: undefined },
        ],
      }),
    );
  },
};

export const AutoSubmitSingleChoice: Story = {
  args: { input: { questions: [input.questions[0]] } },
  play: async ({ args, canvas }) => {
    // A pointer click has detail > 0; keyboard selection deliberately does not auto-advance.
    fireEvent.click(canvas.getByRole("radio", { name: /Не гостра/ }), { detail: 1 });
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({
        answers: [{ questionId: "spicy", optionIds: ["mild"], custom: undefined }],
      }),
    );
  },
};
