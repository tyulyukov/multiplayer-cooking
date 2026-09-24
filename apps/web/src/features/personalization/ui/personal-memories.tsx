import { cn } from "@/shared/lib/utils";
import styles from "@/features/personalization/ui/personal-settings.module.scss";
import Delete01Icon from "@hugeicons/core-free-icons/Delete01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import { Button } from "@/shared/ui/button";
import type { Memory } from "@/features/personalization/model/types";

import type { usePersonalSettings } from "../model/use-personal-settings";

const memoryLabels: Record<Memory["kind"], string> = {
  allergy: "Алергія",
  dislike: "Не подобається",
  preference: "Вподобання",
};

type Props = Pick<
  ReturnType<typeof usePersonalSettings>,
  "sortedMemories" | "deletingId" | "deleteMemory" | "deleteError"
> & { loading: boolean };

export function PersonalMemories({
  sortedMemories,
  deletingId,
  deleteMemory,
  deleteError,
  loading,
}: Props) {
  return (
    <section className={styles["personal-settings__memories"]} aria-live="polite">
      {loading ? <p className={styles["personal-settings__quiet"]}>Завантажуємо спогади…</p> : null}
      {!loading && sortedMemories.length === 0 ? (
        <div className={cn(styles["personal-settings__empty"], "illustrated-empty")}>
          <KitchenIllustration name="memory-fridge" />
          <p>Щойно щось стане для тебе важливим, агент збереже це тут.</p>
        </div>
      ) : null}
      {sortedMemories.map((memory) => (
        <article className={styles["personal-settings__memory"]} key={memory._id}>
          <div>
            <span
              className={cn(
                styles["personal-settings__memory-kind"],
                styles[`personal-settings__memory-kind--${memory.kind}`],
              )}
            >
              {memoryLabels[memory.kind]}
            </span>
            <p>{memory.text}</p>
            <time dateTime={new Date(memory.updatedAt).toISOString()}>
              {new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(memory.updatedAt)}
            </time>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Видалити спогад: ${memory.text}`}
            disabled={deletingId === memory._id}
            onClick={() => void deleteMemory(memory._id)}
          >
            <HugeiconsIcon icon={Delete01Icon} strokeWidth={1.5} aria-hidden />
          </Button>
        </article>
      ))}
      {deleteError ? (
        <p className={styles["personal-settings__error"]} role="alert">
          {deleteError}
        </p>
      ) : null}
    </section>
  );
}
