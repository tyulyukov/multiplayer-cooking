import styles from "@/features/ideas/ui/idea-card.module.scss";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import UndoIcon from "@hugeicons/core-free-icons/UndoIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/shared/ui/button";
import type { IdeaVersions } from "@/features/ideas/model/types";

// "Версія N з M": older versions are read-only until restored.
export function VersionNav({ versions }: { versions: IdeaVersions }) {
  if (versions.count < 2) {
    return null;
  }

  const latest = versions.index === versions.count - 1;

  return (
    <nav className={styles["version-nav"]} aria-label="Версії ідеї">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Попередня версія"
        disabled={versions.index === 0}
        onClick={() => versions.onSelect(versions.index - 1)}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} aria-hidden />
      </Button>
      <span className={styles["version-label"]}>
        Версія {versions.index + 1} з {versions.count}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Наступна версія"
        disabled={latest}
        onClick={() => versions.onSelect(versions.index + 1)}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} aria-hidden />
      </Button>
      <div className={styles["version-restore"]} data-available={!latest}>
        <Button
          type="button"
          variant="outline"
          size="chip"
          disabled={latest || versions.restoring}
          tabIndex={latest ? -1 : undefined}
          aria-hidden={latest || undefined}
          aria-busy={versions.restoring}
          onClick={versions.onRestore}
        >
          <HugeiconsIcon icon={UndoIcon} strokeWidth={1.5} aria-hidden />
          {versions.restoring ? "Повертаємо…" : "Повернути цю версію"}
        </Button>
      </div>
    </nav>
  );
}
