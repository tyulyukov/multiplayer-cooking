import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import ShoppingBasketAdd01Icon from "@hugeicons/core-free-icons/ShoppingBasketAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import { Button } from "@/shared/ui/button";
import type { Idea } from "@/features/ideas/model/types";

import { formatPrice, itemsLabel } from "../lib/idea-format";

export function IdeaCart({
  idea,
  canAddToCart,
  onAddToCart,
  matchedCount,
}: {
  idea: Idea;
  canAddToCart: boolean;
  onAddToCart: () => void;
  matchedCount: number;
}) {
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
  } else if (matchedCount > 0) {
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
          `Додати ${itemsLabel(matchedCount)} у кошик`
        )}
      </Button>
    );
  }

  return action;
}
