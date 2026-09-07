import { productRegistryKey } from "../../convex/lib/ingredient";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import ShoppingBasketAdd01Icon from "@hugeicons/core-free-icons/ShoppingBasketAdd01Icon";
import UndoIcon from "@hugeicons/core-free-icons/UndoIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";

import type { api } from "../../convex/_generated/api";
import { CookTogether } from "@/components/cook-together";
import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import "./product-price.css";

export type Idea = NonNullable<FunctionReturnType<typeof api.ideas.latest>>;

const hryvnia = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

function formatPrice(value: number) {
  return hryvnia.format(value);
}

const quantityFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });

function formatQuantity(value: number) {
  return quantityFormat.format(value);
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
  const [failed, setFailed] = useState(false);

  if (!idea.imageUrl || !idea.image) {
    return <IdeaImageNotice message={idea.imageError} />;
  }

  if (failed) {
    return <IdeaImageNotice message={idea.imageError ?? "Спробуй відкрити ідею ще раз."} />;
  }

  return (
    <figure className="idea-photo">
      <img
        src={idea.imageUrl}
        alt={idea.title}
        loading="lazy"
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
}

function IdeaImageNotice({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="idea-image-notice">
      <KitchenIllustration name="serving-dome" />
      <Alert variant="destructive" className="idea-image-error">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
        <div>
          <AlertTitle>Фото страви не завантажилося</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </Alert>
    </div>
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
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      className="idea-peek"
      onClick={onOpen}
      aria-label={`Відкрити ідею: ${idea.title}`}
    >
      {idea.imageUrl && !imageFailed && (
        <img src={idea.imageUrl} alt="" onError={() => setImageFailed(true)} />
      )}
      <span>
        <small>Ідея готова</small>
        <strong>{idea.title}</strong>
      </span>
      <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.5} aria-hidden />
    </button>
  );
}

