import type { ReactNode } from "react";

import type { AttachSource } from "@/shared/hooks/use-attachments";

export type ComposerAttachment = Readonly<{
  id: string;
  previewUrl: string;
  state: "uploading" | "done" | "error";
}>;

export type ComposerMode = "home" | "chat" | "helper";

export type ComposerProps = {
  mode: ComposerMode;
  value: string;
  busy: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  attachments: readonly ComposerAttachment[];
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onAttach: (source: AttachSource) => void;
  onRemoveAttachment: (id: string) => void;
  questionnaire?: ReactNode;
  questionnaireKey?: string;
};
