import { describe, expect, test } from "bun:test";
import { timerLabel } from "./timer-label";

describe("timerLabel", () => {
  test("відлік від серверного дедлайну округлюється вгору", () => {
    expect(timerLabel({ status: "running", deadline: 61_001, durationMs: 90_000 }, 1_000)).toBe(
      "1:01",
    );
  });

  test("прострочений таймер не показує від’ємний час", () => {
    expect(timerLabel({ status: "running", deadline: 1_000, durationMs: 90_000 }, 2_000)).toBe(
      "0:00",
    );
  });

  test("пауза зберігає залишок незалежно від дедлайну", () => {
    expect(
      timerLabel(
        { status: "paused", deadline: 1_000, remainingMs: 42_000, durationMs: 90_000 },
        5_000,
      ),
    ).toBe("0:42");
  });

  test("підтверджений таймер показує нуль", () => {
    expect(timerLabel({ status: "acknowledged", remainingMs: 42_000, durationMs: 90_000 }, 0)).toBe(
      "0:00",
    );
  });

  test("без залишку використовується повна тривалість", () => {
    expect(timerLabel({ status: "cancelled", durationMs: 90_000 }, 0)).toBe("1:30");
  });
});
