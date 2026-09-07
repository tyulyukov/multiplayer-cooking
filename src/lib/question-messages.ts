import type { UIMessage } from "@convex-dev/agent";
import type { ToolUIPart } from "ai";
import { readQuestionAnswer, readQuestionInput, type QuestionAnswer } from "./question";

export function isToolPart(part: UIMessage["parts"][number]): part is ToolUIPart {
  return part.type.startsWith("tool-");
}

// Tool results saved later live in their own message; map them back by call id.
export function collectAnswers(messages: readonly UIMessage[]) {
  const answers = new Map<string, QuestionAnswer>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (isToolPart(part) && part.type === "tool-ask_user" && "output" in part) {
        const answer = readQuestionAnswer(part.output);

        if (answer) {
          answers.set(part.toolCallId, answer);
        }
      }
    }
  }

  return answers;
}

export function pendingQuestion(messages: readonly UIMessage[]) {
  const answers = collectAnswers(messages);
  const latest = messages.filter((message) => message.role === "assistant").at(-1);
  if (!latest || latest.status === "failed") return null;
  for (const part of latest.parts) {
    if (
      !isToolPart(part) ||
      part.type !== "tool-ask_user" ||
      part.state !== "input-available" ||
      answers.has(part.toolCallId)
    )
      continue;
    const input = readQuestionInput(part.input);
    if (input) return { toolCallId: part.toolCallId, input };
  }
  return null;
}
