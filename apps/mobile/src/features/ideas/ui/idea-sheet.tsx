import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { servingsLabel } from "@multiplayer-cooking/core/ideas/idea-format";
import type { Idea } from "@multiplayer-cooking/core/ideas/types";
import { colors } from "@multiplayer-cooking/theme";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useIdeas } from "@/features/ideas/api/use-ideas";
import { IdeaCartDetails, IdeaCartFooter } from "@/features/ideas/ui/idea-cart-footer";
import { IdeaPhoto } from "@/features/ideas/ui/idea-photo";
import { IdeaProducts } from "@/features/ideas/ui/idea-products";
import { IdeaVersionNav } from "@/features/ideas/ui/idea-version-nav";
import { EmptyState } from "@/shared/ui/empty-state";
import { InkTag } from "@/shared/ui/ink-tag";
import { Markdown } from "@/shared/ui/markdown";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Text } from "@/shared/ui/text";

type IdeaSheetProps = { threadId: string; ideaId?: string };

export function IdeaSheet({ threadId, ideaId }: IdeaSheetProps) {
  const { idea, versions, canAddToCart, cartError, addToCart } = useIdeas(threadId, ideaId);

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Страва і товари">
        <IdeaVersionNav versions={versions} />
      </SheetHeader>
      {idea === undefined ? (
        <IdeaSkeleton />
      ) : idea === null ? (
        <EmptyState illustration="serving-dome" size={96} message="Ідея ще не готова." />
      ) : (
        <View collapsable={false} style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <IdeaPhoto key={idea.imageUrl ?? idea._id} idea={idea} />
            <SignPlate size="idea" title={idea.title} />
            <IdeaMeta idea={idea} />
            <Text>{idea.summary}</Text>
            <Markdown text={idea.body} noImages />
            <View style={styles.actions}>
              <InkTag
                icon={UserGroupIcon}
                label="Готуємо разом"
                onPress={() => {
                  router.back();
                  router.push({
                    pathname: "/cook-together",
                    params: {
                      ideaId: idea._id,
                      servings: String(idea.servings),
                      cookCount: String(idea.cookCount ?? 1),
                    },
                  });
                }}
              />
            </View>
            <IdeaProducts idea={idea} />
            {idea.cart ? <IdeaCartDetails cart={idea.cart} /> : null}
          </ScrollView>
          <IdeaCartFooter
            key={idea._id}
            idea={idea}
            canAddToCart={canAddToCart}
            error={cartError}
            onAddToCart={addToCart}
          />
        </View>
      )}
    </View>
  );
}

function IdeaMeta({ idea }: { idea: Idea }) {
  return (
    <View style={styles.meta}>
      <View style={styles.metaItem}>
        <HugeiconsIcon icon={Clock01Icon} size={16} color={colors.tealDeep} strokeWidth={1.5} />
        <Text variant="meta" color={colors.mutedForeground}>
          {idea.timeMinutes} хв
        </Text>
      </View>
      <View style={styles.metaItem}>
        <HugeiconsIcon icon={UserGroupIcon} size={16} color={colors.tealDeep} strokeWidth={1.5} />
        <Text variant="meta" color={colors.mutedForeground}>
          {servingsLabel(idea.servings)}
        </Text>
      </View>
    </View>
  );
}

function IdeaSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton height={224} />
      <Skeleton width={220} height={36} />
      <Skeleton width={140} height={16} radius={6} />
      <Skeleton height={64} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  actions: { flexDirection: "row" },
  meta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
});
