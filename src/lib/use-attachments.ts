import { useEffect, useRef, useState } from "react";
import type { ComposerAttachment } from "@/components/composer";
import { resizeImage } from "@/lib/images";
import { AI_MAX_IMAGES } from "../../convex/lib/ai_config";

type PendingAttachment = ComposerAttachment & { storageId?: string };

// Photos are resized and uploaded as soon as they are picked; the send carries only storage ids.
export function useAttachments(upload: ((blob: Blob) => Promise<string>) | null) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const itemsRef = useRef(items);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  function changeItems(change: (current: PendingAttachment[]) => PendingAttachment[]) {
    if (!mounted.current) return;
    itemsRef.current = change(itemsRef.current);
    setItems(itemsRef.current);
  }

  function update(id: string, patch: Partial<PendingAttachment>) {
    changeItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function add(files: File[]) {
    if (!upload) {
      return;
    }

    const selected = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, AI_MAX_IMAGES - itemsRef.current.length))
      .map((file) => ({ file, id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file) }));
    changeItems((current) => [
      ...current,
      ...selected.map(({ id, previewUrl }) => ({ id, previewUrl, state: "uploading" as const })),
    ]);

    for (const { file, id } of selected) {
      if (!mounted.current || !itemsRef.current.some((item) => item.id === id)) continue;
      try {
        const blob = await resizeImage(file);
        const storageId = await upload(blob);

        update(id, { state: "done", storageId });
      } catch {
        update(id, { state: "error" });
      }
    }
  }

  function remove(id: string) {
    changeItems((current) => {
      const item = current.find((entry) => entry.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((entry) => entry.id !== id);
    });
  }

  // Replaces the finished tiles with photos already in storage, for example a draft saved on
  // another device. A photo still uploading keeps its tile so its result is not lost.
  function restore(images: readonly { storageId: string; url: string }[]) {
    changeItems((current) => {
      const uploading = current.filter((item) => item.state === "uploading");

      for (const item of current) {
        if (item.state !== "uploading") URL.revokeObjectURL(item.previewUrl);
      }

      return [
        ...images.map((image) => ({
          id: image.storageId,
          previewUrl: image.url,
          state: "done" as const,
          storageId: image.storageId,
        })),
        ...uploading,
      ];
    });
  }

  const storageIds = items.flatMap((item) =>
    item.state === "done" && item.storageId ? [item.storageId] : [],
  );

  return { items, storageIds, add, remove, clear: () => restore([]), restore };
}
