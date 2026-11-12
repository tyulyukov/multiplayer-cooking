import type { UIMessage } from "@convex-dev/agent";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { questionInputSchema, type QuestionAnswer } from "@multiplayer-cooking/core/chat/question";
import { isToolPart } from "@multiplayer-cooking/core/chat/question-messages";
import { isMemoryEvent } from "@multiplayer-cooking/core/personalization/memory-event";
import { colors, radii } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { Button } from "@/shared/ui/button";
import { PhotoStrip } from "@/shared/ui/photo-strip";
import { Text } from "@/shared/ui/text";

import { AssistantText } from "./assistant-text";

const imageUrls = (message: UIMessage) => {
  return message.parts.flatMap((part) =>
    part.type === "file" && part.mediaType.startsWith("image/") ? [part.url] : [],
  );
};

const memoryEvents = (message: UIMessage) => {
  return message.parts
    .filter(isToolPart)
    .flatMap((part) =>
      (part.type === "tool-add_memory" || part.type === "tool-remove_memory") &&
      part.state === "output-available" &&
      isMemoryEvent(part.output)
        ? [{ action: part.output.action, text: part.output.text, toolCallId: part.toolCallId }]
        : [],
    );
};

const answeredQuestions = (message: UIMessage, answers: ReadonlyMap<string, QuestionAnswer>) => {
  return message.parts.filter(isToolPart).flatMap((part) => {
    if (part.type !== "tool-ask_user") return [];
    const input = questionInputSchema.safeParse(part.input).data;
    const answer = answers.get(part.toolCallId);

    return input && answer ? [{ toolCallId: part.toolCallId, input, answer }] : [];
  });
};

export function UserMessage({ message }: { message: UIMessage }) {
  const photos = imageUrls(message);
  const text = message.text.trim();

  return (
    <View style={styles.userBubble}>
      <PhotoStrip urls={photos} alt="Фото від тебе" size={88} />
      {text ? (
        <Text color={colors.card} selectable>
          {text}
        </Text>
      ) : null}
    </View>
  );
}

type AssistantMessageProps = {
  message: UIMessage;
  answers: ReadonlyMap<string, QuestionAnswer>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onRetry?: () => void;
};

export function AssistantMessage({ message, answers, onLayout, onRetry }: AssistantMessageProps) {
  const memories = memoryEvents(message);
  const questions = answeredQuestions(message, answers);
  const text = message.text.trim();
  const failed = message.status === "failed";

  if (memories.length === 0 && questions.length === 0 && !text && !failed) return null;

  return (
    <View onLayout={onLayout} style={styles.assistant}>
      {questions.map(({ toolCallId, input, answer }) => (
        <View key={toolCallId} accessibilityLabel="Твої відповіді" style={styles.summary}>
          <Text variant="label" color={colors.mutedForeground}>
            Твої відповіді
          </Text>
          {input.questions.map((question) => {
            const value = answer.answers.find((item) => item.questionId === question.id);

            if (!value) return null;

            return (
              <View key={question.id} style={styles.summaryItem}>
                <Text variant="meta" color={colors.mutedForeground}>
                  {question.question}
                </Text>
                <Text variant="secondary">
                  {[...value.selected, ...(value.custom ? [value.custom] : [])].join(", ")}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      {memories.map((memory) => (
        <Button
          key={memory.toolCallId}
          variant="tag"
          label={`${memory.action === "added" ? "Запам’ятав" : "Забув"}: ${memory.text}`}
          accessibilityHint="Переглянути спогади"
          trailing={
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              color={colors.tealDeep}
              strokeWidth={1.5}
            />
          }
          onPress={() => router.push({ pathname: "/settings", params: { tab: "memories" } })}
          style={styles.memory}
        />
      ))}
      {text || failed ? (
        <View style={styles.card}>
          {text ? (
            <AssistantText
              text={text}
              streaming={message.status === "streaming"}
              createdAt={message._creationTime}
            />
          ) : null}
          {failed ? (
            <Text color={colors.destructive}>
              {onRetry
                ? "Відповідь не вдалася."
                : "Відповідь не вдалася. Спробуй надіслати ще раз."}
            </Text>
          ) : null}
          {failed && onRetry ? (
            <Button
              variant="ghost"
              compact
              icon={RefreshIcon}
              label="Спробувати ще раз"
              haptic="send"
              onPress={onRetry}
              style={styles.retry}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderBottomRightRadius: 4,
    backgroundColor: colors.foreground,
  },
  assistant: { gap: 8, alignItems: "flex-start" },
  card: {
    alignSelf: "stretch",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.card,
  },
  summary: {
    alignSelf: "stretch",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    backgroundColor: colors.muted,
  },
  summaryItem: { gap: 2 },
  memory: { maxWidth: "100%" },
  retry: { alignSelf: "flex-start" },
});
