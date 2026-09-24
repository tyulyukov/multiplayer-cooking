import type { FunctionReturnType } from "convex/server";
import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import type { useAttachments } from "@/shared/hooks/use-attachments";
import type { CookingRoomData, HelperProposal } from "@/features/cooking/model/types";

type HelperMessage = FunctionReturnType<typeof api.cookingAssistance.listMessages>[number];

type Note = FunctionReturnType<typeof api.cookingAssistance.listNotes>[number] & {
  canDelete: boolean;
};

type Plan = NonNullable<CookingRoomData["room"]["plan"]>;

type AskResult = FunctionReturnType<typeof api.cookingAssistance.askHelper>;

type AddNoteResult = FunctionReturnType<typeof api.cookingAssistance.addNote>;

export type CookingHelperProps = {
  plan: Plan;
  contextStepKey?: string;
  chatRequestKey?: number;
  onContextChange: (stepKey: string) => void;
  messages: HelperMessage[];
  proposals: HelperProposal[];
  notes: Note[];
  loaded: boolean;
  helperBusy: boolean;
  helperError?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (text: string) => void;
  online: boolean;
  finished: boolean;
  attachments: ReturnType<typeof useAttachments>;
  onAsk: (text: string) => Promise<AskResult>;
  onRetry?: () => Promise<AskResult>;
  onApprove: (id: Id<"cookingProposals">) => Promise<boolean>;
  onReject: (id: Id<"cookingProposals">) => Promise<boolean>;
  onNote: (text: string) => Promise<AddNoteResult>;
  onDeleteNote: (id: Id<"cookingNotes">) => Promise<boolean>;
};
