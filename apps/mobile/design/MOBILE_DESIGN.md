# Mobile design (iOS first)

The iOS app is the same Сільпо Odesa diner as `apps/web/DESIGN.md`, rebuilt on native navigation. Native bars, sheets, menus and haptics carry the controls; the diner carries the content. When this file and `DESIGN.md` disagree about a value that exists on both platforms, `DESIGN.md` wins for colour and copy, this file wins for sizing, placement, navigation and motion. Tokens come from `@multiplayer-cooking/theme`.

Alternatives considered for each decision, with the picked one marked, are in `options.html` next to this file.

## What carries over, what changes

| Element                               | Web                                                               | iOS                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checker band                          | 48px full-bleed strip at the top of every screen                  | 24pt strip, first item of the content scroll on root screens (Home, Join, Lobby and timeline, Completion). It scrolls under the glass header. Sheets and pushed detail screens have no band                     |
| Neon line                             | 3px under the band, before results, focus ring                    | 2pt under the band; 2pt divider above a results area; 2pt top edge of sticky sheet footers. Glow is drawn as a second 6pt blue line at 25% opacity, since RN has no box-shadow glow. No focus ring (touch only) |
| Sign plate                            | 34px Oswald, one per screen, screen title                         | 28pt Oswald 700, one per screen, in the content, under the band. The native header title stays empty on screens that have a plate. Plate hugs its text, max 2 lines, chrome frame 2pt                           |
| Idea plate                            | 22px                                                              | 20pt Oswald 700, radius 14, chrome 2pt                                                                                                                                                                          |
| Chrome frame                          | 3px gradient border on composer, result card, timers, number tile | 2pt. Built as an outer `LinearGradient` view (160deg, `#f2f4f6 → #a7b0ba 40% → #6d7883 70% → #f2f4f6`) with a 2pt inset white child. Same uses. Never on buttons, tags or glass                                 |
| Lime CTA                              | 50px, ink ring, inset bottom shade                                | 52pt, ink ring 2pt, bottom shade as a 3pt inner bottom border `rgba(0,0,0,0.15)`. Pressed: scale 0.97, shade 1pt. One per screen or sheet                                                                       |
| Ink tag                               | 2px ink outline, Golos 600 14                                     | Same, min height 40pt, horizontal padding 14pt. Pressed state: ink fill, white text, lime icon                                                                                                                  |
| Black box                             | Chrome around ink, lime 56px numerals with glow                   | Chrome 2pt around ink, lime Oswald 700 44pt numerals, glow via `textShadowRadius: 10` lime 60%. The only glow besides the neon line                                                                             |
| Topbar brand row                      | Brand dot plus name on every screen                               | Dropped. The native header replaces it. The brand dot survives only on the Connect screen and as the app icon. Backend-not-ready shows in the Connect button state instead of the dot                           |
| Profile tag in topbar                 | Ink tag with name opening a dropdown                              | `Stack.Toolbar` button `person.crop.circle` opening a native menu                                                                                                                                               |
| History tag                           | Ink tag "Історія"                                                 | `Stack.Toolbar` button `clock.arrow.circlepath` opening the History sheet                                                                                                                                       |
| Drawers (vaul)                        | Bottom drawers                                                    | `formSheet` with detents and grabber                                                                                                                                                                            |
| Dialogs                               | Centered shadcn dialogs                                           | `Alert.alert` for the two confirmations, sheets for everything else                                                                                                                                             |
| Floating helper launcher              | Fixed round button, bottom right                                  | Header toolbar button with unread dot, plus "Є питання?" inside the step card. No floating button                                                                                                               |
| Tools drawer menu level ("Під рукою") | Drawer with a menu, then sub-drawers                              | Native `Stack.Toolbar.Menu`; each item opens its own sheet                                                                                                                                                      |
| Glass                                 | None                                                              | `GlassView` (regular) only on: the native header (automatic), the chat and helper composer container, the timer dock, the scroll-to-bottom button. Nothing in content is glass                                  |
| Drop shadows                          | None                                                              | None. Glass brings its own edge; everything else uses outlines and inset shades                                                                                                                                 |

Identity check: checker band, neon line, sign plate, chrome frame, lime CTA, black-box timers, ink tags, teal identity, Oswald plus Golos, the illustration family and all copy carry over. That is the recognisable half of the product. Headers, menus, sheets, toggles, pickers, alerts, keyboards and haptics are native.

HIG anchors for the shape of this plan: `liquid-glass.md › Review checklist` (glass only on floating controls; count the custom glass surfaces), `toolbars.md › Phone (iOS)` ("Prioritize only the most important items for inclusion in the main toolbar area"), `tab-bars.md › Best practices` ("Use a tab bar to support navigation, not to provide actions"), `sheets.md › Mobile (iOS, iPadOS)` (medium detent for progressive disclosure, grabber on resizable sheets, swipe to dismiss).

## Palette

Unchanged from `DESIGN.md`. Light appearance only. Contrast consequences restated for iOS sizes:

- White on magenta `#e5127f` is 4.1:1. Allowed at 20pt Oswald 700 and above (the two plates). No body text on magenta.
- Teal `#3ec1be` as a fill behind ink `#16191d`: 9.5:1. Teal text uses `tealDeep #147d7b` on cream (4.6:1 on `#f3eee4`).
- `primaryForeground #1f2a00` on lime `#c8e63c`: 12.6:1.
- `mutedForeground #666d74` on cream: 4.9:1; on white 5.3:1. Minimum body size for it is 13pt.
- Monochrome header buttons: the system draws them ink over cream. Never tint toolbar glyphs magenta or lime (`liquid-glass.md › Color on glass`).

Colour budget per screen is the same: magenta once (a plate or a "now" marker), lime once (the primary action; also the "everyone" cook colour), teal for identity and status, blue only as neon, cherry only for errors.

## Type

Fonts load at runtime (`src/shared/fonts.ts`): Oswald 500/600/700, Golos Text 400/500/600/700. Sentence case everywhere. Oswald `letterSpacing` 0 to 0.5.

| Role                        | Face       | pt  | Line height | Max scale |
| --------------------------- | ---------- | --- | ----------- | --------- |
| Sign plate                  | Oswald 700 | 28  | 30          | 1.2       |
| Sheet title                 | Oswald 600 | 22  | 26          | 1.3       |
| Session or dish title       | Oswald 600 | 24  | 26          | 1.3       |
| Idea plate                  | Oswald 700 | 20  | 22          | 1.2       |
| Timer numeral (black box)   | Oswald 700 | 44  | 44          | 1.0       |
| Timer numeral (dock chip)   | Oswald 700 | 20  | 22          | 1.2       |
| Step number                 | Oswald 700 | 20  | 22          | 1.3       |
| Label, rail, eyebrow        | Oswald 600 | 13  | 16          | 1.6       |
| Body, inputs, messages      | Golos 400  | 17  | 24          | 2.0       |
| Button                      | Golos 700  | 16  | 20          | 1.6       |
| Secondary button, menu item | Golos 600  | 15  | 20          | 1.6       |
| Tag, chip                   | Golos 600  | 14  | 18          | 1.6       |
| Meta, counter, credit       | Golos 400  | 13  | 18          | 1.6       |

