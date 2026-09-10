import { expect, test } from "bun:test";

import { isValidHelperImage } from "./cooking_helper_uploads";

test("accepts only bounded JPEG, PNG, and WebP helper images", () => {
  expect(isValidHelperImage({ contentType: "image/png", size: 1 })).toBe(true);
  expect(isValidHelperImage({ contentType: "image/jpeg", size: 5 * 1024 * 1024 })).toBe(true);
  expect(isValidHelperImage({ contentType: "image/gif", size: 10 })).toBe(false);
  expect(isValidHelperImage({ contentType: "image/webp", size: 5 * 1024 * 1024 + 1 })).toBe(false);
  expect(isValidHelperImage({ size: 10 })).toBe(false);
});
