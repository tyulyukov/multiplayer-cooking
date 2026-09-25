import type { FC } from "react";
import styles from "@/features/ideas/ui/idea-card.module.scss";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import type { Idea } from "@/features/ideas/model/types";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";

type IdeaPhotoProps = { idea: Idea };

export const IdeaPhoto: FC<IdeaPhotoProps> = ({ idea }) => {
  const [failed, setFailed] = useState(false);

  if (!idea.imageUrl || !idea.image) {
    return <IdeaImageNotice message={idea.imageError} />;
  }

  if (failed) {
    return <IdeaImageNotice message={idea.imageError ?? "Спробуй відкрити ідею ще раз."} />;
  }

  return (
    <figure className={styles["idea-photo"]}>
      <img
        src={proxyConvexStorageUrl(idea.imageUrl)}
        alt={idea.title}
        fetchPriority="high"
        decoding="async"
        onError={() => setFailed(true)}
      />
      {idea.image.sourceUrl && idea.image.credit && (
        <figcaption>
          <a href={idea.image.sourceUrl} target="_blank" rel="noreferrer">
            {idea.image.credit}
          </a>
        </figcaption>
      )}
    </figure>
  );
};

type IdeaImageNoticeProps = { message?: string };

const IdeaImageNotice: FC<IdeaImageNoticeProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className={styles["idea-image-notice"]}>
      <KitchenIllustration name="serving-dome" />
      <Alert variant="destructive" className={styles["idea-image-error"]}>
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
        <div>
          <AlertTitle>Фото страви не завантажилося</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </Alert>
    </div>
  );
};
