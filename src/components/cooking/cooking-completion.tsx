import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Button } from "@/components/ui/button";
import { proxyConvexStorageUrl } from "@/lib/convex-url";
import { CompletionConfetti } from "./completion-confetti";
import type { CookingActions, CookingRoomData } from "./cooking-session";
import "./cooking-completion.css";

export function CookingCompletion({
  data,
  actions,
  onInstructions,
}: {
  data: CookingRoomData;
  actions: Pick<CookingActions, "cookAgain" | "online" | "busy">;
  onInstructions: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const photo = data.room.dishImage;
  const showPhoto = photo && photo.url !== failedImage;
  const cooks = data.room.cookCount;
  const servings = data.room.plan?.servings ?? data.room.requestedServings;
  const plural = new Intl.PluralRules("uk");
  const cookLabel = plural.select(cooks);
  const servingLabel = plural.select(servings);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="cooking-completion" aria-labelledby="completion-heading">
      <CompletionConfetti />
      <div className="completion-ticket">
        <div className="sign completion-sign">
          <h1 ref={heading} id="completion-heading" tabIndex={-1}>
            Смачного!
          </h1>
        </div>
        <div className="completion-dish">
          {showPhoto && (
            <figure className="completion-photo">
              <img
                src={proxyConvexStorageUrl(photo.url)}
                alt={data.room.source.title}
                width={800}
                height={500}
                onError={() => setFailedImage(photo.url)}
              />
              {photo.credit && photo.sourceUrl && (
                <figcaption>
                  <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                    {photo.credit}
                  </a>
                </figcaption>
              )}
            </figure>
          )}
          <h2>{data.room.source.title}</h2>
          <p className="completion-meta">
            {cooks} {cookLabel === "one" ? "кухар" : cookLabel === "few" ? "кухарі" : "кухарів"}
            {" · "}
            {servings}{" "}
            {servingLabel === "one" ? "порція" : servingLabel === "few" ? "порції" : "порцій"}
          </p>
          {photo && !showPhoto && (
            <p className="completion-photo-error" role="status">
              Фото не завантажилося.
            </p>
          )}
        </div>
        <div className="completion-actions">
          {!actions.online && (
            <p className="completion-photo-error" role="status">
              Немає зв’язку. Інструкції доступні.
            </p>
          )}
          <Button size="xl" onClick={actions.cookAgain} disabled={!actions.online || actions.busy}>
            Приготувати ще раз
          </Button>
          <Button variant="outline" size="xl" onClick={onInstructions}>
            <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={1.5} aria-hidden />
            До інструкцій
          </Button>
        </div>
        <div className="completion-ticket-edge" aria-hidden />
      </div>
      <KitchenIllustration name="serving-bell" className="completion-bell" />
    </section>
  );
}
