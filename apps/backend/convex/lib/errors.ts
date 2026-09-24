import { z } from "zod";

export type FailureClassification = Readonly<{
  errorName: string;
  httpStatus?: number;
  retryable?: boolean;
}>;

const errorMetadataSchema = z.object({
  isRetryable: z.boolean().optional().catch(undefined),
  retryable: z.boolean().optional().catch(undefined),
  status: z.number().optional().catch(undefined),
  statusCode: z.number().optional().catch(undefined),
});

export function classifyFailure(cause: unknown): FailureClassification {
  if (!(cause instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  const parsed = errorMetadataSchema.safeParse(cause);
  const metadata = parsed.success ? parsed.data : {};

  return {
    errorName: cause.name || "Error",
    httpStatus: metadata.statusCode ?? metadata.status,
    retryable: metadata.isRetryable ?? metadata.retryable,
  };
}
