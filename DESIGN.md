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

Magenta appears once: the sign plate, or the "now" marker when the screen has no plate. Lime marks the primary action and the "everyone" cook colour. Teal marks identity and status. Blue appears only as neon lines and the focus ring. Ink and cream carry everything else. A new element that needs a colour takes ink or cream first. If it must stand out, check which slot in this budget is free before adding a colour.

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

**Card.** White, 2px `--border`, radius 14px, padding 12px 14px. The active card ("now") switches the border to `--foreground`. Done cards drop to 50% opacity with struck-through text.

**Black box.** Chrome frame around an ink fill. Timer numerals in Oswald 700 56px lime with `text-shadow: 0 0 12px color-mix(in oklch, var(--primary) 60%, transparent)`. Supporting text in white and `#d4dae0`.

**Number tile.** Chrome frame, 14px radius, teal fill, Oswald 700 34px ink numeral with `inset 0 -5px 0 rgb(0 0 0 / 0.15)`. Used for step counters. Numbers appear only for real sequences.

**Brand dot.** 14px teal circle with a 2px ink ring, next to the app name in Oswald 600 16px. The dot drops to `--muted` when the backend is not ready.

**Cook colours.** The current user is teal with ink text. Another cook is magenta with white text. Everyone together is lime with `--primary-foreground` text. Avatars are 28px to 30px circles with a 2px background-coloured border, Golos 700 11px initial.

**Error.** The `Alert` destructive variant: cherry text and icon on `--destructive-soft`, 2px cherry border at 30%.

## Shape and depth

Radii scale with size: 22px for the composer and timer box, 18px for the sign plate, 14px for cards, 12px for buttons, 10px for tags, full round for avatars and dots. Depth comes from outlines, frames, and inset bottom shades, the way painted signage does. Drop shadows appear nowhere. Gradients appear only in `--chrome`.

## Motion

Motion tokens live at the top of `src/index.css` and follow the transitions.dev scale. The `.tactile` class gives every button the press feedback. Neon glows and chrome are static. Screens have no load animation. Skeletons pulse in `--muted`. Add motion only when a user action changes something on screen, and pick the transition with the transitions.dev decision rules. The pot icon on the generate button rocks on hover and for as long as a request runs; it stops under reduced motion.

## Icons

Hugeicons Stroke Rounded at `strokeWidth={1.5}`. 20px inside buttons and tags, 16px inside labels. `--teal-deep` on light surfaces, lime on ink, current colour inside a filled button.

## Copy

Ukrainian, addressed as "ти". Buttons name the action: "Згенерувати", "Готово, далі", "Помінятися". Labels stay short enough to sit in a sign plate on one or two lines. Empty states show the next action instead of a placeholder line. The composer placeholder is "Опиши страву або напиши, що є вдома". Errors say what happened and what to do: "Відповідь не прийшла вчасно. Спробуй ще раз."

## Adding a screen

1. Start with the checker band, the brand row, and a sign plate that names the screen.
2. Put the main content in a chrome frame or in cards. Pick the frame when the content has state.
3. Place one lime CTA. Everything else is an ink tag or a ghost button.
4. Check the colour budget: magenta once, lime once, teal for identity, blue for neon lines only.
5. Build in `design/mocks/` first when the screen adds a new component. Copy `c-checker-signage.html`, screenshot at 390px wide, and keep the PNG next to it.
6. Test at 390px wide, with keyboard focus visible, and with reduced motion on.
