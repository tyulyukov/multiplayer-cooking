import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MAX_EDGE } from "../../convex/lib/ai_config";

const jpegQuality = 0.85;

// Photos are resized in the browser so uploads stay small and the model gets a bounded image.
export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_UPLOAD_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Canvas is not available");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", jpegQuality),
  );

  if (!blob) {
    throw new Error("Image encoding failed");
  }

  if (blob.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("Image is too large after resizing");
  }

  return blob;
}

export async function uploadImage(uploadUrl: string, blob: Blob): Promise<string> {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": blob.type },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }

  const { storageId } = (await response.json()) as { storageId: string };

  return storageId;
}
