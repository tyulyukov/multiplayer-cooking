**Findings**

No actionable P0, P1, or P2 differences.

The selected layout is `design/mocks/lobby-touch-option-2.png`. The implementation uses the same horizontal intro, with the existing oven-mitts asset on the right and the lobby copy on the left. Minor browser font rasterization differs from the raster reference, but the project’s self-hosted Oswald and Golos fonts, token palette, text hierarchy, and copy match the product rules.

**Comparison evidence**

- Source visual truth: `design/mocks/lobby-touch-option-2.png`, 853 × 1844 pixels.
- Rendered implementation: `design/mocks/cooking-lobby-selected-390.png`, 390 × 844 pixels at a 390 × 844 CSS viewport and device scale factor 1.
- Normalization: the source was proportionally normalized to 390 × 844 beside the implementation for full-view comparison. Both showed the waiting state with one of three cooks.
- The combined full-view comparison covered the important focused region: the intro, mitts, roster rows, invite CTA, and disabled start CTA. A separate crop was unnecessary because those details remained readable at the normalized size.
- `design/mocks/cooking-lobby-selected-1440.png` records the same waiting state at 1440 × 1000 CSS pixels.
- `design/mocks/cooking-lobby-selected-12cooks-320.png` records the 12-cook state at 320 × 844 CSS pixels.

**Required fidelity surfaces**

- Fonts and typography: Oswald is used for the title hierarchy and Golos for supporting copy and controls. The two-line lobby title, muted join count, member labels, and CTA text remain legible without clipping.
- Spacing and layout rhythm: the horizontal intro keeps the title and count aligned left with the existing mitts on the right. Roster rules, CTA gaps, and the 16px mobile frame match the selected composition.
- Colors and visual tokens: checker band, blue neon rule, magenta sign, teal current-cook avatar, muted empty slots, ink outlines, and lime disabled CTA use the project tokens.
- Image quality and asset fidelity: the fixture uses the shipped `oven-mitts.webp` through `KitchenIllustration`, with no replacement drawing. Blocking the image removed it and let the copy take the full 358px intro width without a gap.
- Copy and content: Ukrainian waiting-state copy, host label, invite CTA, and disabled start CTA match the selected layout’s meaning. Lobby states contain no plan status card.

**Interaction and responsive evidence**

- At 390px, the waiting fixture reported `scrollWidth: 390` for a 390px viewport.
- At 320px, the 12-cook fixture reported `scrollWidth: 320`, rendered all 12 roster rows, and retained the start CTA below the scrollable roster.
- At 900px and 1440px, the fixture had no horizontal overflow.
- The roster control `Кухарі: Оля` received visible keyboard focus with a solid outline. The lobby header contained zero player-count buttons.
- A full lobby can start while the plan generates. The immediate state shows `Складаємо план` with no timeline; mocked plan arrival then renders the recipe timeline.
- Playwright console check reported no errors or warnings for the final transition run.

**Implementation Checklist**

1. Keep the selected `lobby-touch-option-2` horizontal lobby composition.
2. Keep the current `KitchenIllustration` fallback behavior when the mitts asset fails.
3. Preserve the lobby-to-loading-to-timeline transition.

**Follow-up Polish**

The long recipe title in the user's subsequent screenshot exposed a width mismatch between the header and lobby. The lobby now uses a shared 480px maximum column for the brand, recipe sign, and roster, a 28px checker band, and a 24px recipe title. These rules apply only before cooking starts.

- `design/mocks/cooking-lobby-header-847.png` shows the actual component at the screenshot's 847px CSS width. All three columns start at 183.5px and measure 480px wide.
- `design/mocks/cooking-lobby-header-390.png` shows the long title wrapping to two lines on mobile. Both actions remain visible at 390 × 844.
- At 320px and 390px, all three columns have 16px gutters. Document width equals viewport width at 320px, 390px, and 847px.
- `bun run check` passed after the header change, including 141 tests, type checking, lint, formatting, and the production build.

final result: passed
