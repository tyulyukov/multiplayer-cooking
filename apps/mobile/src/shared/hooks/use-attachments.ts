import { AI_MAX_IMAGES } from "@multiplayer-cooking/backend/convex/lib/ai_config";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";

import { resizeImage } from "@/shared/lib/upload-image";
import type { ComposerAttachment } from "@/shared/ui/composer/types";

export type AttachSource = "library" | "camera";

type PendingAttachment = ComposerAttachment & { storageId?: string };

const pick = async (source: AttachSource, limit: number) => {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Немає доступу до камери", "Дозволь доступ у Параметрах, щоб зробити фото.", [
        { text: "Скасувати", style: "cancel" },
        { text: "Параметри", onPress: () => void Linking.openSettings() },
      ]);

      return [];
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });

    return result.canceled ? [] : result.assets;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
  });

  return result.canceled ? [] : result.assets;
};

// Photos are resized and uploaded one by one as soon as they are picked; the send carries
// only storage ids. `upload` turns a local JPEG uri into a storage id; null disables adding.
export const useAttachments = (upload: ((fileUri: string) => Promise<string>) | null) => {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const itemsRef = useRef(items);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const changeItems = (change: (current: PendingAttachment[]) => PendingAttachment[]) => {
    if (!mounted.current) return;
    itemsRef.current = change(itemsRef.current);
    setItems(itemsRef.current);
  };

  const update = (id: string, patch: Partial<PendingAttachment>) => {
    changeItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const add = async (source: AttachSource) => {
    const remaining = AI_MAX_IMAGES - itemsRef.current.length;

    if (!upload || remaining <= 0) return;

    const assets = (await pick(source, remaining)).slice(0, remaining);
    const selected = assets.map((asset) => ({ asset, id: Crypto.randomUUID() }));

    changeItems((current) => [
      ...current,
      ...selected.map(({ asset, id }) => ({
        id,
        previewUrl: asset.uri,
        state: "uploading" as const,
      })),
    ]);

    for (const { asset, id } of selected) {
      if (!mounted.current || !itemsRef.current.some((item) => item.id === id)) continue;

      try {
        const fileUri = await resizeImage(asset.uri, asset.width, asset.height);
        const storageId = await upload(fileUri);

        update(id, { state: "done", storageId });
      } catch {
        update(id, { state: "error" });
      }
    }
  };

  const remove = (id: string) => {
    changeItems((current) => current.filter((entry) => entry.id !== id));
  };

  // Replaces the finished tiles with photos already in storage, for example a synced draft.
  // A photo still uploading keeps its tile so its result is not lost.
  const restore = (images: readonly { storageId: string; url: string }[]) => {
    changeItems((current) => [
      ...images.map((image) => ({
        id: image.storageId,
        previewUrl: image.url,
        state: "done" as const,
        storageId: image.storageId,
      })),
      ...current.filter((item) => item.state === "uploading"),
    ]);
  };

  const storageIds = items.flatMap((item) =>
    item.state === "done" && item.storageId ? [item.storageId] : [],
  );

  return { items, storageIds, add, remove, clear: () => restore([]), restore };
};