Dynamic Type stance: every `Text` scales (`allowFontScaling` on) with the `maxFontSizeMultiplier` in the last column. Plates, numerals and chips cap early so the signage does not break its frame; body copy scales to AX1 (2.0). From 1.2 (XXL) quick prompts stack vertically. At 1.6 and above: the lobby row shows name on one line and role under it, the cart footer puts the total above the button, and the dock chip hides its label and keeps the numeral. Minimum type on screen is 13pt (`accessibility.md`: mobile minimum 11pt).

## Spacing, radii, targets

Spacing scale: 4, 8, 12, 16, 20, 24, 32. Screen gutter 16. Band to plate 16. Plate to first content 20. Card internal padding 12 by 14. Gap between stacked cards 12. Gap between tags 8.

Radii: 22 composer and black box, 18 sign plate, 14 cards, idea plate and photos, 12 buttons, 10 tags and thumbnails, full round for avatars, dots and the close button.

Targets: every control 44 by 44pt or larger; icon-only header buttons use the system size. Checklist rows are 48pt tall and the whole row toggles. Step card headers are the full card width.

Safe areas: content scrolls use `contentInsetAdjustmentBehavior="automatic"` under the transparent header. Bottom floating controls (composer, dock) sit at `bottom safe inset + 8`. Lists add `bottom inset + composer height + 16` as content padding.

## Component kit (React Native)

**Button.** Variants `lime` (primary, above), `ghost` (white fill, 2pt ink border, radius 12, Golos 600 15, height 48), `tag` (ink tag), `danger` (white fill, 2pt cherry border at 30%, cherry text; used for "Вийти з кухні"), `text` (ink text only, 44pt tall, for "Повернутися"). All variants: pressed scale 0.97 spring, 40% opacity when disabled, `accessibilityRole="button"`, busy state swaps the label for the busy label plus a 16pt `ActivityIndicator` (never a spinner alone). No glass on buttons.

**InkTag / Chip.** Ink tag as above. `selected` prop renders the pressed look. Icon 18pt Hugeicons Stroke Rounded in `tealDeep`, lime when selected. Rows wrap with 8pt gaps. Quick prompts, filters, questionnaire options, helper suggestions.

**Card.** White, 2pt `border`, radius 14, padding 12 by 14. `active` switches the border to ink. `done` renders at 50% opacity with struck-through title.

**ChromeFrame.** Gradient border wrapper (2pt). Props: `radius` (22 composer, 22 black box, 14 number tile and idea plate, 18 sign plate), `fill` (`white`, `ink`, `magenta`, `teal`). Composer, result photo on the ticket, black box, number tile, sign plate.

**SignPlate.** ChromeFrame radius 18 around magenta with a 2pt inner highlight `#ff8fcb` and a 5pt bottom shade `accentDeep`, padding 8 by 16, Oswald 700 28 white. `size="idea"` gives radius 14, 20pt, padding 6 by 12. Self-sizing, left aligned, max 2 lines, `numberOfLines={2}` with tail ellipsis.

**BlackBox.** ChromeFrame radius 22 around ink, padding 14 by 16. Left: label Golos 600 15 white and meta Golos 400 13 `#d4dae0`. Right: numeral Oswald 700 44 lime, `fontVariant: ['tabular-nums']`. Below: the control row of ghost-on-ink buttons (white 2pt outline, white text).

**NumberTile.** ChromeFrame radius 14 around teal, 40 by 40, Oswald 700 20 ink, 3pt inner bottom shade. Only for real step sequences. Done tile: ink fill with a lime check.

**Avatar.** 30pt circle, Golos 700 12 initial, 2pt border in the background colour. Me: teal fill, ink text. Other cook: magenta fill, white text. Everyone: lime fill, `primaryForeground` text. Empty seat: `muted` fill, ink "+".

**Alert (inline).** Cherry text and 20pt icon on `destructiveSoft`, 2pt cherry border at 30%, radius 14, padding 12 by 14. Optional trailing ghost button for the retry. Lives beside the thing that failed, never only as a toast.

**OfflineBanner.** Ink fill, white Golos 600 14, 36pt tall, directly under the header inset; `LinearTransition` on appear. Copy comes from the screen table.

**EmptyState.** Illustration (`expo-image`, `contentFit="contain"`, fixed width from the table in Illustrations, empty accessibility label) centered above one sentence Golos 400 15 `mutedForeground`, centred, max 280pt wide, optional ink tag action below. A failed image unmounts and the text takes its place.

**Skeleton.** `muted` blocks with the radius of the thing they stand in for, opacity pulsing 0.6 to 1.0 over 900ms (`withRepeat`, reversed). Static under Reduce Motion.

**ShimmerText.** Golos 400 13 `mutedForeground` with a 72pt masked gradient sweep (`@expo/ui/community/masked-view` plus `react-native-svg` gradient), 1350ms sweep, 1450ms pause. Off under Reduce Motion, when the app is backgrounded, when the screen loses focus. Used for generation and saving status lines only.

**SheetHeader.** Grabber (native), then a row: title Oswald 600 22 ink on the left, a 30pt glass circle with SF `xmark` on the right (hit area 44). Below, the sheet's own controls (segmented control, version nav). No description line. The neon line appears only when the sheet has a sticky footer, as that footer's top edge.

**Composer.** Two shells, one body. Body: multiline `TextInput` Golos 400 17, grows to 6 lines, counter Golos 400 13 tabular bottom left once length is 819 or more, cherry past 1024 with a cherry 2pt ring on the shell, a 300ms horizontal shake (±6pt) on a blocked submit, attachment strip of 72pt tiles with 2pt ink border and a 24pt ink-ringed remove button, a leading 44pt attach button (Hugeicons image-add) that opens a native menu (Бібліотека / Камера) via `Stack.Toolbar.Menu`-style `MenuView`, and a trailing 44pt send control. Shell `home`: opaque white ChromeFrame radius 22, send is the lime CTA "Згенерувати" inside the frame bottom right. Shell `floating` (chat, helper): `GlassView` regular, radius 22, 2pt chrome border, send is a 32pt ink circle with a white arrow (`arrow-up` Hugeicon) inside a 44pt hit area; collapsed height 48, expands with a 220ms layout transition on focus.

