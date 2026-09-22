import type { ReactNode } from "react";

import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import type { ChatMessage, QuestionSubmit } from "@/features/chat/model/types";
import type { CookingSetup } from "@/features/cooking/model/types";
import type { Idea, IdeaVersions } from "@/features/ideas/model/types";
import type { SilpoConnection } from "@/features/silpo/model/types";
import { useAttachments } from "@/shared/hooks/use-attachments";

type AttachmentsState = ReturnType<typeof useAttachments>;

export type ChatScreenProps = {
  backendReady: boolean;
  menu?: ReactNode;
  connection: SilpoConnection;
  messages: readonly ChatMessage[];
  idea: Idea | null | undefined;
  ideas: readonly Idea[];
  versions: IdeaVersions;
  working: boolean;
  answering: boolean;
  draft: ReturnType<typeof useComposerDraft>;
  attachments: AttachmentsState;
  error: string | null;
  addressError: string | null;
  onSubmit: (text: string) => void;
  onNew: () => void;
  onSaveAddress: (address: string) => void;
  onAddToCart: () => void;
  onAnswer: QuestionSubmit;
  onCookCount: (setup: CookingSetup) => Promise<void>;
  profileName?: string;
  onOpenMemories: () => void;
  onOpenIdea: (ideaId: Idea["_id"]) => void;
};
