import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { collectAnswers, pendingQuestion } from "@multiplayer-cooking/core/chat/question-messages";
import type { QuestionResponse } from "@multiplayer-cooking/core/chat/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { router, Stack, useIsFocused } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useActiveThread, useThreadMessages } from "@/features/chat/api/use-chat";
import { useThreadIdeas } from "@/features/chat/api/use-thread-ideas";
import { glassHeaderOptions } from "@/features/chat/lib/header-options";
import { useChatComposer } from "@/features/chat/model/use-chat-composer";
import { useChatHaptics } from "@/features/chat/model/use-chat-haptics";
import { useOffline } from "@/shared/hooks/use-offline";
import { AccountToolbar } from "@/features/silpo/ui/account-toolbar";
import { AddressPrompt } from "@/features/silpo/ui/address-prompt";
import { haptics } from "@/shared/lib/haptics";
import { entering, exiting } from "@/shared/lib/motion";
import { Composer, ComposerDock } from "@/shared/ui/composer";
import { GlassSurface } from "@/shared/ui/glass-surface";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { Skeleton } from "@/shared/ui/skeleton";

import { AssistantMessage, UserMessage } from "./chat-message";
import { IdeaPeek } from "./idea-peek";
import { QuestionCard } from "./question-card";
import { WorkingRow } from "./working-row";

// Leaving Chat starts a new conversation (see useChatNavigation), so the left item says so.
const chatHeaderOptions = { ...glassHeaderOptions, headerBackVisible: false };

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const offline = useOffline();
  const [sessionId] = useSessionId();
  const active = useActiveThread();
  const threadId = active?.threadId;
  const { messages, loading, agentWorking } = useThreadMessages(threadId);
  const composer = useChatComposer(active === undefined ? undefined : threadId);
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const ideas = useThreadIdeas(threadId);
  const idea = ideas?.at(-1) ?? null;
  const [answering, setAnswering] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dismissedQuestion, setDismissedQuestion] = useState<string | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const working = composer.sending || answering || retrying || agentWorking;
  const question = pendingQuestion(messages);
  const answers = collectAnswers(messages);
  const latest = messages.at(-1);

  const showAddressPrompt =
    Boolean(idea) &&
    Boolean(connection) &&
    !connection?.hasCart &&
    (connection?.cartPending ||
      Boolean(connection?.cartError) ||
      (!working &&
        latest?.role === "assistant" &&
        latest.status === "success" &&
        idea?.productsStatus === "needs_address"));

  useChatHaptics(
    threadId,
    messages,
    !loading,
    ideas === undefined ? undefined : (idea?._id ?? null),
  );

  // The thread was deleted or replaced elsewhere: go back to Home.
  useEffect(() => {
    if (focused && active === null && router.canGoBack()) router.back();
  }, [focused, active]);

  const answer = async (toolCallId: string, value: QuestionResponse) => {
    setAnswering(true);
    composer.setError(null);

    try {
      const result = await composer.actions.answerQuestion(toolCallId, value);

      if (result && !result.ok) {
        haptics.error();
        composer.setError(result.message);
      }
    } catch {
      haptics.error();
      composer.setError("Не вдалося надіслати відповідь. Спробуй ще раз.");
    } finally {
      setAnswering(false);
    }
  };

  const retry = async () => {
    setRetrying(true);
    composer.setError(null);

    try {
      const result = await composer.actions.retry();

      if (result && !result.ok) {
        haptics.error();
        composer.setError(result.message);
      }
    } catch {
      haptics.error();
      composer.setError("Не вдалося повторити запит. Спробуй ще раз.");
    } finally {
      setRetrying(false);
    }
  };

  const {
    feedRef,
    following,
    onEndVisible,
    onDragBegin,
    onDragEnd,
    onContentSizeChange,
    onLayout,
    onFeedLayout,
    onReplyLayout,
    jumpToEnd,
  } = useFeedFollow(
    latest?.role === "assistant" && (latest.status === "streaming" || latest.status === "pending")
      ? latest.key
      : null,
  );

  return (
    <>
      <Stack.Screen options={chatHeaderOptions} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          accessibilityLabel="Нова розмова"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <AccountToolbar />
      <KeyboardChatScrollView
        ref={feedRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        keyboardLiftBehavior="whenAtEnd"
        offset={insets.bottom}
        onEndVisible={onEndVisible}
        onScrollBeginDrag={onDragBegin}
        onScrollEndDrag={onDragEnd}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        contentContainerStyle={{ paddingBottom: dockHeight + insets.bottom + 24 }}
      >
        {offline ? (
          <OfflineBanner message="Немає зв’язку. Повідомлення надішлеться після підключення." />
        ) : null}
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          onLayout={onFeedLayout}
          style={styles.feed}
        >
          {loading ? <FeedSkeleton /> : null}
          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessage key={message.key} message={message} />
            ) : (
              <AssistantMessage
                key={message.key}
                message={message}
                answers={answers}
                onLayout={
                  message === latest ? (event) => onReplyLayout(message.key, event) : undefined
                }
                onRetry={
                  message === latest && !working && !offline
                    ? () => {
                        jumpToEnd();
                        void retry();
                      }
                    : undefined
                }
              />
            ),
          )}
          {question && question.toolCallId !== dismissedQuestion ? (
            <Animated.View entering={entering.morph} exiting={exiting.fadeOut}>
              <QuestionCard
                key={question.toolCallId}
                input={question.input}
                pending={answering || working}
                onSubmit={(value) => void answer(question.toolCallId, value)}
                onDismiss={() => setDismissedQuestion(question.toolCallId)}
              />
            </Animated.View>
          ) : null}
          {working ? <WorkingRow messages={messages} /> : null}
          {showAddressPrompt && connection ? (
            <AddressPrompt pending={connection.cartPending} cartError={connection.cartError} />
          ) : null}
        </Pressable>
      </KeyboardChatScrollView>
      <ComposerDock onHeightChange={setDockHeight}>
        {following ? null : (
          <Animated.View entering={entering.float} exiting={exiting.fadeOut} style={styles.jump}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="До останнього повідомлення"
              onPress={jumpToEnd}
              hitSlop={4}
            >
              <GlassSurface interactive style={styles.jumpCircle}>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={20}
                  color={colors.foreground}
                  strokeWidth={1.5}
                />
              </GlassSurface>
            </Pressable>
          </Animated.View>
        )}
        <View style={styles.dock}>
          {composer.error ? <InlineAlert message={composer.error} /> : null}
          {idea && threadId ? (
            <IdeaPeek
              idea={idea}
              onOpen={() =>
                router.push({ pathname: "/idea", params: { threadId, ideaId: idea._id } })
              }
            />
          ) : null}
          <Composer
            mode="chat"
            value={composer.draft.request}
            busy={working}
            disabled={offline}
            attachments={composer.attachments.items}
            onChange={composer.draft.change}
            onSubmit={(text) => {
              jumpToEnd();
              void composer.submit(text);
            }}
            onAttach={(source) => void composer.attachments.add(source)}
            onRemoveAttachment={composer.attachments.remove}
          />
        </View>
      </ComposerDock>
    </>
  );
}