**Markdown.** `react-native-markdown-display` with the Golos scale, ink headings in Oswald 600, lists with 8pt indents, links `tealDeep` opening in `WebBrowser.openBrowserAsync`. Cooking markdown drops images.

**Photo strip / lightbox.** Square thumbnails radius 10 in a grid of up to 4; tap opens `presentation: "transparentModal"` on 95% ink with pinch zoom and a glass close circle. Used for the person's chat photos and helper photos.

## Haptics map

`expo-haptics`. Rules from `playing-haptics.md › Best practices`: use system patterns with their documented meanings, keep them rare, make them optional (the sound toggle in the More menu becomes "Звук і вібрація таймерів"; all other haptics follow the system setting). Standard components (switches, pickers, segmented controls, sheets) play their own; do not double them.

| Moment                                                                                                                                      | Call                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Toggle a quick prompt, questionnaire option, checklist item, ingredient, segmented tab, stepper ±                                           | `selectionAsync()`                                                           |
| Assistant stream starts; each newly revealed paragraph (throttled to one per 320ms)                                                         | `selectionAsync()`                                                           |
| Send a message, "Згенерувати", "Надіслати" answers, send to helper                                                                          | `impactAsync(Light)`                                                         |
| Copy invite link                                                                                                                            | `impactAsync(Light)`                                                         |
| Lime CTA press that changes shared state: "Створити кухню", "Почати готувати", "Готово, далі", "Застосувати зміни", "Завершити сесію"       | `impactAsync(Medium)`                                                        |
| Sheet reaches a detent, swipe-to-dismiss, scroll-to-bottom                                                                                  | none (system)                                                                |
| Idea arrives (first `save_idea` output), cart added, step completed and accepted by the server, proposal applied, note saved, address saved | `notificationAsync(Success)`                                                 |
| Timer fires (foreground); in background a local notification with the default sound carries it                                              | `notificationAsync(Warning)` then `impactAsync(Heavy)` once more after 400ms |
| "Пропустити пункти?" dialog opens, invite link rotated                                                                                      | `notificationAsync(Warning)`                                                 |
| Send failed, join failed, plan generation failed, step rejected by the server                                                               | `notificationAsync(Error)`                                                   |
| Completion ticket appears                                                                                                                   | `notificationAsync(Success)` once, with the confetti                         |
| Every other button                                                                                                                          | none                                                                         |

Streaming haptics skip the first hydration of a thread (no buzz when opening an old conversation).

## Motion spec

Reanimated 4 with `ReduceMotion.System` on every animation. No continuously repainting animation except the shimmer and the dither placeholder, both of which stop under Reduce Motion, in the background and off screen (`motion.md › Best practices`: "Make motion optional"). Screens have no entrance animation beyond the native push and sheet transitions.

| Token        | Value                                           | Use                                                                                                                    |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `fadeIn`     | 140ms, `Easing.out(Easing.cubic)`               | New content appearing in place                                                                                         |
| `fadeOut`    | 120ms, `Easing.in(Easing.cubic)`                | Content leaving                                                                                                        |
| `disclosure` | 180ms, `Easing.inOut(Easing.cubic)`             | Collapsibles: cart details, "Що зміниться", invite management, step card body                                          |
| `morph`      | 220ms, `Easing.out(Easing.cubic)`               | Composer collapse and expand, peek bar appear, dock appear, banner appear; `LinearTransition.duration(220)` for layout |
| `float`      | 240ms, `Easing.out(Easing.cubic)`               | Scroll-to-bottom button, dock chips entering with `FadeInDown` 8pt                                                     |
| `press`      | `withSpring` damping 18, stiffness 220          | Scale 0.97 on press in, 1 on release, all buttons and cards                                                            |
| `shake`      | 300ms, 4 keyframes ±6pt                         | Blocked submit over the limit                                                                                          |
| `skeleton`   | 900ms reverse repeat, opacity 0.6 to 1          | Loading placeholders                                                                                                   |
| `shimmer`    | 1350ms sweep, 1450ms pause                      | Status lines                                                                                                           |
| `reveal`     | 400ms fade                                      | Reference image after load                                                                                             |
| `confetti`   | 2000ms, 72 particles, both sides, theme colours | Completion entry, once per room                                                                                        |

Streaming text: while a message is `streaming`, render only completed paragraph blocks (`splitBufferedAssistantText(text).ready`, throttled to one update per 400ms); each new block enters with `FadeIn.duration(220)`; earlier blocks keep stable keys by source offset; rows older than 3s do not animate on remount. On `success` render the full text. Partial markdown never reaches the renderer.

Step cards: expanding uses `LinearTransition(220)` on the list plus `FadeIn(140)` on the body; the current step is scrolled to 24pt under the header inset with `scrollTo({animated: true})` only when it sits below 65% of the viewport or above the top. Checklist ticks animate the check with a 180ms scale from 0.6.

Live numbers: the timer numeral re-renders every 500ms with no transition (tabular figures carry it). Pausing swaps the lime numeral to `#d4dae0` with a 140ms colour change.

Reduced motion: no shimmer, static skeleton, no confetti (the ticket still appears), no shake (the counter turns cherry and the CTA disables), layout changes snap, sheets and pushes follow the system.

## Navigation map

expo-router native Stack, one stack, transparent headers (`headerTransparent: true`, `headerBlurEffect: "none"`, system glass), `headerTitle: ""` wherever a sign plate names the screen. SF Symbols appear only in headers and native menus; Hugeicons in content.

