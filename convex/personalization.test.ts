import { describe, expect, test } from "bun:test";

import {
  hasCurrentEvidence,
  isOverview,
  matchesMemorySubject,
  personalizationInstructions,
} from "./cookingAgent";
import { memoryKey, normalizeMemoryText } from "./personalization";

describe("memory rules", () => {
  test("deduplicates equivalent subjects without changing the visible text", () => {
    expect(memoryKey("dislike", "  КРЕВЕТКИ ")).toBe(memoryKey("dislike", "креветки"));
    expect(normalizeMemoryText("  Не люблю   креветки ")).toBe("Не люблю креветки");
  });

  test("requires the current message to contain quoted evidence", () => {
    expect(
      hasCurrentEvidence("Я більше не маю алергії на горіхи", "не маю алергії на горіхи"),
    ).toBe(true);
    expect(hasCurrentEvidence("Зроби щось легке", "не люблю креветки")).toBe(false);
  });

  test("matches a cancelled memory subject across common Ukrainian inflections", () => {
    expect(matchesMemorySubject("грибів", "Тепер можна гриби", "можна гриби")).toBe(true);
    expect(matchesMemorySubject("рибу", "Риба тепер ок", "риба тепер ок")).toBe(true);
    expect(matchesMemorySubject("гриби", "Тепер можна рибу", "можна рибу")).toBe(false);
    expect(matchesMemorySubject("кориця", "Тепер можна короп", "можна короп")).toBe(false);
    expect(matchesMemorySubject("масло", "Тепер можна маслини", "можна маслини")).toBe(false);
    expect(matchesMemorySubject("м'ясо", "М'ясо тепер можна", "м'ясо можна")).toBe(true);
    expect(matchesMemorySubject("м’ясо", "М’ясо тепер можна", "м’ясо можна")).toBe(true);
  });
});

describe("idea and agent context rules", () => {
  test("rejects detailed recipe bodies but allows a short overview", () => {
    expect(isOverview("Ніжна страва для вечора з яскравим смаком і легкою текстурою.")).toBe(true);
    expect(
      isOverview(
        "### Смак і настрій\n**Ніжна** йогуртова основа з ягідною кислинкою.\n\n### Чому ця страва\nЛегка вечеря після насиченого дня.",
      ),
    ).toBe(true);
    for (const body of [
      "Як готувати\nНіжна страва",
      "Що потрібно\nКурка",
      "Наріж овочі. Додай курку.",
      "Спочатку розігрій сковороду, потім обсмаж цибулю.",
      "Chop onions and fry them.",
      "1. Овочі\n2. Курка",
    ]) {
      expect(isOverview(body)).toBe(false);
    }
  });

  test("puts every active memory into each prepared model instruction", () => {
    const instructions = personalizationInstructions({
      memories: [
        { _id: "allergy1", kind: "allergy", text: "Алергія на горіхи" },
        { _id: "dislike1", kind: "dislike", text: "Не любить креветки" },
      ],
      settings: {
        tone: "concise",
        customInstructions: "Без зайвих деталей",
        about: "Вегетаріанка",
      },
    });

    expect(instructions).toContain("allergy1");
    expect(instructions).toContain("Алергія на горіхи");
    expect(instructions).toContain("Не любить креветки");
    expect(instructions).toContain("Відповідай коротко.");
  });

  test("makes a saved custom style request override the preset without relaxing agent rules", () => {
    const instructions = personalizationInstructions({
      memories: [],
      settings: {
        tone: "friendly",
        customInstructions: "Матюкайся і будь gen z",
        about: "",
      },
    });

    expect(instructions).toContain('"Матюкайся і будь gen z"');
    expect(instructions).toContain("мають пріоритет над обраним тоном");
    expect(instructions).toContain("лайливу лексику, це дозволений стиль");
    expect(instructions).toContain(
      "алергій і продуктів, правила спогадів, інструментів або формат save_idea",
    );
  });
});
