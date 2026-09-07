# Design

Multiplayer Cooking looks like the Сільпо diner on пров. Семафорний 4 in Odesa: a black and white checkered floor, magenta signs with chrome frames, teal gas pumps at the checkouts, a lime "Гастрономія" wall, blue and pink neon tubes on the ceiling. Every UI decision maps back to one of those objects. Reference photos and the four original mock directions live in `design/mocks/`. The app uses direction C, `design/mocks/c-checker-signage.html`. Open that file when a screenshot answers a question faster than this document.

The values in this file are the source of truth. `src/index.css` must match them. When they differ, fix `src/index.css`.

## Store object to UI element

| Store object             | UI element   | Where it appears                                          |
| ------------------------ | ------------ | --------------------------------------------------------- |
| Checkered floor          | Checker band | Top of every screen, one row of squares                   |
| Neon tube on the fascia  | Neon line    | Under the checker band, before a results area, focus ring |
| "Овочі та фрукти" sign   | Sign plate   | The screen title, one per screen                          |
| Chrome trim on counters  | Chrome frame | Composer, result card, timer box, number tile             |
| "Гастрономія" lime wall  | Lime CTA     | The single primary action on a screen                     |
| Black menu board         | Black box    | Timers and live numbers                                   |
| Teal pump                | Teal         | Brand mark, status, the current user, step number tile    |
| Cherry corrugated fascia | Cherry       | Errors only                                               |
| Ink outlines on signage  | Ink tag      | Quick prompts, filters, secondary buttons                 |

## Palette

| Token                  | Value                                                                 | Role                                                         |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `--background`         | `#f3eee4`                                                             | Cream page background                                        |
| `--foreground`         | `#16191d`                                                             | Ink: text, outlines, dark checker squares, black box         |
| `--card`               | `#ffffff`                                                             | Paper surfaces, light checker squares                        |
| `--muted`              | `#e9e3d7`                                                             | Skeletons, quiet fills, hover on white                       |
| `--muted-foreground`   | `#666d74`                                                             | Secondary text                                               |
| `--border`, `--input`  | `#ddd6c9`                                                             | Quiet borders on cards                                       |
| `--primary`            | `#c8e63c`                                                             | Lime: the one primary action, "everyone" cook colour         |
| `--primary-foreground` | `#1f2a00`                                                             | Text on lime                                                 |
| `--accent`             | `#e5127f`                                                             | Magenta: sign plate, "now" markers, other cooks              |
| `--accent-foreground`  | `#ffffff`                                                             | Text on magenta                                              |
| `--accent-deep`        | `#b40d63`                                                             | Bottom shade of the sign plate                               |
| `--teal`               | `#3ec1be`                                                             | Pump teal on fills: brand dot, number tile, the current user |
| `--teal-deep`          | `#147d7b`                                                             | Teal for text and icons on light surfaces                    |
| `--neon-blue`          | `#3f7dff`                                                             | Neon lines and the focus ring                                |
| `--ring`               | `#3f7dff`                                                             | Same as `--neon-blue`                                        |
| `--destructive`        | `#b5223b`                                                             | Cherry: error text and icons                                 |
| `--destructive-soft`   | `#fbe9ea`                                                             | Error background                                             |
| `--chrome`             | `linear-gradient(160deg, #f2f4f6, #a7b0ba 40%, #6d7883 70%, #f2f4f6)` | Chrome frames                                                |
| `--radius`             | `0.75rem`                                                             | Base radius, buttons                                         |

Contrast limits that follow from these values:

- White on magenta passes only for text 24px and larger, or 19px bold. Body text never sits on magenta.
- Teal `#3ec1be` passes only as a fill behind ink text. Teal text and icons on cream or white use `--teal-deep`.
- Lime text appears only on ink. Lime is otherwise a fill behind `--primary-foreground`.

## Colour budget per screen

Magenta appears once: the sign plate, the idea plate in chat mode, or the "now" marker when the screen has no plate. Lime marks the primary action and the "everyone" cook colour. Teal marks identity and status. Blue appears only as neon lines and the focus ring. Ink and cream carry everything else. A new element that needs a colour takes ink or cream first. If it must stand out, check which slot in this budget is free before adding a colour.

## Type