| Route                              | Presentation                                                             | Header                                                                                                                                                                                | Notes                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Connect or Home                | root                                                                     | Connect: no header. Home: leading none, trailing `clock.arrow.circlepath` (History) and `person.crop.circle` (Profile menu)                                                           | The screen switches on `silpo.connection`                                                                                                                                                                                                          |
| `/chat`                            | push                                                                     | leading `square.and.pencil` "Нова розмова" instead of a back button, same trailing items as Home                                                                                      | Popping calls `chat.newThread`; the thread stays in History. Auto-pushed without animation on launch when `activeThread` exists                                                                                                                    |
| `/history`                         | formSheet, detents `[0.6, 1]`, grabber                                   | SheetHeader "Історія розмов"                                                                                                                                                          | Opens from Home and Chat                                                                                                                                                                                                                           |
| `/settings`                        | formSheet, detents `[1]`, grabber                                        | SheetHeader title follows the segment: "Що агент пам'ятає про тебе", "Як агент говорить з тобою"                                                                                      | Native segmented control "Спогади · Агент"                                                                                                                                                                                                         |
| `/idea`                            | formSheet, detents `[0.6, 1]`, grabber, `sheetExpandsWhenScrolledToEdge` | SheetHeader "Страва і товари", version nav beneath                                                                                                                                    | Sticky cart footer                                                                                                                                                                                                                                 |
| `/cook-together`                   | formSheet, `fitToContents`, grabber                                      | SheetHeader "Скільки вас готує?"                                                                                                                                                      | Also used for "Приготувати ще раз"                                                                                                                                                                                                                 |
| `/cook/[roomId]`                   | push                                                                     | back to Home (label "Головна"), `headerTitle` "", trailing: `person.2` with count (People), `bubble.left.and.text.bubble.right` with unread dot (Helper), `ellipsis.circle` More menu | Join, lobby, generating, timeline and done states live in this route. More menu: Інгредієнти, Додати таймер, Перевести одиниці, Порції (N), Звук і вібрація таймерів (checkmark state), separator, Кухарі та запрошення. `gestureEnabled` stays on |
| `/cook/[roomId]/people`            | formSheet `[0.6, 1]`                                                     | SheetHeader "Кухарі"                                                                                                                                                                  | Per-member actions via a native context menu on the row                                                                                                                                                                                            |
| `/cook/[roomId]/invite`            | formSheet `fitToContents`                                                | SheetHeader "Запросити кухарів"                                                                                                                                                       | Lime "Поділитися посиланням" opens the native share sheet; ghost "Скопіювати"                                                                                                                                                                      |
| `/cook/[roomId]/helper`            | formSheet `[0.92]`, grabber                                              | SheetHeader "Помічник", segmented "Чат · Нотатки (N)", caption "Для всіх на кухні"                                                                                                    | Keyboard moves the composer; `KeyboardStickyView`                                                                                                                                                                                                  |
| `/cook/[roomId]/tools/ingredients` | formSheet `[0.6, 1]`                                                     | "Інгредієнти"                                                                                                                                                                         |                                                                                                                                                                                                                                                    |
| `/cook/[roomId]/tools/timer`       | formSheet `fitToContents`                                                | "Новий таймер"                                                                                                                                                                        | Native picker for the step, native wheel for minutes                                                                                                                                                                                               |
| `/cook/[roomId]/tools/convert`     | formSheet `fitToContents`                                                | "Конвертер"                                                                                                                                                                           | Two native pickers                                                                                                                                                                                                                                 |
| `/cook/[roomId]/tools/servings`    | formSheet `fitToContents`                                                | "Порції"                                                                                                                                                                              | Stepper 1 to 24                                                                                                                                                                                                                                    |
| `/cook/[roomId]/done`              | push with `animation: "fade"`, `headerBackVisible: false`                | leading text button "До інструкцій", trailing `square.and.arrow.up` (share photo and title)                                                                                           | Completion ticket                                                                                                                                                                                                                                  |
| Lightbox                           | `transparentModal`                                                       | none; glass close circle in content                                                                                                                                                   |                                                                                                                                                                                                                                                    |
| "Пропустити пункти?"               | `Alert.alert`                                                            |                                                                                                                                                                                       | Buttons "Повернутися" (cancel), "Пропустити пункти"                                                                                                                                                                                                |
| "Прибрати з кухні?"                | `Alert.alert` destructive                                                |                                                                                                                                                                                       | New on native: "Скасувати", "Прибрати"                                                                                                                                                                                                             |

One sheet at a time (`sheets.md › Best practices`). A sheet that needs another sheet (Idea → Cook together; People → Invite; Tools → Helper) dismisses itself first, then presents the next after the dismiss callback.

Deep links: `multiplayer-cooking://silpo?code&state` for the OAuth return (backend callback must redirect there for mobile; see the inventory), universal link `https://<web-origin>/cook/:roomId#invite=token` for invites. A cold start on an invite link lands on `/cook/[roomId]` in the Join state.

## Screens

Wireframes are 390pt wide. `[glass]` marks the native header; `▣` is the checker band with the neon line; `[sf:x]` is an SF Symbol; `(lime)`, `(ghost)`, `(tag)` name button variants.

### Connect

```
┌──────────────────────────────┐
│ status bar over cream        │  no header
│ ▣▣▣▣ 24pt checker + neon     │
│ ● Multiplayer Cooking        │  brand dot 14 + Oswald 600 16
│                              │
│      [starter-sign 132pt]    │  hangs over the kitchen scene
│   Що приготуємо сьогодні?    │  Oswald 600 24, centred
│   ┌──────────────────────┐   │
│   │ Підключити Сільпо    │   │  lime 52, 36pt under the heading
│   └──────────────────────┘   │
│  Вхід за номером телефону    │  Golos 13 muted, 24pt gap
│  на сайті Сільпо.            │
│                              │
│  [starter-kitchen-mobile]    │  image covers the lower half, aligned to the bottom
└──────────────────────────────┘
```

States: loading (`connection === undefined`) shows the scene and a 220 by 52 skeleton where the button goes, never a blank screen; busy "Відкриваємо Сільпо…" with the spinner inside the lime button; error inline Alert under the note: "Не вдалося відкрити Сільпо. Спробуй ще раз." / "Не вдалося підключити Сільпо. Спробуй ще раз." / "Не вдалося підключити Сільпо. Почни вхід знову на цьому пристрої."; auth session cancelled by the person: no error, button returns to idle; offline: button disabled and the note swaps to "Немає зв’язку. Підключення стане доступним після відновлення."; backend not configured: the button is disabled with the note "Сервер ще не налаштований."

### Home

```
┌──────────────────────────────┐
│ [glass]        [sf:clock] [sf:person] │
│ ▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣ │
│ ┌chrome magenta───────────┐  │
│ │ Що готуємо сьогодні?    │  │  sign plate 28
│ └─────────────────────────┘  │
│ ┌chrome white────────────────┐
│ │ Опиши страву або напиши,   │  TextInput 17, min 4 lines
│ │ що є вдома                 │
│ │                            │
│ │ [img+]  819/1024  (Згенерувати) lime │
│ └────────────────────────────┘
│ (tag Паста на двох) (tag Щось із куркою)
│ (tag Вечеря за 30 хв) (tag Не знаю, здивуй мене)
│                              │
└──────────────────────────────┘
```

Empty state is the composer itself; no rail, no illustration. Quick prompts: 3 random plus "Не знаю, здивуй мене", `selectionAsync` on toggle, disabled while busy. Keyboard: the screen is a `KeyboardAwareScrollView`; the lime button stays visible above the keyboard. States: busy "Генеруємо…" inside the lime button, tags disabled; send error inline Alert between composer and tags with the backend message; offline: Alert "Немає зв’язку. Напиши ідею, вона надішлеться після підключення." and the button disabled (the draft is kept locally); over limit per the Composer spec.

