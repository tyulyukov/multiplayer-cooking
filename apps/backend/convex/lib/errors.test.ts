import { describe, expect, test } from "bun:test";

import { classifyFailure } from "./errors";

describe("classifyFailure", () => {
  test("returns only safe fields for provider errors", () => {
    const error = Object.assign(new Error("provider response body"), {
      cause: new Error("secret cause"),
      isRetryable: true,
      name: "APICallError",
      statusCode: 503,
    });

    const classification = classifyFailure(error);

    expect(classification).toEqual({
      errorName: "APICallError",
      httpStatus: 503,
      retryable: true,
    });
    expect(classification).not.toHaveProperty("cause");
    expect(classification).not.toHaveProperty("message");
    expect(classification).not.toHaveProperty("stack");
  });

  test("uses status and retryable when those fields are available", () => {
    const error = Object.assign(new Error("ignored"), {
      name: "ProviderError",
      retryable: false,
      status: 429,
    });

    expect(classifyFailure(error)).toEqual({
      errorName: "ProviderError",
      httpStatus: 429,
      retryable: false,
    });
  });

  test("drops malformed metadata and non-error values", () => {
    const malformed = Object.assign(new Error("ignored"), {
      isRetryable: "yes",
      name: "",
      statusCode: "503",
    });

    expect(classifyFailure(malformed)).toEqual({ errorName: "Error" });
    expect(classifyFailure({ statusCode: 503 })).toEqual({
      errorName: "UnknownError",
    });
  });
});