| Face                          | Token         | Role                                                                         |
| ----------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Oswald 500, 600, 700          | `--font-sign` | Signage: the sign plate, section labels, rails, step numbers, timer numerals |
| Golos Text 400, 500, 600, 700 | `--font-sans` | Everything else: body, buttons, inputs, card text                            |

Nothing in the product is uppercase. Oswald and Golos Text are both set in sentence case; a tracked uppercase label reads as generated UI. Oswald `letter-spacing` stays between `0` and `0.03em`. For labels use the `.sign-text` class from `src/index.css`.

Sizes on a 390px screen:

| Element          | Face       | Size                        |
| ---------------- | ---------- | --------------------------- |
| Sign plate title | Oswald 700 | 34px, line-height 1         |
| Session title    | Oswald 600 | 24px, line-height 1.05      |
| Timer numeral    | Oswald 700 | 56px, line-height 1         |
| Step number      | Oswald 700 | 22px                        |
| Label or rail    | Oswald 600 | 13px, letter-spacing 0.02em |
| Body and inputs  | Golos 400  | 17px, line-height 1.5       |
| Button           | Golos 700  | 16px                        |
| Tag              | Golos 600  | 14px                        |
| Meta line        | Golos 400  | 12px, `--muted-foreground`  |

Both faces are self-hosted variable fonts from the `@fontsource-variable/oswald` and `@fontsource-variable/golos-text` packages, imported at the top of `src/index.css`. The CSS family names are `Oswald Variable` and `Golos Text Variable`. Ukrainian glyphs (і, ї, є, ґ) are covered by both.

## Component kit

Each component below has one job. Reuse them before drawing anything new.

**Checker band.** Full-bleed strip at the top of the screen, 48px tall, `repeating-conic-gradient(var(--foreground) 0 25%, var(--card) 0 50%) 0 0 / 48px 48px`, with a neon line on its bottom edge. One per screen. Content starts 18px below it.

**Neon line.** A 3px `--neon-blue` line with `box-shadow: 0 0 8px var(--neon-blue), 0 2px 14px color-mix(in oklch, var(--neon-blue) 50%, transparent)`. Uses: under the checker band, as a divider before a results area. The focus ring is the same blue without glow. Glow appears on nothing else except timer numerals in a black box.

**Sign plate.** The screen title. Chrome frame 3px, radius 18px outside, 15px inside. Magenta fill with `inset 0 0 0 2px #ff8fcb` highlight and `inset 0 -6px 0 var(--accent-deep)` shade. Oswald 700 34px white in sentence case, padding 10px 18px 12px. `display: inline-block` so it hugs the text. One per screen.

**Chrome frame.** A 3px `--chrome` border on a white surface. Use the `.chrome` class from `src/index.css`; it sets `border: 3px solid transparent` and paints the gradient in the border box. Outer radius 22px for the composer, 22px for the timer box, 14px for the step number tile. Frames hold content that has state: the composer, the result card, timers. Buttons and tags never get chrome.

**Composer counter.** Golos 13px `--muted-foreground` with tabular figures, bottom left of the composer. Hidden until the request reaches 80% of the 1024 character limit. Past the limit it turns cherry, the frame takes a cherry ring, the CTA is disabled, and a submit attempt shakes the frame.

**Lime CTA.** The `Button` default variant. Lime fill, `--primary-foreground` text, `box-shadow: 0 0 0 2px var(--foreground), inset 0 -3px 0 rgb(0 0 0 / 0.15)`, radius 12px, height 50px, Golos 700 16px. Pressed state keeps the ink ring and drops the inset shade to 1px. One lime button per screen.

**Ink tag.** The `Button` outline variant. White fill, 2px `--foreground` border, radius 10px, Golos 600 14px, icon 18px in `--teal-deep`. Pressed (`aria-pressed="true"`): ink fill, white text, lime icon. Tags wrap in a flex row with 8px gaps.

**Ghost button.** Secondary actions next to a lime CTA: white fill, 2px ink border, radius 12px, Golos 600 15px.

**Rail.** A section label: Oswald 600 13px `--muted-foreground` centred between two 2px lines at 15% ink opacity. Not an empty state. The empty home screen is the composer alone.

