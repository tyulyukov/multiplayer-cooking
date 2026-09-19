import { expect, test } from "bun:test";
import { formatRelativeTime } from "./relative-time";

const now = new Date(2026, 8, 7, 12, 0).getTime();
const minute = 60_000;
const hour = 60 * minute;

test("recent moments are relative", () => {
  expect(formatRelativeTime(now - 20_000, now)).toBe("щойно");
  expect(formatRelativeTime(now - 1 * minute, now)).toBe("1 хвилину тому");
  expect(formatRelativeTime(now - 5 * minute, now)).toBe("5 хвилин тому");
  expect(formatRelativeTime(now - 2 * hour, now)).toBe("2 години тому");
  expect(formatRelativeTime(now - 23 * hour, now)).toBe("23 години тому");
});

test("yesterday shows the word and the clock time", () => {
  const at = new Date(2026, 8, 6, 9, 5).getTime();
  expect(formatRelativeTime(at, now)).toBe("вчора, 09:05");
});

test("older dates show the full date with time, with the year only when it differs", () => {
  expect(formatRelativeTime(new Date(2026, 8, 1, 18, 30).getTime(), now)).toBe("1 вересня о 18:30");
  expect(formatRelativeTime(new Date(2025, 11, 24, 8, 0).getTime(), now)).toBe(
    "24 грудня 2025 р. о 08:00",
  );
});