function ProductThumbnail({ url }: { url: string }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <div className="product-thumbnail" data-state={state}>
      {state !== "failed" && (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
        />
      )}
      {state === "failed" && (
        <HugeiconsIcon icon={ShoppingBasketAdd01Icon} size={20} strokeWidth={1.5} aria-hidden />
      )}
    </div>
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

  const matched = products.filter((product) => product.productId);
  const matchedIngredients = new Set(
    matched.map((product) => productRegistryKey(product.ingredient)),
  );
  const missing = idea.ingredients.filter(
    (ingredient) => !matchedIngredients.has(productRegistryKey(ingredient.name)),
  );
  const total = matched.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);
  const noMatches = matched.length === 0;

  let action = null;

  if (idea.cart) {
    action = (
      <div className="cart-done" aria-busy={idea.cartPending === true}>
        <div className="cart-heading-row">
          {!idea.cartPending && <KitchenIllustration name="basket-filled" />}
          <div className="cart-heading">
            <strong>Кошик Сільпо</strong>
            <span>{idea.cartPending ? "Оновлюємо…" : "Готовий до перевірки"}</span>
          </div>
        </div>
        <div className="cart-overview">
          <div className="cart-payable">
            <span>До сплати</span>
            <strong>
              {idea.cart.total === undefined ? "Уточнюється" : formatPrice(idea.cart.total)}
            </strong>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Оновити суму кошика"
            title="Оновити суму кошика"
            disabled={!canAddToCart || idea.cartPending === true}
            onClick={onAddToCart}
          >
            <HugeiconsIcon icon={RefreshIcon} size={20} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
        {idea.cart.checkoutWebLink && (
          <Button asChild variant="outline" size="chip">
            <a href={idea.cart.checkoutWebLink} target="_blank" rel="noreferrer">
              <HugeiconsIcon icon={LinkSquare01Icon} strokeWidth={1.5} aria-hidden />
              Перевірити й оформити
            </a>
          </Button>
        )}
        {idea.cart.warnings?.length ? (
          <div className="cart-warnings" role="status">
            <strong>Перевір товари перед замовленням</strong>
            {idea.cart.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
        <details className="cart-details">
          <summary>Деталі кошика</summary>
          <div className="cart-details-content">
            <dl className="cart-breakdown">
              {idea.cart.productsTotal !== undefined && (
                <div>
                  <dt>Товари</dt>
                  <dd>{formatPrice(idea.cart.productsTotal)}</dd>
                </div>
              )}
              <div>
                <dt>Доставка</dt>
                <dd>
                  {idea.cart.deliveryTotal === undefined
                    ? "Уточнюється"
                    : formatPrice(idea.cart.deliveryTotal)}
                </dd>
              </div>
            </dl>
            {idea.cart.discount !== undefined && idea.cart.discount > 0 && (
              <p className="cart-discount">
                Вже враховано {formatPrice(idea.cart.discount)} знижки
              </p>
            )}
            <p className="cart-note">
              Сума всього кошика разом із раніше доданими товарами. Остаточну суму Сільпо уточнить
              при оформленні.
            </p>
          </div>
        </details>
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
        {idea.cartPending ? (
          <span className="t-shimmer">Додаємо в кошик…</span>
        ) : (
          `Додати ${itemsLabel(matched.length)} у кошик`
        )}
      </Button>
    );
  }

  return (
    <section className="idea-products" aria-label="Продукти в Сільпо">
      <h3 className="idea-section">Продукти в Сільпо</h3>
      {noMatches ? (
        <ProductEmptyState ingredients={missing} status={idea.productsStatus} />
      ) : (
        <ul className="products">
          {matched.map((product, index) => {
            const amount = idea.ingredients.find(
              (ingredient) =>
                productRegistryKey(ingredient.name) === productRegistryKey(product.ingredient),
            )?.amount;
            return (
              <li
                key={`${product.ingredient}-${index}`}
                data-missing={!product.productId}
                data-photo={Boolean(product.imageUrl)}
              >
                {product.imageUrl && (
                  <ProductThumbnail key={product.imageUrl} url={product.imageUrl} />
                )}
                <div className="product-info">
                  <span className="product-ingredient">
                    {product.ingredient}
                    {amount && ` · ${amount}`}
                  </span>
                  {product.productId ? (
                    <>
                      {product.productUrl ? (
                        <a
                          className="product-title product-link"
                          href={product.productUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {product.title ?? "Товар"}
                          <HugeiconsIcon
                            icon={LinkSquare01Icon}
                            size={14}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </a>
                      ) : (
                        <span className="product-title">{product.title ?? "Товар"}</span>
                      )}
                      <span className="product-unit">
                        {product.unit}
                        {product.quantity !== 1 && ` × ${formatQuantity(product.quantity)}`}
                      </span>
                    </>
                  ) : (
                    <span className="product-title">Не знайдено в Сільпо</span>
                  )}
                </div>
                {product.productId && (
                  <span className="product-price">
                    {product.price === undefined ? (
                      "Ціна уточнюється"
                    ) : product.oldPrice !== undefined && product.oldPrice > product.price ? (
                      <span className="product-price-sale">
                        <span className="product-price-current">
                          {formatPrice(product.price * product.quantity)}
                        </span>
                        <s className="product-price-original">
                          {formatPrice(product.oldPrice * product.quantity)}
                        </s>
                        <span className="product-price-discount">
                          −{Math.round((1 - product.price / product.oldPrice) * 100)}%
                        </span>
                      </span>
                    ) : (
                      formatPrice(product.price * product.quantity)
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {matched.length > 0 && missing.length > 0 && (
        <section className="missing-ingredients" aria-label="Немає в Сільпо">
          <h4>Немає в Сільпо, купи окремо</h4>
          <ul>
            {missing.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                <span>{ingredient.name}</span>
                {ingredient.amount && <span>{ingredient.amount}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {matched.length > 0 && (
        <p className="products-total">
          <span>Разом, без доставки</span>
          <strong>{formatPrice(total)}</strong>
        </p>
      )}
      {matched.some((product) => product.price === undefined) && (
        <p className="cart-note">Товари без ціни в суму не входять.</p>
      )}
      {idea.cartError && <p className="address-error">{idea.cartError}</p>}
      {action}
    </section>
  );
}

function ProductEmptyState({
  ingredients,
  status,
}: {
  ingredients: Idea["ingredients"];
  status: Idea["productsStatus"];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const messages = {
    unavailable: {
      title: "Сільпо зараз не відповідає",
      description: "Спробуй підібрати товари пізніше. А поки купи інгредієнти окремо.",
    },
    empty: {
      title: "У Сільпо не знайшлося товарів",
      description: "Купи ці інгредієнти окремо.",
    },
    not_connected: {
      title: "Потрібно підключити Сільпо",
      description: "Перепідключи Сільпо в меню профілю або купи інгредієнти окремо.",
    },
    needs_address: {
      title: "Для товарів потрібна адреса",
      description: "Вкажи адресу доставки у формі або купи інгредієнти окремо.",
    },
  };
  const { title, description } = status
    ? messages[status]
    : {
        title: "Товари Сільпо ще не підібрано",
        description: "Купи ці інгредієнти окремо.",
      };

  return (
    <section className="products-empty" aria-label={title}>
      {!imageFailed && (
        <img src="/images/ingredients-basket.webp" alt="" onError={() => setImageFailed(true)} />
      )}
      <div className={imageFailed ? "products-empty-text-only" : undefined}>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <ul className="missing-ingredients-list">
        {ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            <span>{ingredient.name}</span>
            {ingredient.amount && <span>{ingredient.amount}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export type IdeaVersions = Readonly<{
  index: number;
  count: number;
  onSelect: (index: number) => void;
  onRestore: () => void;
  restoring: boolean;
  restoreError: string | null;
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
      <div className="version-restore" data-available={!latest}>
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

export function IdeaPane({
  idea,
  canAddToCart,
  versions,
  onAddToCart,
  onCookCount,
}: {
  idea: Idea;
  canAddToCart: boolean;
  versions: IdeaVersions;
  onAddToCart: () => void;
  onCookCount: (count: number) => Promise<void> | void;
}) {
  return (
    <article className="idea-pane chrome" aria-label={idea.title}>
      <VersionNav versions={versions} />
      {versions.restoreError && (
        <Alert variant="destructive" className="idea-image-error">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
          <AlertDescription>{versions.restoreError}</AlertDescription>
        </Alert>
      )}
      <IdeaPhoto key={idea.imageUrl ?? idea._id} idea={idea} />
      <header className="idea-head">
        <div className="plate plate-sm">
          <h2>{idea.title}</h2>
        </div>
      </header>
      <IdeaMeta idea={idea} />
      <p className="idea-summary">{idea.summary}</p>
      <Markdown text={idea.body} className="idea-body" />
      <IdeaProducts idea={idea} canAddToCart={canAddToCart} onAddToCart={onAddToCart} />
      <div className="idea-actions">
        <CookTogether savedCount={idea.cookCount} onGenerate={onCookCount} />
      </div>
    </article>
  );
}
