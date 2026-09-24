import { useRef, useState } from "react";

import { pickQuickPrompts, type QuickPrompt } from "@/features/chat/lib/quick-prompts";

type PromptSelection = Readonly<{
  promptId: string;
  baseRequest: string;
}>;

export const useComposerDraft = () => {
  const [request, setRequest] = useState("");
  const revision = useRef(0);
  const [selection, setSelection] = useState<PromptSelection | null>(null);
  const [quickPrompts, setQuickPrompts] = useState(() => pickQuickPrompts());

  const change = (value: string) => {
    revision.current += 1;
    setRequest(value);
    setSelection(null);
  };

  const togglePrompt = (prompt: QuickPrompt) => {
    revision.current += 1;

    if (selection?.promptId === prompt.id) {
      setRequest(selection.baseRequest);
      setSelection(null);

      return;
    }

    const baseRequest = selection ? selection.baseRequest : request;
    const trimmedBase = baseRequest.trim();
    setRequest(trimmedBase ? `${trimmedBase}\n${prompt.label}` : prompt.label);
    setSelection({ promptId: prompt.id, baseRequest });
  };

  const reset = () => {
    revision.current += 1;
    setRequest("");
    setSelection(null);
    setQuickPrompts(pickQuickPrompts());
  };

  return { request, revision, selection, quickPrompts, change, togglePrompt, reset };
};
