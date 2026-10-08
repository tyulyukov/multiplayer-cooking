import {
  AI_MAX_IMAGES,
  AI_REQUEST_MAX_CHARACTERS,
} from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";
import { ReduceMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import { haptics } from "@/shared/lib/haptics";

import type { ComposerProps } from "./types";

export const counterThreshold = Math.floor(AI_REQUEST_MAX_CHARACTERS * 0.8);

const shakeStep = (offset: number, duration: number) =>
  withTiming(offset, { duration, reduceMotion: ReduceMotion.System });

export const useComposer = ({
  mode,
  value,
  busy,
  disabled = false,
  attachments,
  onSubmit,
}: ComposerProps) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [dismissedQuestionnaireKey, setDismissedQuestionnaireKey] = useState<string>();
  const reducedMotion = useReducedMotion();
  const shakeX = useSharedValue(0);
  const overLimit = value.length > AI_REQUEST_MAX_CHARACTERS;
  const showCounter = value.length >= counterThreshold;
  const readyCount = attachments.filter((item) => item.state === "done").length;
  const uploading = attachments.some((item) => item.state === "uploading");
  const attachmentError = mode === "helper" && attachments.some((item) => item.state === "error");
  const canAttach = attachments.length < AI_MAX_IMAGES && !busy;
  const emptyHelper = mode === "helper" && !value.trim() && readyCount === 0;

  const sendDisabled =
    busy ||
    disabled ||
    uploading ||
    (overLimit && reducedMotion) ||
    (mode !== "home" && (attachmentError || emptyHelper));

  const shake = () => {
    if (reducedMotion) return;

    shakeX.set(
      withSequence(shakeStep(6, 86), shakeStep(-6, 86), shakeStep(3, 64), shakeStep(0, 64)),
    );
  };

  const submit = () => {
    if (busy || disabled) return;

    if (overLimit) {
      shake();
      inputRef.current?.focus();

      return;
    }

    const text = value.trim();

    if ((!text && readyCount === 0) || uploading || attachmentError) {
      inputRef.current?.focus();

      return;
    }

    haptics.send();
    inputRef.current?.blur();
    onSubmit(text);
  };

  return {
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
  };
};
