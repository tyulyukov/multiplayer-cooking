import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors, radii } from "@multiplayer-cooking/theme";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { entering, exiting } from "@/shared/lib/motion";
import { Composer, ComposerDock } from "@/shared/ui/composer";
import { EmptyState } from "@/shared/ui/empty-state";
import { GlassSurface } from "@/shared/ui/glass-surface";
import { InkTag } from "@/shared/ui/ink-tag";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { PhotoStrip } from "@/shared/ui/photo-strip";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Skeleton } from "@/shared/ui/skeleton";
import { Markdown } from "@/shared/ui/markdown";
import { Text } from "@/shared/ui/text";

import type { HelperChatModel } from "../model/use-helper-chat";
import { HelperProposalCard } from "./helper-proposal";

const suggestions = ["Хочу замінити інгредієнт", "Як зрозуміти, що готово?"];

type HelperChatProps = { model: HelperChatModel };

export function HelperChat({ model }: HelperChatProps) {
  const insets = useSafeAreaInsets();
  const [dockHeight, setDockHeight] = useState(0);

  const {
    feedRef,
    following,
    onEndVisible,
    onDragBegin,
    onDragEnd,
    onContentSizeChange,
    onLayout,
    jumpToEnd,
  } = useFeedFollow();

  const latestAt = model.entries.at(-1)?.createdAt ?? 0;

  const markSeen = useEffectEvent(() => model.markSeen());

  useEffect(() => {
    if (following && model.loaded) markSeen();
  }, [following, model.loaded, latestAt]);

  const status = model.busy
    ? model.pending
      ? "Зберігаємо…"
      : "Помічник готує відповідь…"
    : model.uploading
      ? "Додаємо фото…"
      : null;

  const errorMessage = !model.online
    ? "Немає з’єднання. Повідомлення можна надіслати, коли воно відновиться."
    : (model.error ??
      (model.attachmentError
        ? "Фото не додалося. Прибери його та спробуй додати ще раз."
        : model.helperError
          ? "Помічник не відповів. Спробуй надіслати повідомлення ще раз."
          : null));

  const showRetry = Boolean(model.helperError) && model.canRetry && !model.finished;

  return (
    <View style={styles.chat}>
      <KeyboardChatScrollView
        ref={feedRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        keyboardLiftBehavior="whenAtEnd"
        offset={insets.bottom}
        onEndVisible={onEndVisible}
        onScrollBeginDrag={onDragBegin}
        onScrollEndDrag={onDragEnd}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        accessibilityLabel="Розмова з помічником"
        contentContainerStyle={{ paddingBottom: dockHeight + insets.bottom + 24 }}
      >
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.feed}>
          {model.loaded ? null : <FeedSkeleton />}
          {model.loaded && model.entries.length === 0 ? (
            <View style={styles.empty}>
              <EmptyState
                illustration="helper-ladle"
                size={80}
                message={`${
                  model.context
                    ? `Допоможу з кроком «${model.context.title}».`
                    : "Допоможу під час готування."
                } Запитай, що незрозуміло, або покажи фото.`}
              />
              {model.finished ? null : (
                <View style={styles.suggestions}>
                  {suggestions.map((text) => (
                    <InkTag
                      key={text}
                      label={text}
                      haptic="selection"
                      onPress={() => model.setPrompt(text)}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
          {model.entries.map((entry) =>
            entry.kind === "message" ? (
              <HelperMessage key={entry.value._id} message={entry.value} />
            ) : model.plan ? (
              <HelperProposalCard
                key={entry.value._id}
                proposal={entry.value}
                currentPlan={model.plan}
                disabled={model.disabled || model.finished || model.helperBusy}
                onApprove={() => model.approve(entry.value._id)}
                onReject={() => model.reject(entry.value._id)}
              />
            ) : null,
          )}
          {status ? (
            <Animated.View
              entering={entering.fadeIn}
              exiting={exiting.fadeOut}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              style={styles.status}
            >
              <ShimmerText text={status} />
            </Animated.View>
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
          {errorMessage ? (
            <InlineAlert
              message={errorMessage}
              onRetry={
                showRetry
                  ? () => {
                      jumpToEnd();
                      model.retry();
                    }
                  : undefined
              }
              retrying={showRetry && model.busy}
            />
          ) : null}
          {model.finished ? (
            <GlassSurface style={styles.finished}>
              <Text variant="meta" color={colors.mutedForeground} style={styles.finishedText}>
                Готування завершено. Розмова збережена тут.
              </Text>
            </GlassSurface>
          ) : (
            <Composer
              mode="helper"
              value={model.prompt}
              busy={model.busy || !model.online || !model.loaded}
              attachments={model.attachments.items}
              onChange={model.setPrompt}
              onSubmit={(text) => {
                jumpToEnd();
                void model.send(text);
              }}
              onAttach={(source) => void model.attachments.add(source)}
              onRemoveAttachment={model.attachments.remove}
            />
          )}
        </View>
      </ComposerDock>
    </View>
  );
}

type Message = Extract<HelperChatModel["entries"][number], { kind: "message" }>["value"];

function HelperMessage({ message }: { message: Message }) {
  const photos = message.attachmentUrls ?? [];

  if (message.role === "assistant") {
    return (
      <View style={styles.assistant}>
        <Text variant="label" color={colors.tealDeep}>
          Помічник
        </Text>
        <View style={styles.markdown}>
          <Markdown text={message.text} noImages />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.user}>
      <Text variant="label" color={colors.mutedForeground} style={styles.author}>
        {message.authorName ?? "Кухар"}
      </Text>
      <View style={styles.bubble}>
        <PhotoStrip urls={photos} alt="Фото з кухні" size={88} />
        {message.text ? (
          <Text color={colors.card} selectable>
            {message.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Live follow: the feed sticks to the end while replies arrive, until the person scrolls up.
function useFeedFollow() {
  const ref = useRef<Animated.ScrollView>(null);
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const dragging = useRef(false);
  const settled = useRef(false);
  const size = useRef({ content: 0, viewport: 0 });

  const follow = (value: boolean) => {
    followingRef.current = value;
    setFollowing(value);
  };

  const toEnd = (animated: boolean) => {
    const { content, viewport } = size.current;

    if (viewport === 0 || content <= viewport) return;
    ref.current?.scrollToEnd({ animated });
  };

  return {
    feedRef: ref,
    following,
    onLayout: (event: LayoutChangeEvent) => {
      size.current.viewport = event.nativeEvent.layout.height;

      if (followingRef.current) toEnd(false);
    },
    onDragBegin: () => {
      dragging.current = true;
    },
    onDragEnd: () => {
      dragging.current = false;
    },
    onEndVisible: (visible: boolean) => {
      if (visible) follow(true);
      else if (dragging.current) follow(false);
    },
    onContentSizeChange: (_width: number, height: number) => {
      size.current.content = height;

      if (!followingRef.current) return;
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
      <ShimmerText text="Завантажуємо розмову…" />
      <Skeleton width="62%" height={48} style={styles.skeletonMine} />
      <Skeleton width="86%" height={112} />
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { flex: 1 },
  feed: { gap: 12, paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", gap: 4, paddingTop: 24 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  assistant: {
    gap: 6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.card,
  },
  markdown: { marginBottom: -10 },
  user: { alignSelf: "flex-end", maxWidth: "88%", gap: 4 },
  author: { alignSelf: "flex-end" },
  bubble: {
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderBottomRightRadius: 4,
    backgroundColor: colors.foreground,
  },
  status: { minHeight: 32, justifyContent: "center" },
  dock: { gap: 8 },
  finished: { borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 },
  finishedText: { textAlign: "center" },
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
