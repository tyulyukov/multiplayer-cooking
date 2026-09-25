import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AI_REQUEST_MAX_CHARACTERS } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { Composer } from "./composer";
import type { ComposerProps } from "./types";

const render = (overrides: Partial<ComposerProps> = {}) => {
  return renderToStaticMarkup(
    createElement(Composer, {
      mode: "chat",
      value: "Борщ",
      busy: false,
      autoFocus: false,
      attachments: [],
      onChange: () => {},
      onSubmit: () => {},
      onAttach: () => {},
      onRemoveAttachment: () => {},
      ...overrides,
    }),
  );
};

const sendButton = (html: string) => {
  const button = html.match(/<button[^>]*aria-label="Надіслати"[^>]*>/)?.[0];
  expect(button).toBeDefined();

  return button!;
};

describe("Composer rendering", () => {
  test("домашній режим зберігає текст і основну кнопку", () => {
    const html = render({ mode: "home" });
    expect(html).toContain('data-mode="home"');
    expect(html).toContain("Згенерувати");
    expect(html).toContain("Опиши страву або напиши, що є вдома");
  });

  test("чат показує кнопку надсилання та введений текст", () => {
    const html = render();
    expect(html).toContain('aria-label="Надіслати"');
    expect(html).toContain(">Борщ</textarea>");
  });

  test("порожній запит помічника не можна надіслати", () => {
    const html = render({ mode: "helper", value: " " });
    expect(sendButton(html)).toContain(' disabled=""');
  });

  test("готове фото дозволяє повідомлення помічнику без тексту", () => {
    const html = render({
      mode: "helper",
      value: "",
      attachments: [{ id: "photo", previewUrl: "/photo.webp", state: "done" }],
    });

    expect(sendButton(html)).not.toContain(' disabled=""');
    expect(html).toContain('aria-label="Прибрати фото"');
  });

  test("перевищення ліміту показує лічильник і блокує надсилання", () => {
    const html = render({ value: "а".repeat(AI_REQUEST_MAX_CHARACTERS + 1) });
    expect(html).toContain('data-over-limit="true"');
    expect(html).toContain("забагато знаків");
    expect(sendButton(html)).toContain(' disabled=""');
  });

  test("анкета замінює форму, але залишає перехід до повідомлення", () => {
    const html = render({
      questionnaire: createElement("p", null, "Скільки порцій?"),
      questionnaireKey: "question-1",
    });

    expect(html).toContain("Скільки порцій?");
    expect(html).toContain("Написати повідомлення");
    expect(html).not.toContain("<form");
  });
});
