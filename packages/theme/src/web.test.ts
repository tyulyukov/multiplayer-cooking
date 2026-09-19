import { expect, test } from "bun:test";

import { colors } from "./index";

test("the web theme exposes every shared color token", async () => {
  const css = await Bun.file(new URL("./web.css", import.meta.url)).text();

  for (const [name, value] of Object.entries(colors)) {
    const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    expect(css).toContain(`--${cssName}: ${value};`);
  }
});