### Chat

```
┌──────────────────────────────┐
│ [glass] [sf:square.and.pencil]   [sf:clock] [sf:person] │
│                              │
│         ┌─────────────────┐  │  person: ink bubble, 88% max, radius 14/4
│         │ Паста з креветками на двох │
│         └─────────────────┘  │
│ ┌────────────────────────┐   │  agent: white card, 2pt border, radius 14/4
│ │ Шукаю щось легке…      │   │  paragraphs fade in
│ └────────────────────────┘   │
│ ┌─ Уточнення · 1 з 2 ───────┐│  questionnaire card (below)
│ │ Який соус?                ││
│ │ (tag Вершковий) (tag Томатний) │
│ │ (tag Часник і олія)       ││
│ │ ┌ Або напиши свій варіант ┐││
│ └───────────────────────────┘│
│ 🫕 Шукаю рецепти…            │  working row: pot icon 20 + ShimmerText
│                              │
│ ┌ink card──────────────────┐ │  idea peek, 56pt, above composer
│ │ [img 40] Ідея готова     › │
│ │          Паста з креветками│
│ └──────────────────────────┘ │
│ ┌glass+chrome──────────────┐ │
│ │ [img+] Уточни або попроси інше  (●↑) │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Feed: `KeyboardAwareLegendList` or `FlatList` (not inverted) with a live-follow latch; a 36pt glass scroll-to-bottom circle (`arrow-down` Hugeicon) appears 12pt above the composer when not following. Tapping the feed blurs the composer. Memory events render as an ink tag "Запам’ятав: {text}" or "Забув: {text}" with a trailing chevron that opens Settings on Спогади. Answered questions render as a muted summary card "Твої відповіді" with question and answers.

Questionnaire card: white card with ink border, eyebrow Oswald 600 13 "Уточнення до страви · 1 з 2", question Golos 600 17, options as ink tags stacked in a column (full width, left aligned, numeric marker 1–5 in `tealDeep`), description "Обери один варіант" or "Обери всі варіанти, які підходять" in meta style, optional custom `TextInput`, footer row "Назад" (text) · "Далі" or "Надіслати" (ghost; lime is not spent here because the page CTA is the send arrow). Single choice auto-advances after 200ms. Collapsed header after answering. Error "Обери варіант або напиши свою відповідь." / "Обери варіант відповіді." in cherry under the options.

Address prompt: a white card, last in the feed, title Oswald 600 17 "Адреса доставки", text Golos 15 "Потрібна, щоб Сільпо показало ціни і зібрало кошик. Зберігається лише на сервері, модель її не бачить.", a `TextInput` with `textContentType="fullStreetAddress"`, placeholder "Одеса, пров. Семафорний, 4", ghost button "Зберегти адресу" (disabled under 5 characters), ShimmerText "Готуємо кошик Сільпо" while pending, inline Alert for errors. Never a sheet: the value must not pass through the thread.

States: loading a thread (`messages === undefined`): three skeleton bubbles (one right, two left). Working: the row above; the composer stays enabled for the next message. Assistant `failed`: card text "Відповідь не вдалася. Спробуй надіслати ще раз." in cherry inside the card. Send error: inline Alert above the composer, dismissed on the next send. Offline: OfflineBanner "Немає зв’язку. Повідомлення надішлеться після підключення." and send disabled. New thread error (pop): toast is not enough; show the Alert on Home "Не вдалося створити нову розмову. Спробуй ще раз." Idea photo generating: the peek shows a 40pt skeleton square. Idea error: the peek keeps the title, no image.

### Idea sheet

```
┌──────────────────────────────┐
│ ━━━━  (grabber)              │
│ Страва і товари          (⊗) │  SheetHeader
│ ‹  Версія 2 з 3  ›  (tag Повернути цю версію) │
│ ┌──────────────────────────┐ │
│ │        photo 16:10       │ │  radius 14, 2pt border
│ └──────────────────────────┘ │
│ ┌chrome magenta┐             │
│ │ Паста з креветками │       │  idea plate 20
│ └──────────────┘             │
│ 25 хв · 2 порції             │  meta 13
│ Summary Golos 17             │
│ Markdown body…               │
│ (tag Готуємо разом)          │
│ ── neon ──────────────────── │
│ Продукти в Сільпо            │  rail
│ [img] Спагеті · 250 г        │
│       Barilla №5 500 г   89 ₴│
│ [img] Креветки · 300 г       │
│       Не знайдено в Сільпо   │
│ Немає в Сільпо, купи окремо  │
│   Петрушка · пучок           │
├━━ neon ━━━━━━━━━━━━━━━━━━━━━━┤
│ Разом, без доставки  437 ₴   │  sticky footer, white
│ (lime Додати 6 товарів у кошик) │
└──────────────────────────────┘
```

The sheet opens at the full detent so the photo, plate and meta clear the sticky footer; 0.6 stays available as a peek. Footer states: no matched products: footer hidden. Cart pending: ShimmerText "Додаємо в кошик…" replaces the button. Cart exists: `basket-filled` 56pt beside "Кошик Сільпо · Готовий до перевірки", "До сплати 1 204 ₴", a 44pt refresh button (Hugeicon) "Оновити суму кошика", lime "Перевірити й оформити" opening `WebBrowser` (without a checkout link the status reads "Товари додано" with the meta "Оформи замовлення в застосунку або на сайті Сільпо."). The warnings block "Перевір товари перед замовленням" and the collapsible "Деталі кошика" sit at the end of the scroll content, not in the footer. Cart error: inline Alert above the footer with the server message or "Не вдалося додати в кошик. Спробуй ще раз."

Products states (copy from the web): `unavailable` "Сільпо зараз не відповідає" / "Спробуй підібрати товари пізніше. А поки купи інгредієнти окремо."; `empty` "У Сільпо не знайшлося товарів" / "Купи ці інгредієнти окремо."; `not_connected` "Потрібно підключити Сільпо" / "Вийди з профілю та підключи Сільпо знову або купи інгредієнти окремо."; `needs_address` "Для товарів потрібна адреса" / "Вкажи адресу доставки в розмові або купи інгредієнти окремо."; no status "Товари Сільпо ще не підібрано" / "Купи ці інгредієнти окремо." Each with `ingredients-basket` at 80pt on the left and the ingredient list beneath. Photo states: generating: 16:10 skeleton; `imageError` or load failure: `serving-dome` 56pt beside an Alert "Фото страви не завантажилося" with the message; no photo and no error: no frame, plate first. Restore error: Alert under the version nav "Не вдалося повернути цю версію. Спробуй ще раз." Product thumbnail failure: a 40pt muted square with a basket Hugeicon.

### Cook-together sheet

```
┌──────────────────────────────┐
│ ━━━━                         │
│ Скільки вас готує?       (⊗) │
│        [oven-mitts 88pt]     │
│      (−)   3 кухарі   (+)    │  44pt ink icon buttons, Oswald 700 28 count
│ Твоє ім’я                    │  only when no name resolves
│ ┌ Наприклад, Аня ──────────┐ │
│ (lime Створити кухню)        │
└──────────────────────────────┘
```

States: busy "Створюємо кухню…"; errors as inline Alert under the field: "Напиши, як тебе називати на кухні." / "Не вдалося створити кухню. Спробуй ще раз."; offline: button disabled, Alert "Немає з’єднання." Cook again reuses it with the previous count and name.

### History sheet

```
┌──────────────────────────────┐
│ ━━━━                         │
│ Історія розмов           (⊗) │
│ [◉◉◉] Паста з креветками     │  40pt photo stack, Oswald 600 17
│       5 хвилин тому · відкрита │  13 muted; row 64pt, swipe left: Видалити
│ [◉]   Томатна вечеря    [🍲] │  pot Hugeicon 44pt opens the kitchen
│       вчора, 14:30           │
│ [ ]   Без назви              │
└──────────────────────────────┘
```

Rows are a native list with swipe-to-delete (destructive red, "Видалити") replacing the ghost delete button; the open thread row has a 25% teal fill. Several rooms on one row: the pot button opens a native menu listing "7 жовт., 19:40 · Готуємо" with state words "Приготовано", "Готуємо", "Потрібна повторна спроба", "Підготовка". States: loading: three skeleton rows; empty: `recipe-box` 112pt with "Тут з'являться попередні розмови."; open error: Alert at the top "Не вдалося відкрити розмову. Спробуй ще раз."; delete error: "Не вдалося видалити розмову. Спробуй ще раз." and the row returns; offline: the list stays readable, swipe actions disabled, banner "Немає зв’язку."

### Profile menu and Settings sheet

Profile menu (`Stack.Toolbar.Menu`): title row with the name or "Акаунт Сільпо"; items "Налаштування" (`gearshape`), "Забути адресу" (`mappin.slash`, disabled without an address), separator, destructive "Вийти" (`rectangle.portrait.and.arrow.right`). Phone and email rows move into the Settings sheet, since native menus cannot hold a reveal toggle.

```
┌──────────────────────────────┐
│ ━━━━                         │
│ Що агент пам'ятає про тебе (⊗)│
│ [ Спогади | Агент ]          │  native segmented control
│ Аня · Телефон: ••• ••• 12 34 (Показати) │  account rows, blurred value, tap reveals
│ ─────                        │
│ (Алергія) Горіхи         7 жовт. │  kind badge tag 13, text 17, date 13; swipe: Видалити
│ (Вподобання) Гостре       учора │
└──────────────────────────────┘
Агент segment: Твоє ім’я на кухні (TextInput), Тон агента (three rows with a checkmark: Теплий / Лаконічний / Грайливий and their descriptions), Що ще враховувати (TextInput multiline, n/1000), Розкажи про себе (n/600). Footer status line: "Зміни зберігаються автоматично" / shimmer "Зберігаємо…" / "Збережено" / Alert "Не вдалося зберегти налаштування. Спробуй ще раз." with "Повторити".
```

States: loading "Завантажуємо спогади…" as ShimmerText with two skeleton rows; empty memories: `memory-fridge` 112pt with "Щойно щось стане для тебе важливим, агент збереже це тут."; delete error "Не вдалося видалити спогад. Спробуй ще раз."; offline: inputs editable, status "Збережемо після підключення."

### Join room

```
┌──────────────────────────────┐
│ [glass] ‹ Головна            │
│ ▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣ │
│ ┌chrome magenta───────────┐  │
│ │ Приєднатися до кухні    │  │
│ └─────────────────────────┘  │
│        [apron-hook 112pt]    │
│ Твоє ім’я                    │
│ ┌ Наприклад, Аня ──────────┐ │  autoFocus, returnKeyType "join"
│ (lime Приєднатися)           │
└──────────────────────────────┘
```

States: busy "Заходимо…"; errors inline: "Відкрий запрошення та напиши своє ім’я." / "Це запрошення вже не працює." / "Не вдалося приєднатися. Спробуй ще раз."; invalid room id: EmptyState `blank-sign` 96pt, "Посилання не працює", "Перевір запрошення та відкрий його ще раз.", ghost "На головну"; backend unavailable: "Кухня недоступна" / "Не вдалося відкрити спільну сесію. Спробуй пізніше."; checking a stored credential (`read === undefined`): plate "Відкриваємо кухню" and ShimmerText "Перевіряємо твоє місце." over two skeleton rows; offline: button disabled, banner.

### Lobby

```
┌──────────────────────────────┐
│ [glass] ‹ Головна  [sf:person.2 1/3] [sf:ellipsis.circle] │
│ ▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣ │
│ ┌chrome magenta──┐           │
│ │ Томатна вечеря │           │  plate 28
│ └────────────────┘           │
│ Збираємося          [mitts]  │  Oswald 600 24 left, oven-mitts 96pt right
│ на кухні                     │
│ Приєдналися 1 з 3            │  13 muted
│ (O) Оля · ти        Господар │  row 56, avatar 30
│ (+) Чекаємо на кухаря        │
│ (+) Чекаємо на кухаря        │
│ (ghost Запросити за посиланням) │  host, cookCount > 1
│ (lime Почати готувати)       │  disabled until everyone joined
└──────────────────────────────┘
```

Rows open People on tap. States: generation error: Alert "План не створився" plus `generationError ?? "Спробуй ще раз."`, host CTA becomes "Спробувати ще раз"; guest text under the list "Господар почне, коли всі приєднаються." or "Господар може повторити створення плану."; solo: no invite button, People only from the More menu; 12 cooks: the list scrolls with the page; offline: banner, CTA disabled; invite sheet states as on the web: "Термін запрошення минув. Створи нове посилання." / "Посилання немає на цьому пристрої. Нове запрошення припинить роботу попереднього." / "Запрошення закрите. Створи нове посилання, щоб запросити кухарів." with "Створити нове посилання" or "Відкрити нове запрошення".

### Plan generating

```
│ ▣ … plate … │
│      [cooking-preparing 120pt]   │
│      Складаємо план              │  Oswald 600 22, centred
│      Розподіляємо роботу між кухарями. │  15 muted (solo: "Готуємо покрокові інструкції для тебе.")
│      ● ● ●  (three teal dots, 0.6→1 opacity, 900ms stagger) │
```

Error: `cooking-waiting` 96pt, Alert "План не створився" with the message, host ghost "Спробувати ще раз". No plan after ready: "План ще готується" / "Інструкції з’являться тут."

### Cooking timeline

```
┌──────────────────────────────┐
│ [glass] ‹ Головна [sf:person.2 2] [sf:bubble•] [sf:ellipsis.circle] │
│ ▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣ │
│ ┌chrome magenta────┐         │
│ │ Паста з креветками │       │
│ └──────────────────┘         │
│ Ти й Аня · 2 порції          │  13 muted
│ 1 з 7 кроків ▓▓░░░░░░░░      │  native ProgressView, teal
│ ✓  Поставити воду · Виконано │  done card 50%, struck
│ 2  ┌black box──────────────┐ │
│    │ Паста вариться   6:42 │ │  collapsed step with a running timer shows the box inline
│    │ Твій таймер           │ │
│    └───────────────────────┘ │
│ ┌active card (ink border)────┐
│ │ [3] Твій крок              │  number tile 40 + eyebrow tealDeep 13
│ │ Дрібно наріж часник        │  Oswald 600 24
│ │ Наріж 2 зубчики дрібними…  │  Markdown 17
│ │ ┌ reference 3:2 ─────────┐ │  dither placeholder → image
│ │ └────────────────────────┘ │
│ │ ☐ Часник почищений         │  48pt rows
│ │ ☑ Нарізано дрібно          │
│ │ (ghost Є питання?) (lime Готово, далі) │
│ └────────────────────────────┘
│ 4  Аня · готує зараз         │
│    Почистити креветки        │
│ 5  Разом · очікує  Чекаємо: Соус │
│                              │
│ ┌glass dock────────────────┐ │  bottom, 64pt, horizontal chips
│ │ [6:42 Паста] [12:00 Соус · Пауза] │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

