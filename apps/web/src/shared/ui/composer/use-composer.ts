import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  AI_MAX_IMAGES,
  AI_REQUEST_MAX_CHARACTERS,
} from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { useComposerShortcut } from "@/shared/hooks/use-composer-shortcut";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

import type { ComposerProps } from "./types";
import styles from "./composer.module.scss";
const counterThreshold = Math.floor(AI_REQUEST_MAX_CHARACTERS * 0.8);
const shakeDurationMs = 300;

const isOverLimit = (text: string) => {
  return text.length > AI_REQUEST_MAX_CHARACTERS;
};

export const useComposer = ({
  mode,
  value,
  busy,
  autoFocus,
  attachments,
  onSubmit,
  onAttach,
}: ComposerProps) => {
  const inputId = useId();
  const composerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittedWithShortcutRef = useRef(false);
  const [dismissedQuestionnaireKey, setDismissedQuestionnaireKey] = useState<string>();
  const [shortcut] = useComposerShortcut();
  const desktopKeyboard = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const overLimit = isOverLimit(value);
  const showCounter = value.length >= counterThreshold;
  const readyAttachments = attachments.filter((item) => item.state === "done");
  const uploading = attachments.some((item) => item.state === "uploading");
  const attachmentError = mode === "helper" && attachments.some((item) => item.state === "error");
  const canAttach = attachments.length < AI_MAX_IMAGES && !busy;

  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || CSS.supports("field-sizing", "content")) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const shake = () => {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    composer.classList.remove(styles["is-shaking"]);
    void composer.offsetWidth;
    composer.classList.add(styles["is-shaking"]);
    window.setTimeout(() => composer.classList.remove(styles["is-shaking"]), shakeDurationMs);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedWithShortcut = submittedWithShortcutRef.current;
    submittedWithShortcutRef.current = false;

    if (busy) {
      return;
    }

    if (overLimit) {
      shake();
      textareaRef.current?.focus();
      return;
    }

    const text = value.trim();

    if ((!text && readyAttachments.length === 0) || uploading || attachmentError) {
      textareaRef.current?.focus();
      return;
    }

    if (!submittedWithShortcut) {
      textareaRef.current?.blur();
    }
    onSubmit(text);
  };

  const submitWithShortcut = () => {
    const form = textareaRef.current?.form;

    if (!form) {
      return;
    }

    submittedWithShortcutRef.current = true;
    form.requestSubmit();
  };

  const shortcutDescription =
    shortcut === "enter"
      ? ["Enter · надіслати", "Shift + Enter · новий рядок"]
      : ["Shift + Enter · надіслати", "Enter · новий рядок"];

  const pickFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));

    if (files.length > 0) {
      onAttach(files.slice(0, AI_MAX_IMAGES - attachments.length));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    inputId,
    composerRef,
    textareaRef,
    fileInputRef,
    dismissedQuestionnaireKey,
    setDismissedQuestionnaireKey,
    shortcut,
    desktopKeyboard,
    overLimit,
    showCounter,
    readyAttachments,
    uploading,
    attachmentError,
    canAttach,
    handleSubmit,
    submitWithShortcut,
    shortcutDescription,
    pickFiles,
  };
};
