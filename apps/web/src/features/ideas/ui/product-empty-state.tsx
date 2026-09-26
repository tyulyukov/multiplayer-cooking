import type { FC } from "react";
import { useState } from "react";
import type { Idea } from "@/features/ideas/model/types";
import styles from "./product-empty-state.module.scss";

type ProductEmptyStateProps = {
  ingredients: Idea["ingredients"];
  status: Idea["productsStatus"];
};

export const ProductEmptyState: FC<ProductEmptyStateProps> = ({ ingredients, status }) => {
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
      <div className={imageFailed ? styles["products-empty-text-only"] : undefined}>
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