The step list is one `FlatList`; the current step opens by default. Expanded body: blockers "Чекаємо: {titles}", markdown, temperature "{label}: 180 °C · 356 °F", reference, checklist with anchored timers after their item, confirmation checkbox, together status "Готові: Аня, ще ніхто. Потрібні всі призначені кухарі.", `step.choices` as ink tags, controls row. Controls follow the web rules exactly: "Я готовий", "Передаю, забирай", "Дочекайся таймера" / "Отримав, далі" / "Готово, далі", "Поки готується, до іншого кроку", "Повернутися до кроку", "Скасувати завершення" (text variant), "Є питання?" (ghost). The lime variant applies only to the current step's complete action while `state === "cooking"`.

Timer in a step: BlackBox with buttons by status: running "Пауза", paused "Продовжити", fired "Побачив", else "Старт"; "Додати 1 хвилину"; "Зупинити"; ended: "Повернути" and "Запустити знову". Status words: fired "Перевір страву", cancelled "Зупинено", acknowledged "Перевірено", paused "Пауза". Fired state: the numeral swaps to "0:00", the box border pulses lime once per second (static under Reduce Motion), haptic per the map, local notification when backgrounded.

Dock: `GlassView` regular, radius 22, 64pt tall, 16pt from the screen edges, bottom safe inset + 8, horizontal scroll of ink chips (radius 14, lime numeral Oswald 700 20, label Golos 600 13 white, "Твій таймер" eyebrow 11 teal when mine). Tap scrolls to and expands the step. Appears with `morph`, hides when no timer is running, paused or fired. The list adds 88pt bottom padding while the dock is visible.

