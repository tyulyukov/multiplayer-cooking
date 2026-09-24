import type { ReactNode } from "react";

export type ComposerAttachment = Readonly<{
  id: string;
  previewUrl: string;
  state: "uploading" | "done" | "error";
}>;

export type ComposerProps = {
  questionnaire?: ReactNode;
  questionnaireKey?: string;
  mode: "home" | "chat" | "helper";
  value: string;
  busy: boolean;
  autoFocus: boolean;
  attachments: readonly ComposerAttachment[];
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
};
