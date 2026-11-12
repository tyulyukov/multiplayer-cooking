import type { UIMessage } from "@convex-dev/agent";
import type { FunctionArgs } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type QuestionResponse = FunctionArgs<typeof api.chat.answerQuestion>["answer"];

export type ChatMessage = UIMessage;

export type QuestionSubmit = (toolCallId: string, answer: QuestionResponse) => void;
