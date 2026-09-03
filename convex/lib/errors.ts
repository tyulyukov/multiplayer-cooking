export type FailureClassification = Readonly<{
  errorName: string;
  httpStatus?: number;
  retryable?: boolean;
}>;

function readNumber(error: unknown, key: string) {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return undefined;
  }

  const value: unknown = Reflect.get(error, key);

  return typeof value === "number" ? value : undefined;
}

function readBoolean(error: unknown, key: string) {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return undefined;
  }

  const value: unknown = Reflect.get(error, key);

  return typeof value === "boolean" ? value : undefined;
}

export function classifyFailure(error: unknown): FailureClassification {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  return {
    errorName: error.name || "Error",
    httpStatus: readNumber(error, "statusCode") ?? readNumber(error, "status"),
    retryable: readBoolean(error, "isRetryable") ?? readBoolean(error, "retryable"),
  };
}
