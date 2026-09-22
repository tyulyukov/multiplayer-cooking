import { expect, test } from "bun:test";
import type { UIMessage } from "@convex-dev/agent";
import { collectAnswers, pendingQuestion } from "./question-messages";

const input = {
  questions: [
    {
      id: "food",
      question: "Що хочеш приготувати?",
      options: [
        { id: "soup", label: "Суп" },
        { id: "pasta", label: "Паста" },
      ],
      allowMultiple: false,
      allowCustom: true,
    },
  ],
};

function message(parts: UIMessage["parts"], status: UIMessage["status"] = "success"): UIMessage {
  return {
    id: "message",
    key: "message",
    role: "assistant",
    text: "",
    order: 0,
    stepOrder: 0,
    _creationTime: 1,
    parts,
    status,
  };
}

const call = {
  type: "tool-ask_user",
  toolCallId: "question",
  state: "input-available",
  input,
} as const;

test("only a complete current question replaces the composer", () => {
  expect(pendingQuestion([message([call])])?.input.questions[0]?.id).toBe("food");
  expect(pendingQuestion([message([{ ...call, state: "input-streaming" }])])).toBeNull();
  expect(pendingQuestion([message([call], "failed")])).toBeNull();
  expect(
    pendingQuestion([message([call]), message([{ type: "text", text: "Нова відповідь" }])]),
  ).toBeNull();
});

test("a persisted answer closes the composer question and remains available for its summary", () => {
  const output = { answers: [{ questionId: "food", selected: ["Суп"] }] };
  const messages = [message([call]), message([{ ...call, state: "output-available", output }])];
  expect(pendingQuestion(messages)).toBeNull();
  expect(collectAnswers(messages).get("question")).toEqual(output);
});
