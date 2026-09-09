# Completion fixture QA

The fixture runs at `design/mocks/cooking-completion/preview.html`. It uses local in-memory room data and does not call Convex.

Playwright CLI checked the fixture at 390 × 900, 900 × 900, 1440 × 900, and 320 × 900. Browser plugin support was not available. The local Vite URL was `http://127.0.0.1:5173/design/mocks/cooking-completion/preview.html`.

- The all-done cooking mode changes to the completion screen when **Завершити сесію** is clicked. Focus moves to `#completion-heading`.
- The canvas painted immediately after the click. `completion-confetti-frame-390.png` recorded `hidden: false` and a 390-pixel canvas. It hid after 2.3 seconds. `completion-confetti.webm` records the complete burst.
- Opening and closing the cook-again drawer after the burst left the mounted canvas hidden. The real `CooksForm` opens in the same Drawer pattern as the route. Submitting in this fixture only posts an in-memory notice. The route owns the real `cookAgain` mutation and navigation.
- **До інструкцій** restores the completed timeline without changing the room state. The recipe title receives focus. The checklist, timer restore, and timer restart controls are disabled. **До завершення** returns to the ticket.
- `no-image`, `broken-image`, `offline`, `guest`, `solo`, and `long-title` modes all rendered without horizontal overflow at 390 pixels. The broken dish image showed `Фото не завантажилося.`. A forced 404 for `serving-bell.webp` removed the decorative bell without overflow. Offline state kept instructions available and disabled cook again.
- At 390, 900, 1440, and 320 pixels, the completed screen used the generated ramen image, rendered no generated-image credit, resolved `/images/serving-bell.webp`, and hid the confetti canvas after two seconds. `prefers-reduced-motion: reduce` set the canvas display to `none`.
- The final Playwright console check had no application errors. The initial page load requested a missing `favicon.ico`; it does not affect the fixture.

Limitations: this is Chromium-only local QA. It does not test the live Convex room, real mutation, or cross-browser rendering.

Artifacts:

- `completion-done-390.png`, `completion-done-900.png`, `completion-done-1440.png`, `completion-done-320.png`
- `completion-confetti-frame-390.png` and `completion-confetti.webm`
- `cook-again-drawer-390.png` and `completion-broken-image-390.png`
