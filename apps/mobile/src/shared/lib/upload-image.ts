import {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_EDGE,
} from "@multiplayer-cooking/backend/convex/lib/ai_config";
import { isPlainObject, isString } from "@multiplayer-cooking/core/shared/type-guards";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const jpegQuality = 0.85;

function isUploadResponse(value: unknown): value is { storageId: string } {
  return isPlainObject(value) && "storageId" in value && isString(value.storageId);
}

// Same bounds as the web: longest edge IMAGE_UPLOAD_MAX_EDGE, JPEG 0.85.
export const resizeImage = async (uri: string, width: number, height: number) => {
  const scale = Math.min(1, IMAGE_UPLOAD_MAX_EDGE / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri);

  if (scale < 1) {
    context.resize({ width: Math.max(1, Math.round(width * scale)) });
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: jpegQuality, format: SaveFormat.JPEG });

  return result.uri;
};

// POSTs a local JPEG to a Convex upload URL and returns its storage id. React Native's global
// fetch sends a Blob read from a file:// URI as an empty body (Convex answers 400), so the
// file goes through expo/fetch, which streams an expo-file-system File.
export const uploadImage = async (uploadUrl: string, fileUri: string) => {
  const file = new File(fileUri);

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("Image is too large after resizing");
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }

  const payload: unknown = await response.json();

  if (!isUploadResponse(payload)) {
    throw new Error("Unexpected upload response");
  }

  return payload.storageId;
};
