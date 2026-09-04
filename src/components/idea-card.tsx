import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import FullScreenIcon from "@hugeicons/core-free-icons/FullScreenIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type Idea = NonNullable<FunctionReturnType<typeof api.ideas.latest>>;

function servingsLabel(count: number) {
  if (count === 1) {
    return "1 порція";
  }

  if (count >= 2 && count <= 4) {
    return `${count} порції`;
  }

  return `${count} порцій`;
}

function IdeaPhoto({ idea }: { idea: Idea }) {
  if (!idea.imageUrl || !idea.image) {
    return null;
  }

  return (
    <figure className="idea-photo">
      <img src={idea.imageUrl} alt={idea.title} loading="lazy" decoding="async" />
      <figcaption>
        <a href={idea.image.sourceUrl} target="_blank" rel="noreferrer">
          {idea.image.credit}
        </a>
      </figcaption>
    </figure>
  );
}

function IdeaMeta({ idea }: { idea: Idea }) {
  return (
    <p className="idea-meta">
      <span>
        <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.5} aria-hidden />
        {idea.timeMinutes} хв
      </span>
      <span>
        <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.5} aria-hidden />
        {servingsLabel(idea.servings)}
      </span>
    </p>
  );
}

export function IdeaCompact({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  return (
    <article className="idea-compact chrome" aria-label={idea.title}>
      <IdeaPhoto idea={idea} />
      <div className="plate plate-sm">
        <h2>{idea.title}</h2>
      </div>
      <IdeaMeta idea={idea} />
      <p className="idea-summary">{idea.summary}</p>
      <Button type="button" variant="outline" size="chip" onClick={onOpen}>
        Відкрити
      </Button>
    </article>
  );
}

export function IdeaPane({
  idea,
  fullscreen,
  onToggleFullscreen,
}: {
  idea: Idea;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <article className="idea-pane chrome" aria-label={idea.title}>
      <IdeaPhoto idea={idea} />
      <header className="idea-head">
        <div className="plate plate-sm">
          <h2>{idea.title}</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="chip"
          className="idea-fullscreen"
          aria-pressed={fullscreen}
          onClick={onToggleFullscreen}
        >
          <HugeiconsIcon
            icon={fullscreen ? ArrowLeft02Icon : FullScreenIcon}
            strokeWidth={1.5}
            aria-hidden
          />
          {fullscreen ? "Назад" : "На весь екран"}
        </Button>
      </header>
      <IdeaMeta idea={idea} />
      <p className="idea-summary">{idea.summary}</p>
      <Markdown text={idea.body} className="idea-body" />
      <h3 className="idea-section">Інгредієнти</h3>
      <ul className="ingredients">
        {idea.ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            <span>{ingredient.name}</span>
            {ingredient.amount && <span className="ingredient-amount">{ingredient.amount}</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function IdeaWaiting() {
  return (
    <div className="idea-pane chrome idea-waiting" aria-label="Ідея готується">
      <Skeleton className="h-9 w-3/5 rounded-[12px]" />
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
