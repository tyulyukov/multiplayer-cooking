import { describe, expect, test } from "bun:test";

import { markdownBlocks, splitBufferedText } from "./split-buffered-text";

describe("splitBufferedText", () => {
  test("holds back a paragraph until a blank line closes it", () => {
    expect(splitBufferedText("Шукаю щось легке")).toEqual({ ready: "", rest: "Шукаю щось легке" });
    expect(splitBufferedText("Перший абзац.\n\nДруг")).toEqual({
      ready: "Перший абзац.\n\n",
      rest: "Друг",
    });
  });

  test("releases a list item once the next one starts", () => {
    expect(splitBufferedText("- борошно\n- яй")).toEqual({ ready: "- борошно\n", rest: "- яй" });
    expect(splitBufferedText("- борошно\n-")).toEqual({ ready: "", rest: "- борошно\n-" });
  });

  test("keeps an open code fence buffered and releases it when closed", () => {
    const open = "Текст\n\n```\nкод\n\nще";

    expect(splitBufferedText(open).ready).toBe("Текст\n\n");
    expect(splitBufferedText(`${open}\n\`\`\`\n`).ready).toBe(`${open}\n\`\`\`\n`);
  });

  test("ignores a blank first line", () => {
    expect(splitBufferedText("\nТекст")).toEqual({ ready: "", rest: "\nТекст" });
  });
});

describe("markdownBlocks", () => {
  test("keys blocks by their source offset", () => {
    expect(markdownBlocks("Один.\n\nДва\nрядки.\n\n")).toEqual([
      { offset: 0, text: "Один." },
      { offset: 7, text: "Два\nрядки." },
    ]);
  });

  test("keeps a fenced block with blank lines together", () => {
    expect(markdownBlocks("```\na\n\nb\n```\n\nКінець")).toEqual([
      { offset: 0, text: "```\na\n\nb\n```" },
      { offset: 14, text: "Кінець" },
    ]);
  });

  test("earlier blocks keep their keys as text grows", () => {
    const before = markdownBlocks("Один.\n\n");
    const after = markdownBlocks("Один.\n\nДва.\n\n");

    expect(after[0]).toEqual(before[0]!);
    expect(after).toHaveLength(2);
  });
});