**Idea plate.** The sign plate at 22px (`.plate.plate-sm`) naming the current idea inside the idea pane or the compact idea card. It is the one magenta element in chat mode.

**Dish photo.** One landscape photo above the idea plate, radius 14px, 2px `--border`, `object-fit: cover`. The full pane uses a 16:10 frame, the compact card 16:9. Older sourced photos show a credit line in Golos 12px `--muted-foreground` with a link to the source page. Generated photos have no source credit. No photo means no frame: the plate moves to the top. A failed generation or image load shows a compact inline error while the recipe remains readable.

**Connect card.** The gate before the first idea. A chrome frame, radius 22px, padding 20px, with one paragraph, the lime CTA "Підключити Сільпо" with the store icon, and a Golos 14px `--muted-foreground` note on what is stored where. The sign plate above it reads "Підключи Сільпо, щоб почати".

**Profile menu.** An ink tag in the top right with the user icon and the person's name, with "Профіль" as the fallback, opening a shadcn dropdown: 2px ink border, radius 14px, items in Golos 600 15px with teal icons. Under the name, "Телефон:" and "Пошта:" rows in Golos 13px show the value blurred as scrambled characters of the same length, so the row does not change width when a tap reveals it. "Вийти на цьому пристрої" is the destructive item and sits last after a separator.

**Topbar.** The brand and the menu sit in the same 1200px frame on every screen, so nothing in the header moves between the home screen and a conversation.

**Question card.** One to four questions in a shadcn Questionnaire inside the chrome composer. A collapsible header shows the current question number and total. Options are ink tags stacked in a column; a chosen option fills ink with white text. Each question may allow several choices or a custom answer. Navigation uses "Назад", "Далі", and the final "Надіслати" action. Number shortcuts select options. Keyboard focus can move through the choices before the person commits an answer. Answered questions collapse to their labels and selected answers.

**Version nav.** "Версія N з M" in Oswald 600 15px between two ghost arrow buttons at the top of the idea pane. Older versions show an ink tag "Повернути цю версію" on the right. Hidden when there is one version.

**Dialog titles.** Every Dialog, Sheet, and Drawer opens with one Oswald 600 24px title that names what the person can do there ("Історія розмов", "Скільки вас готує?", "Що агент пам'ятає про тебе") and no description line under it. If the title needs a second sentence to be understood, the title is wrong.

**History panel.** A 560px shadcn Sheet from the right on desktop and a Drawer from the bottom on mobile, opened by the "Історія" ink tag. Each row has up to three overlapping 40px photos with 10px radius, the title in Oswald 600 17px on up to two lines or "Без назви", the time in Golos 13px `--muted-foreground`, and a ghost delete button. Time is relative and refreshes each minute: "щойно", "5 хвилин тому", "3 години тому", "вчора, 14:30", then the full localized date with time. The whole row is one surface: `--muted` on hover and press, 25% teal for the open thread. Only the list scrolls.

**Photo attachments.** The composer has a ghost image button on the left of its action row; up to four photos show above it as 72px shadcn Attachment tiles with a 2px ink border and a round ink-bordered remove button. In a person's bubble the photos sit in a grid of square thumbnails with 10px radius above the text; tapping one opens the shadcn Dialog as a lightbox on an ink background.

**Servings dialog.** "Готуємо разом" opens a shadcn Dialog on desktop and a Drawer on mobile titled "Скільки вас готує?". A stepper with two ink icon buttons and the count in Oswald 700 28px, then the lime "Зберегти кількість кухарів". After saving, a bordered note replaces the button.

**Chat bubbles.** A person's message is an ink fill with white text, radius 14px with a 4px bottom-right corner, at most 88% wide and right-aligned. The agent's text is a white card with 2px `--border` and a 4px bottom-left corner. A single generation status names the current activity in Golos 13px `--muted-foreground`. Waiting text uses the shimmer from transitions.dev.

**Card.** White, 2px `--border`, radius 14px, padding 12px 14px. The active card ("now") switches the border to `--foreground`. Done cards drop to 50% opacity with struck-through text.

**Black box.** Chrome frame around an ink fill. Timer numerals in Oswald 700 56px lime with `text-shadow: 0 0 12px color-mix(in oklch, var(--primary) 60%, transparent)`. Supporting text in white and `#d4dae0`.

