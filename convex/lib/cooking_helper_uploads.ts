import { IMAGE_UPLOAD_MAX_BYTES } from "./ai_config";

export const HELPER_UPLOAD_LIFETIME_MS = 10 * 60_000;
export const HELPER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isHelperImageType(
  contentType: string,
): contentType is (typeof HELPER_IMAGE_TYPES)[number] {
  return (
    contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp"
  );
}

export function isValidHelperImage(
  file: { contentType?: string; size: number } | null,
): file is { contentType: (typeof HELPER_IMAGE_TYPES)[number]; size: number } {
  return Boolean(
    file &&
    file.contentType &&
    isHelperImageType(file.contentType) &&
    file.size >= 1 &&
    file.size <= IMAGE_UPLOAD_MAX_BYTES,
  );
}