Finish: when all steps are done and `state === "cooking"`, a lime "Завершити сесію" card at the end of the list (the per-step lime is gone by then, so the budget holds).

States: offline: banner "Немає зв’язку. План і відлік доступні. Спільні дії стануть доступні після підключення.", mutations disabled, checklist still optimistic; pending room op: the acting button shows its busy label, others dim to 60%; server rejection: inline Alert under the controls with the server string or "Стан кухні змінився. Перевір крок і спробуй ще раз."; reference generating: 3:2 cream frame with an ink dot grid and a slow contrast drift, caption "Готуємо зображення…"; reference failed: "Не вдалося створити зображення." with ghost "Спробувати ще раз"; reference load failed: "Зображення не завантажилось." with "Завантажити ще раз"; no reference yet: "Для цього кроку є візуальна підказка." with "Створити зображення"; done room: a top row "До завершення" (ghost) returns to the ticket; `state === "error"` after start: Alert with retry for the host.

Keep awake while `state === "cooking"` (`expo-keep-awake`).

### Helper sheet

```
┌──────────────────────────────┐
│ ━━━━                         │
│ Помічник                 (⊗) │
│ [ Чат | Нотатки · 2 ]  Для всіх на кухні │
│ Про що говоримо: 2. Соус  ▾  │  native menu button (ink tag with chevron)
│  ┌ ink bubble ───────────┐   │  "Аня" eyebrow 11 on others' bubbles
│  ┌ Помічник card ────────┐   │
│  ┌ proposal card (ink border) │
│  │ Пропоную змінити рецепт  │
│  │ preview markdown         │
│  │ ▸ Що зміниться           │  disclosure
│  │ (lime Застосувати зміни) (text Залишити як є) │
│  └──────────────────────────┘
│ ⟳ Помічник готує відповідь…  │  ShimmerText row
│ ┌glass+chrome──────────────┐ │
│ │ [img+] Запитай або додай фото…  (●↑) │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Empty chat: `helper-ladle` 80pt, "Допоможу з кроком «{title}»." or "Допоможу під час готування.", "Запитай, що незрозуміло, або покажи фото.", chips "Хочу замінити інгредієнт", "Як зрозуміти, що готово?". Loading: "Завантажуємо розмову…" shimmer with two skeleton bubbles. Status: "Зберігаємо…" / "Помічник готує відповідь…" / "Додаємо фото…". Errors: offline "Немає з’єднання. Повідомлення можна надіслати, коли воно відновиться."; attachment "Фото не додалося. Прибери його та спробуй додати ще раз."; helper "Помічник не відповів. Спробуй надіслати повідомлення ще раз." with ghost "Спробувати ще раз" (only when the failed prompt is the last one). Finished room: the composer is replaced by "Готування завершено. Розмова збережена тут." Proposal receipts: "Зміни вже бачать усі кухарі." / "Залишили рецепт без змін." / "Ви вже просунулися далі. Попроси оновити цю пропозицію." Notes: empty `notes-clip` 96pt with "Збережи тут те, що варто пам’ятати під час готування."; rows with swipe "Прибрати" when allowed; form "Нотатка для кухні", placeholder "Наприклад, наступного разу менше солі", ghost "Зберегти нотатку"; errors "Не вдалося зберегти нотатку. Спробуй ще раз." / "Не вдалося прибрати нотатку. Спробуй ще раз."

### Tools sheets

Ingredients: checklist rows 48pt "{name} · {amount}", teal check; empty "Інгредієнти з’являться разом із планом." with `ingredients-basket` 80pt; disabled offline or done. New timer: native menu "Для якого кроку", `TextInput` "Назва" (placeholder "Наприклад, перевірити тісто"), minutes with a native wheel picker 1–180 and a text fallback for more, lime "Додати таймер"; no eligible step: `kitchen-timer` 96pt with "Спочатку почни крок, для якого потрібен таймер." Converter: decimal field, two native pickers "З" / "У", result Oswald 600 24 or "Введи кількість та обери сумісні одиниці.", note "Об’єм у масу залежить від інгредієнта. Для такої заміни запитай помічника." Servings: stepper 1–24 Oswald 700 28, text "Помічник запропонує зміни з урахуванням уже виконаної роботи. Переглянь їх перед підтвердженням.", lime "Переглянути зміну порцій" (dismisses, then opens Helper with the prompt).

### People and Invite sheets

People: list rows avatar 30, name Golos 600 17, "Ти" tag, role line 13 ("Господар · Місце 2", "Спостерігає"); long-press or the trailing `ellipsis` opens a native context menu: "Помінятися місцями", host: "Передати кухню", destructive "Прибрати з кухні" (confirm with `Alert.alert`). "Вільні місця" section with ghost "Взяти місце N"; "Готувати самому" when applicable; non-host footer `danger` "Вийти з кухні"; host footer ghost "Запросити кухарів" and a disclosure "Керування запрошенням" with "Запрошення відкрите." / "Запрошення закрите." and "Закрити запрошення". Errors inline at the top.

Invite: label "Посилання на кухню", read-only link field (Golos 13, one line, middle truncation), lime "Поділитися посиланням" (native share sheet with the URL and "Готуємо «{title}» разом — приєднуйся"), ghost "Скопіювати посилання" → "Посилання скопійовано" for 2s; disclosure "Замінити посилання" with the warning and ghost "Створити нове посилання"; invalid-state copy from the Lobby section; error "Не вдалося створити запрошення. Спробуй ще раз."

### Completion ticket

```
┌──────────────────────────────┐
│ [glass] До інструкцій   [sf:square.and.arrow.up] │
│ ▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣▣ │
│      ┌chrome magenta┐        │
│      │  Смачного!   │        │  plate 28, centred, overlaps the ticket top by 14pt
│ ┌ticket (white, 2pt ink)─────┐
│ │ ┌────────────────────────┐ │
│ │ │      dish photo 16:10  │ │
│ │ └────────────────────────┘ │
│ │   Рамьон з креветками      │  Oswald 600 24 centred
│ │   2 кухарі · 2 порції      │  13 muted
│ │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │  dashed tear line
│ │ (lime Приготувати ще раз)  │
│ │ (ghost До інструкцій)      │
│ └∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿┘  scalloped edge, react-native-svg
│                 [serving-bell 88pt] │
└──────────────────────────────┘
```

Confetti once on entry (Reanimated, 2s, skipped under Reduce Motion), `notificationAsync(Success)`. Photo missing: no frame; photo failed: "Фото не завантажилося." compact inline notice with `serving-dome` 48pt. Offline: banner "Немає зв’язку. Інструкції доступні." and "Приготувати ще раз" disabled. Share: `Share.share` with the photo file and "{title} — приготували разом у Multiplayer Cooking".

## Illustrations

Reuse first. The soft 3D teal family (`apps/web/public/images/*.webp`, 384px square with alpha) is copied into `apps/mobile/assets/images/` and displayed through `expo-image` at the sizes below. New assets must match the reference basket: three-quarter elevated camera, teal enamel or fabric with cream details, restrained chrome, isolated on transparency, no text. Produce them with `$empty-state-illustrations` and `$blender-imagegen`; export 768px square WebP with alpha for 2× and 3× screens.

Reused:

| Asset                                              | Where                             | Size                                       |
| -------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `starter-kitchen-mobile.webp`, `starter-sign.webp` | Connect                           | scene covers the lower half; sign 132pt    |
| `recipe-box.webp`                                  | History empty                     | 112pt                                      |
| `memory-fridge.webp`                               | Memories empty                    | 112pt                                      |
| `ingredients-basket.webp`                          | Products empty, Ingredients empty | 80pt                                       |
| `basket-filled.webp`                               | Cart footer when a cart exists    | 56pt                                       |
| `serving-dome.webp`                                | Photo failures                    | 56pt in the idea sheet, 48pt on the ticket |
| `oven-mitts.webp`                                  | Cook-together sheet, Lobby        | 88pt, 96pt                                 |
| `cooking-preparing.webp`                           | Plan generating                   | 120pt                                      |
| `cooking-waiting.webp`                             | Plan error                        | 96pt                                       |
| `serving-bell.webp`                                | Completion                        | 88pt                                       |

New:

| File                    | Subject                                                                          | Where                                                      | Size  |
| ----------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----- |
| `apron-hook.webp`       | A teal canvas apron with cream ties hanging from one chrome hook                 | Join room                                                  | 112pt |
| `blank-sign.webp`       | A small cream door-hanger plate on a chrome chain, no lettering, slightly tilted | Invalid link, room unavailable                             | 96pt  |
| `helper-ladle.webp`     | A teal enamel ladle resting on a folded cream kitchen towel                      | Helper chat empty                                          | 80pt  |
| `notes-clip.webp`       | A teal clipboard with a blank cream note under a chrome clip                     | Helper notes empty                                         | 96pt  |
| `kitchen-timer.webp`    | A round teal mechanical kitchen timer with a cream dial, no numerals             | New timer with no eligible step; future Live Activity icon | 96pt  |
| `unplugged-kettle.webp` | A cream kettle with its teal cord unplugged and coiled beside it                 | Full-screen offline state when a room cannot load at all   | 112pt |

The app icon is separate work: a magenta sign plate on cream inside a chrome frame, no text, built as a layered icon with light, dark and tinted variants (`app-icons.md`).

## Craft check

Would this plan fit a different product? The native shell would; the band, plate, chrome, black box, lime and the illustrated family would not, and they survive on every root screen. Defaults removed during the check: the floating helper button (an Android pattern that fought the dock), the brand row under the header (a logo repeating on every screen, `branding.md`), the Tools menu-in-a-drawer (replaced by a native menu), the rail "Ідея з’явиться тут" on Home (an empty state that explains nothing), and tinted header glyphs. One accessory still worth questioning: the checker band on the timeline, where screen height is scarce; keep it because it scrolls away in the first 24pt and is the one thing that says "this is the same app" when a guest opens an invite cold.
