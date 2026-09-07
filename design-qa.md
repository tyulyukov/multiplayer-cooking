# Starter kitchen design QA

final result: passed

## Target and evidence

The user selected the third concept from the latest exploration. Source visual truth: `design/mocks/starter-kitchen-reference.png`, 1586 × 992 pixels. The implementation uses the actual connection component with local fixture data at `http://127.0.0.1:5174/design/mocks/illustration-family.html?mode=connect`.

Screenshots use device scale factor 1:

- `design/mocks/starter-kitchen-1440.png`, 1440 × 900 CSS and image pixels.
- `design/mocks/starter-kitchen-900.png`, 900 × 900 CSS and image pixels.
- `design/mocks/starter-kitchen-390.png`, 390 × 844 CSS and image pixels.

The reference and desktop screenshot were opened together in the same comparison input. Their near-identical 16:10 aspect ratios were normalized by displayed width. The full view includes the sign, heading, button, note, wall, tiles, bag, pot, and counter; a separate region crop was unnecessary. Mobile and tablet use purpose-made compositions rather than stretching the desktop objects. The headline and controls remain live HTML.

## Comparison history

1. Initial captures accidentally used an older server on port 5173. Those captures were discarded and replaced with verified port 5174 captures showing the new heading and artwork.
2. Desktop and mobile matched the selected composition. Coordinator inspection found a P2 horizontal join in the tablet background, caused by bottom-aligning a landscape image that did not cover the page height.
3. Added a square tablet scene and switched the background sizing to `cover`. Replaced all three screenshots. The tablet wall is now continuous, both objects remain visible, and the controls remain clear. No actionable P0, P1, or P2 findings remain.

## Interaction and fallback checks

- Tab focuses the connection button. Enter invokes the fixture callback, changes its text to “Відкриваємо Сільпо…”, and sets both `disabled` and `aria-busy`.
- The connection error fixture displays a persistent alert and survives reload. Production retains its existing authentication callbacks and error component.
- Blocking every `/images/starter-*.webp` request on fresh mobile and desktop connection pages removes the scene and sign. The heading, button, and note remain visible and keyboard activation still works. Mobile failure capture: `/tmp/starter-no-art.png`.
- No viewport overflow at the three primary sizes. At 390 × 650, normal vertical scrolling exposes the 760px minimum page; the button remains visible without scrolling.
- No animation was introduced. Existing focus and reduced-motion behavior remain unchanged.
- No application JavaScript console errors. A missing favicon and deliberately blocked image requests produced expected 404 messages.

## Limits

The fixture verifies local UI behavior, not a new login with a real account. No authentication, cart, or backend code changed. The regenerated artwork has small material and lighting differences from the concept; the selected composition and product behavior are preserved.
