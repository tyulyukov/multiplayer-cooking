import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/features/ideas/ui/idea-card.module.scss";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { CookTogether } from "@/features/cooking/ui/cook-together";
import { Markdown } from "@/shared/ui/markdown";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import type { Idea, IdeaVersions } from "@/features/ideas/model/types";
import type { CookingSetup } from "@/features/cooking/model/types";

import { servingsLabel } from "../lib/idea-format";
import { IdeaPhoto } from "./idea-photo";
import { IdeaProducts } from "./idea-products";
import { VersionNav } from "./idea-version-nav";

export { IdeaCompact } from "./idea-compact";

type IdeaMetaProps = { idea: Idea };

const IdeaMeta: FC<IdeaMetaProps> = ({ idea }) => {
  return (
    <p className={styles["idea-meta"]}>
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
};

type IdeaPaneProps = {
  idea: Idea;
  canAddToCart: boolean;
  versions: IdeaVersions;
  onAddToCart: () => void;
  onCookCount: (setup: CookingSetup) => Promise<void> | void;
  profileName?: string;
};

export const IdeaPane: FC<IdeaPaneProps> = ({
  idea,
  canAddToCart,
  versions,
  onAddToCart,
  onCookCount,
  profileName,
}) => {
  return (
    <article className={cn(styles["idea-pane"], "chrome")} aria-label={idea.title}>
      <div
        className={styles["idea-pane-scroll"]}
        role="region"
        aria-label={idea.title}
        tabIndex={0}
      >
        <VersionNav versions={versions} />
        {versions.restoreError && (
          <Alert variant="destructive" className={styles["idea-image-error"]}>
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
            <AlertDescription>{versions.restoreError}</AlertDescription>
          </Alert>
        )}
        <IdeaPhoto key={idea.imageUrl ?? idea._id} idea={idea} />
        <header className={styles["idea-head"]}>
          <div className="plate plate-sm">
            <h2>{idea.title}</h2>
          </div>
        </header>
        <IdeaMeta idea={idea} />
        <p className={styles["idea-summary"]}>{idea.summary}</p>
        <Markdown text={idea.body} />
        <IdeaProducts idea={idea} canAddToCart={canAddToCart} onAddToCart={onAddToCart} />
        <div className={styles["idea-actions"]}>
          <CookTogether
            servings={idea.servings}
            cookCount={idea.cookCount ?? 1}
            profileName={profileName}
            onGenerate={onCookCount}
          />
        </div>
      </div>
    </article>
  );
};
