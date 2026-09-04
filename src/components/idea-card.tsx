import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import FullScreenIcon from "@hugeicons/core-free-icons/FullScreenIcon";
import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import ShoppingBasketAdd01Icon from "@hugeicons/core-free-icons/ShoppingBasketAdd01Icon";
import UndoIcon from "@hugeicons/core-free-icons/UndoIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
import { CookTogether } from "@/components/cook-together";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type Idea = NonNullable<FunctionReturnType<typeof api.ideas.latest>>;

const hryvnia = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

function formatPrice(value: number) {
  return hryvnia.format(value);
}

function itemsLabel(count: number) {
  const tens = count % 100;
  const ones = count % 10;

  if (ones === 1 && tens !== 11) {
    return `${count} товар`;
  }

  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) {
    return `${count} товари`;
  }

  return `${count} товарів`;
}

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

function IdeaProducts({
  idea,
  canAddToCart,
  onAddToCart,
}: {
  idea: Idea;
  canAddToCart: boolean;
  onAddToCart: () => void;
}) {
  const products = idea.products ?? [];

  if (products.length === 0) {
    return null;
  }

  const matched = products.filter((product) => product.productId);
  const total = matched.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);

  let action = null;

  if (idea.cart) {
    action = (
      <div className="cart-done">
        <span>Додано {itemsLabel(idea.cart.itemCount)} у кошик</span>
        {idea.cart.checkoutWebLink && (
          <Button asChild variant="outline" size="chip">
            <a href={idea.cart.checkoutWebLink} target="_blank" rel="noreferrer">
              <HugeiconsIcon icon={LinkSquare01Icon} strokeWidth={1.5} aria-hidden />
              Відкрити кошик у Сільпо
            </a>
          </Button>
        )}
      </div>
    );
  } else if (matched.length > 0) {
    action = (
      <Button
        type="button"
        className="cart-button"
        disabled={!canAddToCart || idea.cartPending === true}
        aria-busy={idea.cartPending === true}
        onClick={onAddToCart}
      >
        <HugeiconsIcon icon={ShoppingBasketAdd01Icon} strokeWidth={1.5} aria-hidden />
        {idea.cartPending ? "Додаємо…" : "Додати в кошик"}
      </Button>
    );
  }

  return (
    <section className="idea-products" aria-label="Продукти в Сільпо">
      <h3 className="idea-section">Продукти в Сільпо</h3>
      <ul className="products">
        {products.map((product, index) => (
          <li key={`${product.ingredient}-${index}`} data-missing={!product.productId}>
            <span className="product-ingredient">{product.ingredient}</span>
            {product.productId ? (
              <>
                <span className="product-title">
                  {product.title ?? "Товар"}
                  {product.quantity > 1 && ` × ${product.quantity}`}
                </span>
                <span className="product-price">
                  {product.price !== undefined ? formatPrice(product.price * product.quantity) : ""}
                </span>
              </>
            ) : (
              <span className="product-title">не знайдено</span>
            )}
          </li>
        ))}
      </ul>
      {matched.length > 0 && (
        <p className="products-total">
          <span>Разом</span>
          <strong>{formatPrice(total)}</strong>
        </p>
      )}
      {idea.cartError && <p className="address-error">{idea.cartError}</p>}
      {action}
    </section>
  );
}

export type IdeaVersions = Readonly<{
  index: number;
  count: number;
  onSelect: (index: number) => void;
  onRestore: () => void;
  restoring: boolean;
}>;

// "Версія N з M": older versions are read-only until restored.
function VersionNav({ versions }: { versions: IdeaVersions }) {
  if (versions.count < 2) {
    return null;
  }

  const latest = versions.index === versions.count - 1;

  return (
    <nav className="version-nav" aria-label="Версії ідеї">
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
      <span className="version-label">
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
      {!latest && (
        <Button
          type="button"
          variant="outline"
          size="chip"
          disabled={versions.restoring}
          aria-busy={versions.restoring}
          onClick={versions.onRestore}
        >
          <HugeiconsIcon icon={UndoIcon} strokeWidth={1.5} aria-hidden />
          {versions.restoring ? "Повертаємо…" : "Повернути цю версію"}
        </Button>
      )}
    </nav>
  );
}

export function IdeaPane({
  idea,
  fullscreen,
  canAddToCart,
  versions,
  onToggleFullscreen,
  onAddToCart,
  onCookServings,
}: {
  idea: Idea;
  fullscreen: boolean;
  canAddToCart: boolean;
  versions: IdeaVersions;
  onToggleFullscreen: () => void;
  onAddToCart: () => void;
  onCookServings: (servings: number) => Promise<void> | void;
}) {
  return (
    <article className="idea-pane chrome" aria-label={idea.title}>
      <VersionNav versions={versions} />
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
      <IdeaProducts idea={idea} canAddToCart={canAddToCart} onAddToCart={onAddToCart} />
      <div className="idea-actions">
        <CookTogether
          defaultServings={idea.servings}
          savedServings={idea.cookServings}
          onGenerate={onCookServings}
        />
      </div>
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
