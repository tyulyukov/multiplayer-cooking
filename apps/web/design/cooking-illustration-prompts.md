# Cooking illustration prompts

These assets support the cooking session. Visual rules are in [DESIGN.md](../DESIGN.md).

## Status illustrations

`cooking-preparing` shows a small teal preparation notebook on a transparent background. The object uses rounded enamel and paper forms, cream details, a restrained chrome detail, soft studio light, and a small contact shadow inside the artwork. It contains no text, logo, interface, or backdrop.

`cooking-waiting` shows a small teal pot waiting on a transparent background. It uses the same rounded enamel, cream details, restrained chrome, soft studio light, and internal contact shadow. It contains no text, logo, interface, or backdrop.

The authored PNGs are `design/assets/cooking-preparing.png` and `design/assets/cooking-waiting.png`. The 384px-wide exports are `public/images/cooking-preparing.webp` and `public/images/cooking-waiting.webp`. The live preparing status displays its export at 112px. The waiting export appears in the design prototype. The PNGs have a real alpha channel with transparent pixels. The WebPs retain alpha data with values from 0 through 254.

## Recipe references

`cooking-prep-3d` is a soft 3D preparation reference. Use it for cut size, preparation, or arrangement. The scene is a clean close view of garlic chopped into small, even pieces on a cream work surface, with rounded diner materials and restrained teal details. It is an opaque 3:2 image.

`cooking-prep-photo` is a realistic food photograph. Use this style when texture or doneness must be visible. The image must show the actual food state in clear, neutral light, without decorative diner styling that obscures the food. It is an opaque 3:2 image.

The authored PNGs are `design/assets/cooking-prep-3d.png` and `design/assets/cooking-prep-photo.png`. The application-ready images are `public/images/cooking-prep-3d.webp` and `public/images/cooking-prep-photo.webp`, each 1000 × 667. The PNG sources are 1536 × 1024. None of the four reference files has an alpha channel.

## Audit

The audit used `sips -g pixelWidth -g pixelHeight -g hasAlpha` and a read-only Pillow alpha scan. It found transparent pixels in both status PNGs and no alpha channel in either preparation or photography reference. The audit did not modify image bytes.

The preparing illustration used this generation prompt with the existing oven-mitts image as its visual reference:

> Create a new isolated soft 3D cooking-app illustration for preparing a cooking plan, displayed 112px wide above live Ukrainian status text. Use attached oven mitts only as style reference: tactile matte rounded objects, warm cream and muted teal, softly elevated three-quarter camera, gentle studio light. Subject: a small open cream recipe notebook with completely blank pages and a teal ribbon, with one teal measuring spoon resting diagonally across the lower page. Compact clean silhouette and generous margins, square composition. No food, people, lettering, symbols, logos, background scene, UI or checkerboard. Require actual transparent alpha background including every gap; no simulated checkerboard. Preserve the reference's material quality, not its mitt subject.

Live image generation uses the step-specific prompt in `convex/lib/cooking_reference.ts`. The two static food references demonstrate the selected styles; they never substitute for an unrelated recipe image.
