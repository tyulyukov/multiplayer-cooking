import { ReferencePlaceholder } from "./reference-placeholder";
import type { FC } from "react";
import cookingStyles from "@/features/cooking/ui/cooking-reference.module.scss";
import { cn } from "@/shared/lib/utils";
import { useEffect, useState } from "react";
import type { CookingRoomData } from "@/features/cooking/model/types";
import { Button } from "@/shared/ui/button";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";

type ImageStatus = CookingRoomData["steps"][number]["imageStatus"];

type CookingReferenceProps = {
  imageUrl?: string;
  status?: ImageStatus;
  alt: string;
  disabled: boolean;
  onRetry: () => void;
};

export const CookingReference: FC<CookingReferenceProps> = ({
  imageUrl,
  status,
  alt,
  disabled,
  onRetry,
}) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => setShowPlaceholder(false), 400);

    return () => window.clearTimeout(timer);
  }, [loaded]);

  if (failed)
    return (
      <p className={cookingStyles["cooking-image-error"]} role="alert">
        Зображення не завантажилось.{" "}
        <Button
          size="chip"
          variant="ghost"
          onClick={() => {
            setFailed(false);
            setLoaded(false);
            setShowPlaceholder(true);
            setAttempt((value) => value + 1);
          }}
        >
          Завантажити ще раз
        </Button>
      </p>
    );

  // The dither animation means "the model is drawing". A stored image that is still downloading
  // shows the static grid and the caption, so a reload never looks like another generation.
  if (imageUrl || status === "pending")
    return (
      <figure
        className={cn(
          cookingStyles["cooking-reference-figure"],
          loaded && cookingStyles["is-revealed"],
        )}
      >
        <div className={cookingStyles["cooking-reference-slot"]}>
          {showPlaceholder && <ReferencePlaceholder animate={!imageUrl} />}
          {imageUrl && (
            <img
              key={attempt}
              className={cookingStyles["cooking-reference"]}
              src={proxyConvexStorageUrl(imageUrl)}
              alt={alt}
              decoding="async"
              width={600}
              height={400}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>
        {imageUrl ? (
          <figcaption>{alt}</figcaption>
        ) : (
          <figcaption role="status">
            <i aria-hidden />
            Готуємо зображення…
          </figcaption>
        )}
      </figure>
    );

  return (
    <p className={cookingStyles["cooking-image-error"]}>
      {status === "error"
        ? "Не вдалося створити зображення."
        : "Для цього кроку є візуальна підказка."}{" "}
      <Button size="chip" variant="ghost" disabled={disabled} onClick={onRetry}>
        {status === "error" ? "Спробувати ще раз" : "Створити зображення"}
      </Button>
    </p>
  );
};
