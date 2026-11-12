// Ported from t3code `splitBufferedAssistantText`. `ready` holds only finished markdown blocks:
// paragraphs closed by a blank line, list items followed by the next item, and closed code
// fences. Partial markdown stays in `rest` so the renderer never sees half a block.

// An opening fence may sit at any indentation; a closing fence at most three spaces deeper.
const fencePattern = /^( *)(`{3,}|~{3,})/;

// CommonMark blank lines hold only spaces and tabs.
const blankLinePattern = /^[ \t]*$/;

// A list marker plus whitespace; a partial `-` or `1.` never matches.
const listItemPattern = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]/;

export const splitBufferedText = (text: string) => {
  let openFence: { marker: string; indent: number } | null = null;
  let boundary = -1;
  let lineStart = 0;

  for (;;) {
    const newline = text.indexOf("\n", lineStart);

    const line = text
      .slice(lineStart, newline === -1 ? text.length : newline)
      .replace(/[ \t\r]+$/, "");

    if (openFence === null && lineStart > 0 && listItemPattern.test(line)) boundary = lineStart;

    if (newline === -1) break;

    const fence = fencePattern.exec(line);

    if (fence) {
      const indent = fence[1]?.length ?? 0;
      const marker = fence[2] ?? "";

      if (openFence === null) {
        openFence = { marker, indent };
      } else if (
        marker[0] === openFence.marker[0] &&
        marker.length >= openFence.marker.length &&
        indent <= openFence.indent + 3 &&
        line.length === indent + marker.length
      ) {
        openFence = null;
        boundary = newline + 1;
      }
    } else if (openFence === null && blankLinePattern.test(line) && lineStart > 0) {
      boundary = newline + 1;
    }

    lineStart = newline + 1;
  }

  return boundary === -1
    ? { ready: "", rest: text }
    : { ready: text.slice(0, boundary), rest: text.slice(boundary) };
};

// Splits finished markdown into top-level blocks keyed by their source offset, so a block that
// was already on screen keeps its key while new ones are appended.
export const markdownBlocks = (text: string) => {
  const blocks: { offset: number; text: string }[] = [];
  let openFence: string | null = null;
  let start = -1;
  let offset = 0;

  const close = (end: number) => {
    if (start === -1) return;
    const block = text.slice(start, end).trim();

    if (block) blocks.push({ offset: start, text: block });
    start = -1;
  };

  for (const line of text.split("\n")) {
    const fence = fencePattern.exec(line)?.[2] ?? null;

    if (openFence === null && blankLinePattern.test(line)) {
      close(offset);
    } else {
      if (start === -1) start = offset;

      if (fence && openFence === null) openFence = fence;
      else if (fence && openFence !== null && fence[0] === openFence[0]) openFence = null;
    }

    offset += line.length + 1;
  }

  close(text.length);

  return blocks;
};