// Live follow: the feed sticks to the end while replies stream, until the person scrolls up.
// A new reply is followed only until its first line reaches the top, so its start stays readable.
function useFeedFollow(streamingKey: string | null) {
  const ref = useRef<Animated.ScrollView>(null);
  const headerHeight = useHeaderHeight();
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const dragging = useRef(false);
  const settled = useRef(false);
  const size = useRef({ content: 0, viewport: 0 });
  const feedTop = useRef(0);
  const reply = useRef({ key: "", top: 0 });
  const liveKey = useRef<string | null>(null);
  const streaming = useRef<string | null>(null);
  const pinnedKey = useRef<string | null>(null);

  useEffect(() => {
    streaming.current = streamingKey;

    if (streamingKey) liveKey.current = streamingKey;
  }, [streamingKey]);

  const follow = (value: boolean) => {
    followingRef.current = value;
    setFollowing(value);
  };

  // iOS `scrollToEnd` clamps to offset 0 and ignores the header inset, so a feed shorter than
  // the screen would slide under the glass header. Only scroll once the content overflows.
  const toEnd = (animated: boolean) => {
    const { content, viewport } = size.current;

    if (viewport === 0 || content <= viewport - headerHeight) return;
    ref.current?.scrollToEnd({ animated });
  };

  return {
    feedRef: ref,
    following,
    onLayout: (event: LayoutChangeEvent) => {
      size.current.viewport = event.nativeEvent.layout.height;
    },
    onFeedLayout: (event: LayoutChangeEvent) => {
      feedTop.current = event.nativeEvent.layout.y;
    },
    onReplyLayout: (key: string, event: LayoutChangeEvent) => {
      reply.current = { key, top: event.nativeEvent.layout.y };
    },
    onDragBegin: () => {
      dragging.current = true;
    },
    onDragEnd: () => {
      dragging.current = false;
    },
    // The pin leaves the end within the list's "at end" threshold; only the person's own scroll
    // re-arms follow while the pinned reply still streams.
    onEndVisible: (visible: boolean) => {
      if (visible && (dragging.current || pinnedKey.current !== streaming.current)) follow(true);
      else if (!visible && dragging.current) follow(false);
    },
    onContentSizeChange: (_width: number, height: number) => {
      size.current.content = height;

      if (!followingRef.current) return;
      const { key, top } = reply.current;
      const replyStart = feedTop.current + top - headerHeight - 12;

      if (
        key === liveKey.current &&
        key !== pinnedKey.current &&
        height - size.current.viewport > replyStart
      ) {
        pinnedKey.current = key;
        follow(false);
        ref.current?.scrollTo({ y: replyStart, animated: true });

        return;
      }

      toEnd(settled.current);
      settled.current = true;
    },
    jumpToEnd: () => {
      follow(true);
      toEnd(true);
    },
  };
}

function FeedSkeleton() {
  return (
    <View style={styles.skeletons}>
      <Skeleton width="62%" height={48} style={styles.skeletonMine} />
      <Skeleton width="86%" height={120} />
      <Skeleton width="74%" height={72} />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  dock: { gap: 8 },
  jump: { position: "absolute", bottom: "100%", alignSelf: "center", marginBottom: 12 },
  jumpCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletons: { gap: 12 },
  skeletonMine: { alignSelf: "flex-end" },
});
