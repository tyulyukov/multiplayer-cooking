import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import ShoppingBasket01Icon from "@hugeicons/core-free-icons/ShoppingBasket01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { productRegistryKey } from "@multiplayer-cooking/backend/convex/lib/ingredient";
import { formatPrice, formatQuantity } from "@multiplayer-cooking/core/ideas/idea-format";
import { getIdeaProducts } from "@multiplayer-cooking/core/ideas/idea-products";
import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import { colors } from "@multiplayer-cooking/theme";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Illustration } from "@/shared/ui/illustration";
import { NeonLine } from "@/shared/ui/neon-line";
import { Text } from "@/shared/ui/text";

type Product = NonNullable<Idea["products"]>[number];

type Ingredient = Idea["ingredients"][number];

const emptyMessages = {
  unavailable: {
    title: "Сільпо зараз не відповідає",
    description: "Спробуй підібрати товари пізніше. А поки купи інгредієнти окремо.",
  },
  empty: { title: "У Сільпо не знайшлося товарів", description: "Купи ці інгредієнти окремо." },
  not_connected: {
    title: "Потрібно підключити Сільпо",
    description: "Вийди з профілю та підключи Сільпо знову або купи інгредієнти окремо.",
  },
  needs_address: {
    title: "Для товарів потрібна адреса",
    description: "Вкажи адресу доставки в розмові або купи інгредієнти окремо.",
  },
};

const notMatched = {
  title: "Товари Сільпо ще не підібрано",
  description: "Купи ці інгредієнти окремо.",
};

export function IdeaProducts({ idea }: { idea: Idea }) {
  const { matched, missing, noMatches } = getIdeaProducts(idea);

  return (
    <View accessibilityLabel="Продукти в Сільпо" style={styles.section}>
      <NeonLine />
      <Text role="heading" variant="label" color={colors.mutedForeground} style={styles.rail}>
        Продукти в Сільпо
      </Text>
      {noMatches ? (
        <ProductsEmpty ingredients={missing} status={idea.productsStatus} />
      ) : (
        <View style={styles.rows}>
          {matched.map((product, index) => (
            <ProductRow
              key={`${product.ingredient}-${index}`}
              product={product}
              amount={
                idea.ingredients.find(
                  (ingredient) =>
                    productRegistryKey(ingredient.name) === productRegistryKey(product.ingredient),
                )?.amount
              }
            />
          ))}
        </View>
      )}
      {matched.length > 0 && missing.length > 0 ? (
        <View accessibilityLabel="Немає в Сільпо" style={styles.missing}>
          <Text variant="tag">Немає в Сільпо, купи окремо</Text>
          <IngredientList ingredients={missing} />
        </View>
      ) : null}
    </View>
  );
}

function ProductRow({ product, amount }: { product: Product; amount?: string }) {
  const title = product.title ?? "Товар";
  const { productUrl } = product;

  return (
    <View style={styles.row}>
      <ProductThumbnail url={product.imageUrl} />
      <View style={styles.info}>
        <Text variant="meta" color={colors.mutedForeground} numberOfLines={1}>
          {product.ingredient}
          {amount ? ` · ${amount}` : ""}
        </Text>
        {productUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${title}, відкрити в Сільпо`}
            onPress={() => void WebBrowser.openBrowserAsync(productUrl)}
            style={({ pressed }) => [styles.titleLink, pressed && styles.pressed]}
          >
            <Text variant="tag" numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            <HugeiconsIcon
              icon={LinkSquare01Icon}
              size={14}
              color={colors.tealDeep}
              strokeWidth={1.5}
            />
          </Pressable>
        ) : (
          <Text variant="tag" numberOfLines={2}>
            {title}
          </Text>
        )}
        {product.unit || product.quantity !== 1 ? (
          <Text variant="meta" color={colors.mutedForeground}>
            {product.unit}
            {product.quantity !== 1 ? ` × ${formatQuantity(product.quantity)}` : ""}
          </Text>
        ) : null}
      </View>
      <ProductPrice product={product} />
    </View>
  );
}

function ProductPrice({ product }: { product: Product }) {
  const { price, oldPrice, quantity } = product;

  if (price === undefined) {
    return (
      <Text variant="meta" color={colors.mutedForeground} style={styles.priceColumn}>
        Ціна уточнюється
      </Text>
    );
  }

  const onSale = oldPrice !== undefined && oldPrice > price;

  return (
    <View style={styles.priceColumn}>
      <Text variant="tag" style={styles.price}>
        {formatPrice(price * quantity)}
      </Text>
      {onSale ? (
        <>
          <Text variant="meta" color={colors.mutedForeground} style={styles.oldPrice}>
            {formatPrice(oldPrice * quantity)}
          </Text>
          <Text variant="meta" color={colors.accentDeep} style={styles.price}>
            −{Math.round((1 - price / oldPrice) * 100)}%
          </Text>
        </>
      ) : null}
    </View>
  );
}

function ProductThumbnail({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.thumb}>
      {url && !failed ? (
        <Image
          source={url}
          style={styles.thumbImage}
          contentFit="contain"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <HugeiconsIcon
          icon={ShoppingBasket01Icon}
          size={20}
          color={colors.mutedForeground}
          strokeWidth={1.5}
        />
      )}
    </View>
  );
}

type ProductsEmptyProps = { ingredients: Ingredient[]; status: Idea["productsStatus"] };

function ProductsEmpty({ ingredients, status }: ProductsEmptyProps) {
  const { title, description } = status ? emptyMessages[status] : notMatched;

  return (
    <View style={styles.empty}>
      <View style={styles.emptyHead}>
        <Illustration name="ingredients-basket" size={80} />
        <View style={styles.emptyText}>
          <Text variant="secondary">{title}</Text>
          <Text variant="meta" color={colors.mutedForeground}>
            {description}
          </Text>
        </View>
      </View>
      <IngredientList ingredients={ingredients} />
    </View>
  );
}

function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <View style={styles.ingredients}>
      {ingredients.map((ingredient, index) => (
        <View key={`${ingredient.name}-${index}`} style={styles.ingredient}>
          <Text variant="body" style={styles.ingredientName}>
            {ingredient.name}
          </Text>
          {ingredient.amount ? (
            <Text variant="meta" color={colors.mutedForeground}>
              {ingredient.amount}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 8 },
  rail: { marginTop: 8, textTransform: "none" },
  rows: { gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, gap: 2 },
  titleLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  title: { flexShrink: 1, color: colors.foreground },
  pressed: { opacity: 0.6 },
  priceColumn: { alignItems: "flex-end", maxWidth: 104, textAlign: "right" },
  price: { fontVariant: ["tabular-nums"] },
  oldPrice: { textDecorationLine: "line-through", fontVariant: ["tabular-nums"] },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 40, height: 40, backgroundColor: colors.card },
  missing: { gap: 6, paddingTop: 4 },
  empty: { gap: 12 },
  emptyHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyText: { flex: 1, gap: 4 },
  ingredients: { gap: 2 },
  ingredient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingVertical: 6,
  },
  ingredientName: { flex: 1 },
});
