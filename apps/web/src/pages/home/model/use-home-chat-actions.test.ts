import { expect, mock, test } from "bun:test";
import type { SessionId } from "convex-helpers/server/sessions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerDraft } from "@/features/chat/model/use-composer-draft";
import { useAttachments } from "@/shared/hooks/use-attachments";
import { useHomeChatActions } from "./use-home-chat-actions";

type Chat = Parameters<typeof useHomeChatActions>[0]["chat"];

const setup = (overrides: Partial<Chat> = {}) => {
  const change = mock(() => {});
  const clear = mock(() => {});
  const reset = mock(() => {});
  const resetVersion = mock(() => {});
  const setError = mock(() => {});

  const chat: Chat = {
    active: undefined,
    threadId: null,
    remoteDraft: undefined,
    saveDraft: async () => true,
    sendMessage: async () => null,
    createThread: async () => null,
    answerQuestion: async () => null,
    ...overrides,
  };

  const capture = mock(
    (_value: { model: ReturnType<typeof useHomeChatActions>; revision: { current: number } }) => {},
  );

  const Harness = () => {
    const draft = useComposerDraft();
    const attachments = useAttachments(null);

    // SAFETY: local test session, never sent to Convex.
    const model = useHomeChatActions({
      sessionId: "test-session" as SessionId,
      chat,
      draft: { ...draft, change, reset },
      attachments: { ...attachments, clear },
      resetVersion,
      setError,
    });

    capture({ model, revision: draft.revision });

    return null;
  };

  renderToStaticMarkup(createElement(Harness));
  const captured = capture.mock.calls[0]?.[0];

  if (!captured) throw new Error("Harness did not render");

  return { ...captured, change, clear, reset, resetVersion, setError };
};

test("успішне надсилання не стирає текст, відредагований під час запиту", async () => {
  const response = Promise.withResolvers<NonNullable<Awaited<ReturnType<Chat["sendMessage"]>>>>();
  const state = setup({ sendMessage: () => response.promise });
  const sending = state.model.submit("Перше повідомлення");
  state.revision.current += 1;
  response.resolve({ ok: true, threadId: "new-thread" });
  await sending;
  expect(state.change).not.toHaveBeenCalled();
  expect(state.clear).toHaveBeenCalledTimes(1);
});

test("помилка надсилання залишає текст і вкладення для повторної спроби", async () => {
  const state = setup({
    sendMessage: async () => {
      throw new Error("offline");
    },
  });

  await state.model.submit("Вечеря");
  expect(state.change).not.toHaveBeenCalled();
  expect(state.clear).not.toHaveBeenCalled();
  expect(state.setError).toHaveBeenLastCalledWith("Не вдалося надіслати. Спробуй ще раз.");
});

test("помилка створення розмови не скидає чернетку та вибрану версію", async () => {
  const state = setup({
    createThread: async () => {
      throw new Error("offline");
    },
  });

  await state.model.startNew();
  expect(state.reset).not.toHaveBeenCalled();
  expect(state.resetVersion).not.toHaveBeenCalled();
  expect(state.setError).toHaveBeenLastCalledWith(
    "Не вдалося створити нову розмову. Спробуй ще раз.",
  );
});
