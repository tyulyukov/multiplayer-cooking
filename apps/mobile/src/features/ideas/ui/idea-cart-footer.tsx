import LinkSquare01Icon from "@hugeicons/core-free-icons/LinkSquare01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import ShoppingBasketAdd01Icon from "@hugeicons/core-free-icons/ShoppingBasketAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { formatPrice, itemsLabel } from "@multiplayer-cooking/core/ideas/idea-format";
import { getIdeaProducts } from "@multiplayer-cooking/core/ideas/idea-products";
import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import { colors, radii } from "@multiplayer-cooking/theme";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "@/shared/lib/haptics";
import { layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { NeonLine } from "@/shared/ui/neon-line";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { Text } from "@/shared/ui/text";

type IdeaCartFooterProps = {
  idea: Idea;
  canAddToCart: boolean;
  error: string | null;
  onAddToCart: () => void;
};

export function IdeaCartFooter({
  idea,
  canAddToCart,
  error: actionError,
  onAddToCart,
}: IdeaCartFooterProps) {
  const insets = useSafeAreaInsets();
  const { matched, total } = getIdeaProducts(idea);
  const pending = idea.cartPending === true;
  const error = actionError ?? (pending ? null : (idea.cartError ?? null));
  const cartReady = idea.cart !== undefined && !idea.cartError;
  const wasPending = useRef(pending);

  useEffect(() => {
    if (wasPending.current && !pending && cartReady) haptics.success();
    wasPending.current = pending;
  }, [pending, cartReady]);

  if (!idea.cart && matched.length === 0) {
    return error ? <InlineAlert message={error} style={styles.floatingError} /> : null;
  }

  return (
    <Animated.View
      layout={layout.morph}
      style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
    >
      <NeonLine style={styles.neon} />
      {error ? <InlineAlert message={error} /> : null}
      {idea.cart ? (
        <CartReady
          cart={idea.cart}
          pending={pending}
          canRefresh={canAddToCart && !pending}
          onRefresh={onAddToCart}
        />
      ) : (
        <>
          <View style={styles.totalRow}>
            <View style={styles.totalText}>
              <Text variant="secondary">Разом, без доставки</Text>
              {matched.some((product) => product.price === undefined) ? (
                <Text variant="meta" color={colors.mutedForeground}>
                  Товари без ціни в суму не входять.
                </Text>
              ) : null}
            </View>
            <Text variant="title" style={styles.amount}>
              {formatPrice(total)}
            </Text>
          </View>
          {pending ? (
            <View style={styles.pending}>
              <ShimmerText text="Додаємо в кошик…" style={styles.centered} />
            </View>
          ) : (
            <Button
              variant="lime"
              icon={ShoppingBasketAdd01Icon}
              label={`Додати ${itemsLabel(matched.length)} у кошик`}
              disabled={!canAddToCart}
              haptic="commit"
              onPress={onAddToCart}
            />
          )}
        </>
      )}
    </Animated.View>
  );
}

type CartReadyProps = {
  cart: NonNullable<Idea["cart"]>;
  pending: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
};

function CartReady({ cart, pending, canRefresh, onRefresh }: CartReadyProps) {
  const { checkoutWebLink } = cart;

  return (
    <View style={styles.cart}>
      <View style={styles.cartHead}>
        {pending ? null : <Illustration name="basket-filled" size={44} />}
        <View style={styles.cartHeading}>
          <Text variant="secondary">Кошик Сільпо</Text>
          {pending ? (
            <ShimmerText text="Оновлюємо…" />
          ) : (
            <Text variant="meta" color={colors.tealDeep}>
              {checkoutWebLink ? "Готовий до перевірки" : "Товари додано"}
            </Text>
          )}
        </View>
        <View style={styles.payable}>
          <Text variant="meta" color={colors.mutedForeground}>
            До сплати
          </Text>
          <Text variant="title" style={styles.amount}>
            {cart.total === undefined ? "Уточнюється" : formatPrice(cart.total)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Оновити суму кошика"
          accessibilityState={{ disabled: !canRefresh }}
          disabled={!canRefresh}
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.refresh,
            pressed && styles.refreshPressed,
            !canRefresh && styles.disabled,
          ]}
        >
          <HugeiconsIcon icon={RefreshIcon} size={20} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
      </View>
      {checkoutWebLink ? (
        <Button
          variant="lime"
          icon={LinkSquare01Icon}
          label="Перевірити й оформити"
          onPress={() => void WebBrowser.openBrowserAsync(checkoutWebLink)}
        />
      ) : (
        <Text variant="meta" color={colors.mutedForeground}>
          Оформи замовлення в застосунку або на сайті Сільпо.
        </Text>
      )}
    </View>
  );
}

export function IdeaCartDetails({ cart }: { cart: NonNullable<Idea["cart"]> }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <View style={styles.cart}>
      {cart.warnings?.length ? (
        <View accessibilityRole="summary" style={styles.warnings}>
          <Text variant="tag">Перевір товари перед замовленням</Text>
          {cart.warnings.map((warning) => (
            <Text key={warning} variant="meta">
              {warning}
            </Text>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsOpen }}
        onPress={() => setDetailsOpen((open) => !open)}
        style={styles.detailsToggle}
      >
        <Text variant="tag">Деталі кошика</Text>
        <DisclosureChevron open={detailsOpen} />
      </Pressable>
      <Collapsible open={detailsOpen}>
        <View style={styles.details}>
          {cart.productsTotal === undefined ? null : (
            <DetailRow label="Товари" value={formatPrice(cart.productsTotal)} />
          )}
          <DetailRow
            label="Доставка"
            value={
              cart.deliveryTotal === undefined ? "Уточнюється" : formatPrice(cart.deliveryTotal)
            }
          />
          {cart.discount !== undefined && cart.discount > 0 ? (
            <Text variant="meta" color={colors.tealDeep}>
              Вже враховано {formatPrice(cart.discount)} знижки
            </Text>
          ) : null}
          <Text variant="meta" color={colors.mutedForeground}>
            Сума всього кошика разом із раніше доданими товарами. Остаточну суму Сільпо уточнить при
            оформленні.
          </Text>
        </View>
      </Collapsible>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="meta">{label}</Text>
      <Text variant="meta" style={styles.amountSmall}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  neon: { position: "absolute", top: 0, left: 0, right: 0 },
  floatingError: { marginHorizontal: 16, marginBottom: 16 },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  totalText: { flex: 1, gap: 2 },
  amount: { fontVariant: ["tabular-nums"] },
  amountSmall: { fontVariant: ["tabular-nums"] },
  pending: { minHeight: 52, justifyContent: "center" },
  centered: { alignSelf: "center" },
  cart: { gap: 12 },
  cartHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cartHeading: { flex: 1, gap: 2 },
  payable: { alignItems: "flex-end" },
  refresh: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  refreshPressed: { backgroundColor: colors.muted },
  disabled: { opacity: 0.4 },
  warnings: {
    gap: 4,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: colors.muted,
  },
  detailsToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  details: { gap: 6, paddingBottom: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
});
