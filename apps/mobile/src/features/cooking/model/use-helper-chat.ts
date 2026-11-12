import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { helperContextStep } from "@multiplayer-cooking/core/cooking/cooking-helper";
import { useRef, useState } from "react";

import { useAttachments } from "@/shared/hooks/use-attachments";
import { haptics } from "@/shared/lib/haptics";
import { uploadImage } from "@/shared/lib/upload-image";

import { useHelperActions } from "../api/use-helper-actions";
import { useRoomData } from "./room-context";

// The sheet unmounts on close; the draft outlives it like the web page state does.
const drafts = new Map<string, string>();

export const helperErrors = {
  send: "Не вдалося надіслати повідомлення. Спробуй ще раз.",
  approve: "Не вдалося застосувати зміни. Попроси помічника перевірити їх ще раз.",
  reject: "Не вдалося відхилити зміни. Спробуй ще раз.",
  retry: "Не вдалося повторити запит. Спробуй ще раз.",
  note: "Не вдалося зберегти нотатку. Спробуй ще раз.",
  deleteNote: "Не вдалося прибрати нотатку. Спробуй ще раз.",
} as const;

type HelperChatOptions = { prompt?: string; stepKey?: string };

// Port of the web `useRoomHelper` + `useCookingHelper` for the helper sheet.
export const useHelperChat = ({ prompt: requestedPrompt, stepKey }: HelperChatOptions) => {
  const { roomId, credential, read, online, helper } = useRoomData();
  const token = credential?.participantToken;
  const mutations = useHelperActions();
  const steps = read.room.plan?.steps ?? [];

  const [prompt, setPromptState] = useState(() => requestedPrompt || drafts.get(roomId) || "");
  const [selectedStep, setSelectedStep] = useState(stepKey || undefined);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const currentPrompt = useRef(prompt);
  const currentNote = useRef(note);

  const setPrompt = (text: string) => {
    currentPrompt.current = text;
    drafts.set(roomId, text);
    setPromptState(text);
  };

  const changeNote = (text: string) => {
    currentNote.current = text;
    setNote(text);
  };

  const attachments = useAttachments(
    token && online
      ? async (fileUri) => {
          const args = { roomId, participantToken: token };
          const grant = await mutations.uploadUrl(args);

          if (!grant) throw new Error("Upload unavailable");
          const storageId = await uploadImage(grant.uploadUrl, fileUri);

          if (
            !(await mutations.registerUpload({
              ...args,
              uploadTicket: grant.uploadTicket,
              // SAFETY: uploadImage just received this id from this deployment's storage.
              storageId: storageId as Id<"_storage">,
            }))
          ) {
            throw new Error("Upload rejected");
          }

          return storageId;
        }
      : null,
  );

  const mySteps = read.steps.filter((step) =>
    step.slots.some((slot) => read.me.slots.includes(slot)),
  );

  const activeStep =
    mySteps.find((step) => step.status === "active") ??
    mySteps.find((step) => step.status === "waiting");

  const contextKey = helperContextStep(steps, selectedStep, activeStep?.stepKey);
  const context = steps.find((step) => step.id === contextKey);
  const messages = helper.messages ?? [];
  const proposals = helper.proposals ?? [];
  const loaded = helper.messages !== undefined && helper.proposals !== undefined;
  const helperBusy = read.room.helperBusy === true;
  const busy = helperBusy || pending;
  const disabled = !online || pending;
  const finished = read.room.state === "done" || read.room.state === "error";
  const uploading = attachments.items.some((item) => item.state === "uploading");
  const attachmentError = attachments.items.some((item) => item.state === "error");

  const entries = [
    ...messages.map((value) => ({ kind: "message" as const, createdAt: value.createdAt, value })),
    ...proposals.map((value) => ({ kind: "proposal" as const, createdAt: value.createdAt, value })),
  ].sort((left, right) => left.createdAt - right.createdAt);

  const notes = (helper.notes ?? []).map((item) => ({
    ...item,
    author: read.members.find((member) => member._id === item.authorMemberId)?.name ?? "Кухар",
    canDelete: read.me.role === "host" || item.authorMemberId === read.me._id,
  }));

  const run = async <T>(call: (participantToken: string) => Promise<T>, failure: string) => {
    if (pendingRef.current || !online || !token) return false;
    pendingRef.current = true;
    setPending(true);
    setError(undefined);

    try {
      const result = await call(token);

      if (result === false || result === null) throw new Error(failure);

      return true;
    } catch {
      haptics.error();
      setError(failure);

      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const send = async (text: string) => {
    if (helperBusy || finished || uploading || attachmentError) return;

    const sent = await run(
      (participantToken) =>
        mutations.ask({
          roomId,
          participantToken,
          prompt: text,
          stepKey: contextKey,
          // SAFETY: these ids come from this room's own helper upload flow.
          attachmentStorageIds: attachments.storageIds as Id<"_storage">[],
        }),
      helperErrors.send,
    );

    if (sent) {
      if (currentPrompt.current.trim() === text) setPrompt("");
      attachments.clear();
    }
  };

  const canRetry = Boolean(read.room.helperFailedPromptMessageId);

  const retry = () => {
    void run(
      (participantToken) => mutations.retry({ roomId, participantToken }),
      helperErrors.retry,
    );
  };

  const approve = (proposalId: Id<"cookingProposals">) => {
    void run(
      (participantToken) => mutations.approve({ roomId, participantToken, proposalId }),
      helperErrors.approve,
    ).then((applied) => {
      if (applied) haptics.success();
    });
  };

  const reject = (proposalId: Id<"cookingProposals">) => {
    void run(
      (participantToken) => mutations.reject({ roomId, participantToken, proposalId }),
      helperErrors.reject,
    );
  };

  const saveNote = async () => {
    const text = note.trim();

    if (!text) return;

    const saved = await run(
      (participantToken) => mutations.addNote({ roomId, participantToken, text }),
      helperErrors.note,
    );

    if (saved) {
      haptics.success();

      if (currentNote.current.trim() === text) changeNote("");
    }
  };

  const deleteNote = (noteId: Id<"cookingNotes">) => {
    void run(
      (participantToken) => mutations.deleteNote({ roomId, participantToken, noteId }),
      helperErrors.deleteNote,
    );
  };

  return {
    plan: read.room.plan,
    steps,
    context,
    selectStep: (key: string) => setSelectedStep(key),
    prompt,
    setPrompt,
    attachments,
    entries,
    notes,
    note,
    setNote: changeNote,
    loaded,
    online,
    helperBusy,
    helperError: read.room.helperError,
    busy,
    pending,
    disabled,
    finished,
    uploading,
    attachmentError,
    error,
    canRetry,
    send,
    retry,
    approve,
    reject,
    saveNote,
    deleteNote,
    markSeen: helper.markSeen,
  };
};

export type HelperChatModel = ReturnType<typeof useHelperChat>;
