import { expect, test } from "bun:test";
import type { UIMessage } from "@convex-dev/agent";
import { generationStatus } from "./generation-status";

function message(parts: UIMessage["parts"], key = "request"): UIMessage {
  return {
    id: key,
    key,
    role: "assistant",
    text: "",
    order: 0,
    stepOrder: 0,
    _creationTime: 1,
    status: "streaming",
    parts,
  };
}

test("status follows every active tool including questions and ignores finished tools", () => {
  for (const name of [
    "web_search",
    "read_page",
    "silpo_find_products",
    "save_idea",
    "ask_user",
    "add_memory",
    "remove_memory",
  ]) {
    const active = {
      type: `tool-${name}`,
      toolCallId: "active",
      state: "input-available",
      input: {},
    } as const;
    const completed = {
      type: "tool-read_page",
      toolCallId: "done",
      state: "output-available",
      input: {},
      output: {},
    } as const;
    expect(generationStatus([message([active, completed])]).activity).toBe(name);
  }
});

test("wording varies between calls but stays stable through streaming updates", () => {
  const labels = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const parts = [
      { type: "tool-web_search", toolCallId: `search-${i}`, state: "input-streaming", input: {} },
    ] as const;
    const m = message([...parts]);
    const status = generationStatus([m]);
    labels.add(status.label);
    expect(generationStatus([{ ...m, text: "Ще трохи тексту" }])).toEqual(status);
  }
  expect(labels.size).toBeGreaterThan(1);
});

test("finished and failed tools stop claiming that the operation is running", () => {
  for (const state of ["output-available", "output-error"] as const) {
    const part: UIMessage["parts"][number] =
      state === "output-available"
        ? { type: "tool-web_search", toolCallId: "search", state, input: {}, output: {} }
        : { type: "tool-web_search", toolCallId: "search", state, input: {}, errorText: "failed" };
    expect(generationStatus([message([part])]).activity).toBe("thinking");
  }
});