**Number tile.** Chrome frame, 14px radius, teal fill, Oswald 700 34px ink numeral with `inset 0 -5px 0 rgb(0 0 0 / 0.15)`. Used for step counters. Numbers appear only for real sequences.

**Brand dot.** 14px teal circle with a 2px ink ring, next to the app name in Oswald 600 16px. The dot drops to `--muted` when the backend is not ready.

**Cook colours.** The current user is teal with ink text. Another cook is magenta with white text. Everyone together is lime with `--primary-foreground` text. Avatars are 28px to 30px circles with a 2px background-coloured border, Golos 700 11px initial.

**Error.** The `Alert` destructive variant: cherry text and icon on `--destructive-soft`, 2px cherry border at 30%.

## Empty states and service failures

Product search is optional to a saved recipe. When Сільпо is unavailable or returns no matching products, the idea still shows its recipe and shopping list. The products section holds a small illustration, a short status heading, and one sentence explaining that the ingredients below can be bought independently. Ingredient names and recipe amounts remain visible. Partial matches show the available products followed by the missing ingredients. The cart action appears only when products can be added.

Empty-state illustrations are custom image-generated artwork or Blender renders in the same soft 3D style. Use rounded miniature grocery or kitchen objects, matte clay or enamel, cream surfaces, teal as the main colour, and small chrome or ink checker details. Natural food colours are limited to small ingredient accents. Keep the composition isolated on transparency, with soft studio lighting and restrained contact shading inside the artwork. The illustration has no text, logo, embedded UI, or decorative backdrop. CSS surfaces retain the existing no-shadow rule.

The reference asset is `public/images/ingredients-basket.webp`: a teal basket, cream handles, a blank shopping list, and two vegetables. It was made with the built-in image generator. Its prompt describes a compact three-quarter orthographic product render, retro diner materials, a mostly empty basket, a transparent background, and legibility at 160px. The products empty state renders it at 96px wide on mobile, with empty alt text because the adjacent status conveys its meaning. Its local image-failure handler removes the basket and applies `.products-empty-text-only` so the heading and shopping list reclaim the illustration's grid column. The six companions below use `KitchenIllustration`; their flex or grid containers close the gap when it returns no image.

### Kitchen illustration family

Match the basket's slightly elevated three-quarter camera, rounded proportions, visual weight, and soft lighting. Teal enamel or tactile fabric carries the colour, cream supplies the details, and chrome stays restrained. Use one isolated object or a close pair. Leave the background transparent, including spaces between handles. Keep text, logos, decorative backdrops, and embedded UI out of the artwork. Food colours appear only as small grocery accents.

The six companion assets live in `public/images/`. Each is a 384px square WebP with alpha, displayed at the sizes below on mobile and desktop. Use `KitchenIllustration` for decorative companions. It supplies empty alt text, fixed dimensions, and removes a failed image without removing adjacent content. Keep illustrations static and outside the tab order.

| Placement             | Asset                | Display size and rule                                                                                                                                                                                                                                                           |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty history         | `recipe-box.webp`    | 112px, centred above the existing message. Teal recipe box with cream index cards. Hide it while loading and when history has entries.                                                                                                                                          |
| Empty memories        | `memory-fridge.webp` | 112px, centred above the existing message. Tiny teal fridge door with a blank cream note and magnet. Hide it while loading and when memories exist.                                                                                                                             |
| Сільпо connection     | `bag-pot.webp`       | 128px, centred inside the connect card before the paragraph. Grocery bag beside an enamel pot. Keep the connection button and privacy note visible.                                                                                                                             |
| Failed dish photo     | `serving-dome.webp`  | 64px beside the inline cherry error. Cream plate under a closed chrome serving dome. This is a generic photo-failure symbol, never a depiction of the recipe. Keep the error, recipe, ingredients, and actions usable. A recipe with no photo and no error has no illustration. |
| Cart ready for review | `basket-filled.webp` | 64px beside the cart heading, only when a cart exists and is not updating. Filled companion to the reference basket. Preserve "Готовий до перевірки", totals, warnings, and checkout controls. No order-confirmation symbols or copy.                                           |
| Cook-count dialog     | `oven-mitts.webp`    | 104px, centred above the stepper. Teal and cream oven mitts lean together. Preserve the count, save action, and saved-count note. This dialog only stores the number of cooks.                                                                                                  |

