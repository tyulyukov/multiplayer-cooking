import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Leaf01Icon from "@hugeicons/core-free-icons/Leaf01Icon";
import Share08Icon from "@hugeicons/core-free-icons/Share08Icon";
import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { colors } from "@multiplayer-cooking/theme";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Image as NativeImage, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { StreamPreview } from "@/features/chat/ui/stream-preview";
import { useAttachments } from "@/shared/hooks/use-attachments";
import { useOnline } from "@/shared/hooks/use-online";
import { uploadImage } from "@/shared/lib/upload-image";
import { Avatar } from "@/shared/ui/avatar";
import { BlackBox } from "@/shared/ui/black-box";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CheckerBand } from "@/shared/ui/checker-band";
import { ChromeFrame } from "@/shared/ui/chrome-frame";
import { Collapsible, DisclosureChevron } from "@/shared/ui/collapsible";
import { Composer, ComposerDock } from "@/shared/ui/composer";
import { EmptyState } from "@/shared/ui/empty-state";
import { GlassSurface } from "@/shared/ui/glass-surface";
import { illustrationNames } from "@/shared/lib/illustrations";
import { Illustration } from "@/shared/ui/illustration";
import { InkTag, TagRow } from "@/shared/ui/ink-tag";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Markdown } from "@/shared/ui/markdown";
import { NeonLine } from "@/shared/ui/neon-line";
import { NumberTile } from "@/shared/ui/number-tile";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { PhotoStrip } from "@/shared/ui/photo-strip";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SheetHeader } from "@/shared/ui/sheet-header";
import { ShimmerText } from "@/shared/ui/shimmer-text";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Stepper } from "@/shared/ui/stepper";
import { Text } from "@/shared/ui/text";
import type { TextVariant } from "@/shared/lib/type-scale";

const sampleMarkdown = `## Соус до пасти

Розігрій **оливкову олію** на середньому вогні й додай часник.

- 2 зубчики часнику
- 400 г томатів у власному соку
- щіпка солі

1. Обсмаж часник 30 секунд.
2. Влий томати й вари *10 хвилин*.

Деталі в [рецепті](https://silpo.ua).

![фото](https://example.com/a.jpg)`;

const typeRoles: [TextVariant, string][] = [
  ["plate", "Що приготуємо?"],
  ["sheetTitle", "Історія розмов"],
  ["title", "Паста з томатами"],
  ["ideaPlate", "Шакшука"],
  ["numeral", "12:45"],
  ["numeralSmall", "03:20"],
  ["step", "3"],
  ["label", "Інгредієнти"],
  ["body", "Опиши страву або напиши, що є вдома."],
  ["button", "Згенерувати"],
  ["secondary", "Скопіювати"],
  ["tag", "Швидко"],
  ["meta", "5 хвилин тому"],
];

const prompts = ["Швидко", "Вегетаріанське", "З того, що є", "На компанію"];

const photoUrls = [
  require("@/assets/images/serving-bell.webp"),
  require("@/assets/images/oven-mitts.webp"),
  require("@/assets/images/recipe-box.webp"),
].map((asset) => NativeImage.resolveAssetSource(asset).uri);

// Dev-only gallery of the shared kit: multiplayer-cooking://kit
export default function KitScreen() {
  if (!__DEV__) return <Redirect href="/" />;

  return <KitGallery />;
}

