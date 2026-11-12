import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { AI_REQUEST_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { colors, radii } from "@multiplayer-cooking/theme";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { fonts } from "@/shared/fonts";
import { layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { ChromeBorder } from "@/shared/ui/chrome-border";
import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { GlassSurface } from "@/shared/ui/glass-surface";
import { Text } from "@/shared/ui/text";

import { ComposerAttachButton } from "./composer-attach-button";
import { ComposerAttachments } from "./composer-attachments";
import type { ComposerMode, ComposerProps } from "./types";
import { useComposer } from "./use-composer";

const placeholders = {
  home: "Опиши страву або напиши, що є вдома",
  chat: "Уточни або попроси інше",
  helper: "Запитай або додай фото…",
} satisfies Record<ComposerMode, string>;

const lineHeight = 24;

const maxLines = 6;

export function Composer(props: ComposerProps) {
  const { mode, value, busy, attachments, onChange, onAttach, onRemoveAttachment } = props;

  const {
    inputRef,
    focused,
    setFocused,
    dismissedQuestionnaireKey,
    setDismissedQuestionnaireKey,
    shakeX,
    overLimit,
    showCounter,
    canAttach,
    sendDisabled,
    submit,
  } = useComposer(props);

  const floating = mode !== "home";
  const expanded = !floating || focused || value.length > 0 || attachments.length > 0;
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  if (props.questionnaire && props.questionnaireKey !== dismissedQuestionnaireKey) {
    return (
      <Shell floating={floating} overLimit={false}>
        <View style={styles.questionnaire}>
          {props.questionnaire}
          <Button
            variant="ghost"
            compact
            label="Написати повідомлення"
            onPress={() => setDismissedQuestionnaireKey(props.questionnaireKey)}
            style={styles.questionnaireEscape}
          />
        </View>
      </Shell>
    );
  }

  const input = (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoFocus={props.autoFocus}
      multiline
      placeholder={placeholders[mode]}
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.tealDeep}
      cursorColor={colors.foreground}
      maxFontSizeMultiplier={2}
      accessibilityLabel={mode === "helper" ? "Повідомлення помічнику" : "Що хочеш приготувати"}
      accessibilityHint={overLimit ? "Забагато знаків" : undefined}
      style={[
        styles.input,
        floating ? styles.inputFloating : styles.inputHome,
        !expanded && styles.inputCollapsed,
      ]}
    />
  );

  const attach = <ComposerAttachButton enabled={canAttach} onAttach={onAttach} />;

  const send = floating ? (
    <SendCircle busy={busy} disabled={sendDisabled} dimmed={overLimit} onPress={submit} />
  ) : (
    <Button
      variant="lime"
      label="Згенерувати"
      busyLabel="Генеруємо…"
      icon={CookingPotIcon}
      busy={busy}
      disabled={sendDisabled}
      onPress={submit}
      style={overLimit && styles.dimmed}
    />
  );

  return (
    <Animated.View style={shakeStyle}>
      <Shell floating={floating} overLimit={overLimit}>
        <Animated.View
          layout={layout.morph}
          style={[floating ? styles.bodyFloating : styles.bodyHome, !expanded && styles.collapsed]}
        >
          {!expanded && attach}
          {input}
          {expanded && (
            <ComposerAttachments
              attachments={attachments}
              busy={busy}
              onRemoveAttachment={onRemoveAttachment}
            />
          )}
          {expanded && (
            <View style={styles.actions}>
              {attach}
              <Text
                variant="meta"
                accessibilityLiveRegion="polite"
                color={overLimit ? colors.destructive : colors.mutedForeground}
                style={[styles.counter, overLimit && styles.counterOver]}
              >
                {showCounter ? `${value.length}/${AI_REQUEST_MAX_CHARACTERS}` : ""}
              </Text>
              {send}
            </View>
          )}
          {!expanded && send}
        </Animated.View>
      </Shell>
    </Animated.View>
  );
}

type ShellProps = { floating: boolean; overLimit: boolean; children: ReactNode };

function Shell({ floating, overLimit, children }: ShellProps) {
  if (!floating) {
    return (
      <ChromeFrame radius={radii.composer} style={overLimit && styles.overLimit}>
        {children}
      </ChromeFrame>
    );
  }

  return (
    <Animated.View layout={layout.morph} style={[styles.floating, overLimit && styles.overLimit]}>
      <GlassSurface style={styles.glass}>{children}</GlassSurface>
      <ChromeBorder radius={radii.composer} />
    </Animated.View>
  );
}

type SendCircleProps = { busy: boolean; disabled: boolean; dimmed: boolean; onPress: () => void };

function SendCircle({ busy, disabled, dimmed, onPress }: SendCircleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? "Готуємо відповідь…" : "Надіслати"}
      accessibilityState={{ disabled: disabled || dimmed, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sendTarget,
        (disabled || dimmed) && styles.dimmed,
        pressed && styles.sendPressed,
      ]}
    >
      <View style={styles.sendCircle}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.card} />
        ) : (
          <HugeiconsIcon icon={ArrowUp02Icon} size={18} color={colors.card} strokeWidth={2.5} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overLimit: { outlineWidth: 2, outlineColor: colors.destructive, outlineOffset: 1 },
  floating: { borderRadius: radii.composer },
  glass: { borderRadius: radii.composer, overflow: "hidden" },
  bodyHome: { padding: 14, gap: 12 },
  bodyFloating: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 4, gap: 6 },
  collapsed: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    gap: 0,
  },
  input: {
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "top",
    maxHeight: lineHeight * maxLines,
  },
  inputHome: { minHeight: lineHeight * 3, paddingHorizontal: 2 },
  inputFloating: { minHeight: lineHeight, paddingHorizontal: 10 },
  inputCollapsed: { flex: 1, paddingHorizontal: 4, maxHeight: lineHeight },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  counter: { flex: 1, fontVariant: ["tabular-nums"] },
  counterOver: { fontFamily: fonts.sansSemiBold },
  dimmed: { opacity: 0.4 },
  sendTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sendPressed: { transform: [{ scale: 0.94 }] },
  sendCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  questionnaire: { padding: 14, gap: 12 },
  questionnaireEscape: { alignSelf: "flex-start" },
});
