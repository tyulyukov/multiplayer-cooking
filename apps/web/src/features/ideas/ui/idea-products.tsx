import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import styles from "@/features/ideas/ui/idea-card.module.scss";
import { productRegistryKey } from "@multiplayer-cooking/backend/convex/lib/ingredient";
import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import ShoppingBasketAdd01Icon from "@hugeicons/core-free-icons/ShoppingBasketAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import type { Idea } from "@/features/ideas/model/types";

import { formatPrice, formatQuantity } from "../lib/idea-format";
import { getIdeaProducts } from "../lib/idea-products";
import { IdeaCart } from "./idea-cart";

type ProductThumbnailProps = { url: string };

const ProductThumbnail: FC<ProductThumbnailProps> = ({ url }) => {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <div className={styles["product-thumbnail"]} data-state={state}>
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
};

type IdeaProductsProps = {
  idea: Idea;
  canAddToCart: boolean;
  onAddToCart: () => void;
};

export const IdeaProducts: FC<IdeaProductsProps> = ({ idea, canAddToCart, onAddToCart }) => {
  const { matched, missing, total, noMatches } = getIdeaProducts(idea);
  return (
    <section className={styles["idea-products"]} aria-label="Продукти в Сільпо">
      <h3 className={styles["idea-section"]}>Продукти в Сільпо</h3>
      {noMatches ? (
        <ProductEmptyState ingredients={missing} status={idea.productsStatus} />
      ) : (
        <ul className={styles["products"]}>
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
                <div className={styles["product-info"]}>
                  <span className={styles["product-ingredient"]}>
                    {product.ingredient}
                    {amount && ` · ${amount}`}
                  </span>
                  {product.productId ? (
                    <>
                      {product.productUrl ? (
                        <a
                          className={cn(styles["product-title"], styles["product-link"])}
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
                        <span className={styles["product-title"]}>{product.title ?? "Товар"}</span>
                      )}
                      <span className={styles["product-unit"]}>
                        {product.unit}
                        {product.quantity !== 1 && ` × ${formatQuantity(product.quantity)}`}
                      </span>
                    </>
                  ) : (
                    <span className={styles["product-title"]}>Не знайдено в Сільпо</span>
                  )}
                </div>
                {product.productId && (
                  <span className={styles["product-price"]}>
                    {product.price === undefined ? (
                      "Ціна уточнюється"
                    ) : product.oldPrice !== undefined && product.oldPrice > product.price ? (
                      <span className={styles["product-price-sale"]}>
                        <span className={styles["product-price-current"]}>
                          {formatPrice(product.price * product.quantity)}
                        </span>
                        <s className={styles["product-price-original"]}>
                          {formatPrice(product.oldPrice * product.quantity)}
                        </s>
                        <span className={styles["product-price-discount"]}>
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
        <section className={styles["missing-ingredients"]} aria-label="Немає в Сільпо">
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
        <p className={styles["products-total"]}>
          <span>Разом, без доставки</span>
          <strong>{formatPrice(total)}</strong>
        </p>
      )}
      {matched.some((product) => product.price === undefined) && (
        <p className={styles["cart-note"]}>Товари без ціни в суму не входять.</p>
      )}
      {idea.cartError && <p className="address-error">{idea.cartError}</p>}
      <IdeaCart
        idea={idea}
        canAddToCart={canAddToCart}
        onAddToCart={onAddToCart}
        matchedCount={matched.length}
      />
    </section>
  );
};

type ProductEmptyStateProps = {
  ingredients: Idea["ingredients"];
  status: Idea["productsStatus"];
};

const ProductEmptyState: FC<ProductEmptyStateProps> = ({ ingredients, status }) => {
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
      description: "Вийди з профілю та підключи Сільпо знову або купи інгредієнти окремо.",
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
    <section className={styles["products-empty"]} aria-label={title}>
      {!imageFailed && (
        <img src="/images/ingredients-basket.webp" alt="" onError={() => setImageFailed(true)} />
      )}
      <div className={imageFailed ? "products-empty-text-only" : undefined}>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <ul className={styles["missing-ingredients-list"]}>
        {ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            <span>{ingredient.name}</span>
            {ingredient.amount && <span>{ingredient.amount}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
};
