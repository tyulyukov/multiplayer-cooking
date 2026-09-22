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
    <section className="personal-settings__memories" aria-live="polite">
      {loading ? <p className="personal-settings__quiet">Завантажуємо спогади…</p> : null}
      {!loading && sortedMemories.length === 0 ? (
        <div className="personal-settings__empty illustrated-empty">
          <KitchenIllustration name="memory-fridge" />
          <p>Щойно щось стане для тебе важливим, агент збереже це тут.</p>
        </div>
      ) : null}
      {sortedMemories.map((memory) => (
        <article className="personal-settings__memory" key={memory._id}>
          <div>
            <span
              className={`personal-settings__memory-kind personal-settings__memory-kind--${memory.kind}`}
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
        <p className="personal-settings__error" role="alert">
          {deleteError}
        </p>
      ) : null}
    </section>
  );
}
