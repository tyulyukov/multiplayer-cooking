import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import type { Idea } from "@/features/ideas/model/types";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";

export function IdeaCompact({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      className="idea-peek"
      onClick={onOpen}
      aria-label={`Відкрити ідею: ${idea.title}`}
    >
      {idea.imageUrl && !imageFailed && (
        <img
          src={proxyConvexStorageUrl(idea.imageUrl)}
          alt=""
          onError={() => setImageFailed(true)}
        />
      )}
      <span>
        <small>Ідея готова</small>
        <strong>{idea.title}</strong>
      </span>
      <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.5} aria-hidden />
    </button>
  );
}