function KitGallery() {
  const [selected, setSelected] = useState<string[]>(["Швидко"]);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState(0);
  const [cooks, setCooks] = useState(2);
  const [homeText, setHomeText] = useState("");
  const [chatText, setChatText] = useState("");
  const [questionnaire, setQuestionnaire] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);
  const online = useOnline();
  const [sessionId] = useSessionId();
  const uploadUrl = useMutation(api.files.uploadUrl);

  const upload = async (fileUri: string) => {
    const url = sessionId ? await uploadUrl({ sessionId }) : null;

    if (!url) throw new Error("No upload url");

    return uploadImage(url, fileUri);
  };

  const homeAttachments = useAttachments(upload);
  const chatAttachments = useAttachments(upload);
  const floatingMode = segment === 0 ? "chat" : "helper";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: dockHeight + 48 }}
      >
        <CheckerBand underStatusBar />
        {offline ? <OfflineBanner message="Немає зв’язку. Інструкції доступні." /> : null}
        <View style={styles.content}>
          <SignPlate title="Кухонний набір" />
          <Text variant="meta" color={colors.mutedForeground}>
            {online ? "Convex на зв’язку" : "Немає зв’язку з Convex"}
          </Text>

          <Section title="Типографіка">
            {typeRoles.map(([variant, sample]) => (
              <View key={variant} style={styles.typeRow}>
                <Text variant="meta" color={colors.mutedForeground} style={styles.typeName}>
                  {variant}
                </Text>
                <Text variant={variant} style={styles.typeSample} numberOfLines={1}>
                  {sample}
                </Text>
              </View>
            ))}
          </Section>

          <Section title="Таблички">
            <SignPlate title="Паста з томатами і базиліком на компанію" />
            <SignPlate size="idea" title="Шакшука з фетою" />
          </Section>

          <Section title="Кнопки">
            <Button
              variant="lime"
              label="Створити кухню"
              busyLabel="Створюємо…"
              busy={busy}
              haptic="commit"
              onPress={() => {
                setBusy(true);
                setTimeout(() => setBusy(false), 2000);
              }}
            />
            <Button variant="lime" label="Почати готувати" disabled />
            <View style={styles.row}>
              <Button label="Скопіювати" icon={Copy01Icon} style={styles.flex} />
              <Button label="Поділитися" icon={Share08Icon} style={styles.flex} />
            </View>
            <Button variant="danger" label="Вийти з кухні" />
            <Button variant="text" label="Повернутися" />
          </Section>

          <Section title="Теги">
            <TagRow>
              {prompts.map((prompt) => (
                <InkTag
                  key={prompt}
                  label={prompt}
                  icon={prompt === "Вегетаріанське" ? Leaf01Icon : undefined}
                  selected={selected.includes(prompt)}
                  haptic="selection"
                  onPress={() =>
                    setSelected((current) =>
                      current.includes(prompt)
                        ? current.filter((item) => item !== prompt)
                        : [...current, prompt],
                    )
                  }
                />
              ))}
              <InkTag label="Недоступно" disabled />
            </TagRow>
          </Section>

          <Section title="Картки">
            <Card>
              <Text variant="secondary">Звичайна картка</Text>
              <Text variant="meta" color={colors.mutedForeground}>
                Біла, 2pt рамка
              </Text>
            </Card>
            <Card active onPress={() => undefined} accessibilityLabel="Активна картка">
              <Text variant="secondary">Активна картка (натисни)</Text>
            </Card>
            <Card done>
              <Text variant="secondary" style={styles.struck}>
                Готовий крок
              </Text>
            </Card>
          </Section>

          <Section title="Хром, плитки, аватари">
            <View style={styles.row}>
              <ChromeFrame radius={14} style={styles.chromeSample} contentStyle={styles.center}>
                <Text variant="tag">white</Text>
              </ChromeFrame>
              <ChromeFrame
                radius={14}
                fill="teal"
                style={styles.chromeSample}
                contentStyle={styles.center}
              >
                <Text variant="tag">teal</Text>
              </ChromeFrame>
              <ChromeFrame
                radius={14}
                fill="ink"
                style={styles.chromeSample}
                contentStyle={styles.center}
              >
                <Text variant="tag" color={colors.card}>
                  ink
                </Text>
              </ChromeFrame>
            </View>
            <View style={styles.row}>
              <NumberTile value={1} />
              <NumberTile value={2} done />
              <NumberTile value={12} />
              <View style={styles.spacer} />
              <Avatar kind="me" name="Максим" />
              <Avatar kind="other" name="Оля" />
              <Avatar kind="everyone" name="Усі" />
              <Avatar kind="empty" />
            </View>
          </Section>

          <Section title="Чорна дошка">
            <BlackBox
              label="Варити пасту"
              meta="Крок 3 · Оля"
              value={paused ? "07:42" : "08:15"}
              paused={paused}
              valueLabel="8 хвилин 15 секунд"
            >
              <Button
                variant="ghostOnInk"
                compact
                label={paused ? "Продовжити" : "Пауза"}
                onPress={() => setPaused((value) => !value)}
              />
              <Button variant="ghostOnInk" compact label="+1 хв" />
            </BlackBox>
          </Section>

          <Section title="Помилки й стани">
            <InlineAlert message="Відповідь не прийшла вчасно. Спробуй ще раз." />
            <InlineAlert
              message="Не вдалося згенерувати план."
              onRetry={() => setBusy(true)}
              retrying={busy}
            />
            <Button
              variant="tag"
              label={offline ? "Сховати банер" : "Показати банер офлайн"}
              onPress={() => setOffline((value) => !value)}
              style={styles.start}
            />
            <ChromeFrame radius={14}>
              <EmptyState
                illustration="recipe-box"
                message="Тут з’являться твої розмови."
                action={{ label: "Нова розмова", onPress: () => undefined }}
              />
            </ChromeFrame>
            <View style={styles.illustrations}>
              {illustrationNames.map((name) => (
                <View key={name} style={styles.illustration}>
                  <Illustration name={name} size={64} />
                  <Text variant="meta" color={colors.mutedForeground} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Завантаження">
            <ShimmerText text="Шукаю товари в Сільпо…" />
            <Skeleton height={20} width="60%" radius={6} />
            <Skeleton height={72} />
            <View style={styles.row}>
              <Skeleton height={40} width={40} radius={10} />
              <Skeleton height={40} width={120} radius={10} />
            </View>
          </Section>

          <Section title="Шапка аркуша і скло">
            <View style={styles.sheetDemo}>
              <SheetHeader title="Історія розмов" onClose={() => undefined}>
                <SegmentedControl
                  values={["Чат", "Нотатки (2)"]}
                  selectedIndex={segment}
                  onChange={setSegment}
                />
              </SheetHeader>
            </View>
            <View style={styles.glassStage}>
              <Image source={photoUrls[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
              <GlassSurface style={styles.glassChip}>
                <Text variant="numeralSmall">04:59</Text>
                <Text variant="meta">Соус</Text>
              </GlassSurface>
            </View>
          </Section>

          <Section title="Markdown">
            <Markdown text={sampleMarkdown} />
            <Text variant="label" color={colors.mutedForeground}>
              noImages
            </Text>
            <Markdown text={sampleMarkdown} noImages />
          </Section>

          <Section title="Стрім відповіді">
            <StreamPreview />
          </Section>

          <Section title="Фото">
            <PhotoStrip urls={photoUrls} alt="Фото до повідомлення" />
          </Section>

          <Section title="Керування">
            <Stepper value={cooks} min={1} max={12} onChange={setCooks} label="Кількість кухарів" />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen((value) => !value)}
              style={styles.disclosure}
            >
              <Text variant="secondary">Що зміниться</Text>
              <DisclosureChevron open={open} />
            </Pressable>
            <Collapsible open={open}>
              <Text>Час варіння зменшиться на 5 хвилин, а соус стане густішим.</Text>
            </Collapsible>
            <NeonLine />
          </Section>

          <Section title="Composer · home">
            <Button
              variant="tag"
              label={questionnaire ? "Сховати опитування" : "Показати опитування"}
              onPress={() => setQuestionnaire((value) => !value)}
              style={styles.start}
            />
            <Composer
              mode="home"
              value={homeText}
              busy={busy}
              attachments={homeAttachments.items}
              onChange={setHomeText}
              onSubmit={() => {
                setBusy(true);
                setTimeout(() => setBusy(false), 2000);
              }}
              onAttach={(source) => void homeAttachments.add(source)}
              onRemoveAttachment={homeAttachments.remove}
              questionnaireKey="demo"
              questionnaire={
                questionnaire ? (
                  <View style={styles.questionnaireDemo}>
                    <Text variant="label" color={colors.mutedForeground}>
                      Питання 1 з 2
                    </Text>
                    <Text variant="secondary">Скільки часу маєш?</Text>
                    <TagRow>
                      <InkTag label="До 30 хв" />
                      <InkTag label="Година" />
                    </TagRow>
                  </View>
                ) : undefined
              }
            />
            <Button
              variant="tag"
              label="Заповнити 1030 знаків"
              onPress={() => setHomeText("а".repeat(1030))}
              style={styles.start}
            />
          </Section>
        </View>
      </ScrollView>
      <ComposerDock onHeightChange={setDockHeight}>
        <Composer
          mode={floatingMode}
          value={chatText}
          busy={false}
          attachments={chatAttachments.items}
          onChange={setChatText}
          onSubmit={() => setChatText("")}
          onAttach={(source) => void chatAttachments.add(source)}
          onRemoveAttachment={chatAttachments.remove}
        />
      </ComposerDock>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color={colors.mutedForeground}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 16, gap: 28 },
  section: { gap: 12 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeName: { width: 92 },
  typeSample: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1 },
  start: { alignSelf: "flex-start" },
  spacer: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  chromeSample: { width: 80, height: 56 },
  illustrations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  illustration: { width: 80, alignItems: "center", gap: 2 },
  sheetDemo: { backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" },
  glassStage: {
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
  },
  glassChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  disclosure: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questionnaireDemo: { gap: 8 },
  struck: { textDecorationLine: "line-through" },
});