Keep prices and controls more prominent than the cart and error illustrations. At 390px, allow adjacent text to wrap and keep every control within the content width. Do not replace the dish-photo frame with artwork. CSS surfaces retain the no-shadow rule; soft contact shading belongs inside the asset only. The app icon, social preview, and future multiplayer scenes are separate work.

The [generation prompts](design/illustration-prompts.md) record the reference and each subject. The [actual-component fixture](design/mocks/illustration-family.html) exposes `history`, `memories`, `connect`, `image`, `broken`, `cart`, and `cooks` through its `mode` query parameter. Add `pending=1` to the cart fixture to inspect the updating state. The fixture uses local data and does not connect an account or change a cart.

Expected absence uses ink and muted text. A blocking service failure uses the cherry error treatment beside the affected content. Unavailable product search uses the illustrated neutral state because the ingredient list remains usable. Persistent failures belong inline: image generation beside the recipe, product search above the shopping list, and cart errors beside the cart action. Transient action errors can use an existing toast only when no persistent context is needed. Never use a toast as the only record of a failed generation.

Errors name what failed and the next useful action in Ukrainian. Provider names, stack traces, and raw API responses stay out of product copy. A failed AI reply keeps the conversation and tells the person to retry from the composer. An image failure keeps the saved recipe. A product failure keeps the ingredient list. Each failure releases its loading state; retry remains an explicit user action.

## Shape and depth

Radii scale with size: 22px for the composer and timer box, 18px for the sign plate, 14px for cards, 12px for buttons, 10px for tags, full round for avatars and dots. Depth comes from outlines, frames, and inset bottom shades, the way painted signage does. Drop shadows appear nowhere. Gradients appear only in `--chrome`.

## Motion

Motion tokens live at the top of `src/index.css` and follow the transitions.dev scale. The `.tactile` class gives every button the press feedback. Neon glows and chrome are static. Screens have no load animation. Skeletons pulse in `--muted`. Add motion only when a user action changes something on screen, and pick the transition with the transitions.dev decision rules. The pot icon on the generate button rocks on hover and for as long as a request runs; it stops under reduced motion.

The desktop history Sheet slides from the right and fades its backdrop on open, then reverses on close. Use motion tokens, a faster exit, and Radix state attributes so the closing animation finishes before unmount. Reduced motion removes the slide. Keep the mobile Drawer's existing gesture motion.

## Icons

Hugeicons Stroke Rounded at `strokeWidth={1.5}`. 20px inside buttons and tags, 16px inside labels. `--teal-deep` on light surfaces, lime on ink, current colour inside a filled button.

## Copy

Ukrainian, addressed as "ти". Buttons name the action: "Згенерувати", "Готово, далі", "Помінятися". Labels stay short enough to sit in a sign plate on one or two lines. Empty states show the next action instead of a placeholder line. The composer placeholder is "Опиши страву або напиши, що є вдома". Errors say what happened and what to do: "Відповідь не прийшла вчасно. Спробуй ще раз."

Empty states and errors may use one sentence to explain the next action, as specified above. Other titles, totals, and buttons have no explanatory line beneath them. A number gets one label ("Разом, без доставки"), a list gets one heading ("Немає в Сільпо, купи окремо"), and the button text says what happens. If a screen needs a paragraph to explain a control, the control is wrong. Copy that could sit under any product's title ("Переглянь і повернися до розмови") says nothing about this one and is cut.

## Adding a screen

1. Start with the checker band, the brand row, and a sign plate that names the screen.
2. Put the main content in a chrome frame or in cards. Pick the frame when the content has state.
3. Place one lime CTA. Everything else is an ink tag or a ghost button.
4. Check the colour budget: magenta once, lime once, teal for identity, blue for neon lines only.
5. Build in `design/mocks/` first when the screen adds a new component. Use `c-checker-signage.html` for static layouts or render the actual React components as in `service-fallback.html`. Screenshot at 390px wide and keep the PNG next to the mock.
6. Test at 390px wide, with keyboard focus visible, and with reduced motion on.
