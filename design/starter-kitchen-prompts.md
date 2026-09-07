# Starter kitchen artwork

The selected third concept is saved in `mocks/starter-kitchen-reference.png`. Built-in imagegen produced the background scenes and the hanging sign. No Blender geometry was needed for these static images.

## Desktop scene

Use case: stylized-concept
Asset type: full-bleed desktop cooking-app background artwork
Primary request: Create a faithful text-free background-only adaptation of the supplied reference image. Keep the same frontal, slightly elevated, wide 1.6:1 camera framing; preserve the left grocery bag and lower-right cooking objects with a large uncluttered center-top area for real interface content.
Input images: Image 1: composition, material, lighting, and placement reference.
Scene/backdrop: a cosy retro Ukrainian kitchen, with a warm cream plaster wall above glossy teal rectangular subway tiles beginning at 60% of the image height, then a thick cream countertop across the lower portion. There is warm soft sunlight and a subtle window-shadow diagonal across the wall.
Subject: lower left, a natural cream canvas grocery bag containing a loaf of bread and leafy greens, with one golden onion in front. Lower right, a teal enamel stock pot with a cream lid on a cream retro single hotplate; folded cream kitchen towels with thin muted teal stripes beside it.
Style/medium: polished tactile 3D product illustration, same friendly retro realism as reference; rounded forms, soft shadows, detailed fabric, enamel, ceramic and tile materials.
Composition/framing: 1600 by 1000 landscape/full-bleed aspect ratio. Put all physical props in the lower left and lower right corners. Keep the central upper 60% and central countertop visually clear for overlaid interface. Tiles span horizontally at 60% height.
Lighting/mood: soft afternoon sunlight from upper left, gentle diagonal window shadows, warm and inviting.
Color palette: warm butter-cream, muted turquoise-teal, pale ivory, natural bread tan, green leaves, golden onion.
Materials/textures: plaster wall, glossy grouted teal subway tiles, matte cream counter, woven canvas bag, glossy enamel pot, cream painted metal hotplate, cotton towels.
Constraints: artwork only. Match the reference placement and camera closely. No words, no letters, no Cyrillic, no UI controls, no buttons, no logo, no hanging sign, no checkerboard strip, no watermark, no people, no extra appliances, no decorations in the empty center.
Avoid: any text, icons, signage, brand marks, UI screenshot appearance, black-and-white checker strip, centered objects, busy background.


## Mobile scene

Use case: stylized-concept
Asset type: narrow mobile app background illustration, artwork only
Primary request: Create a single tall 780 by 1688 portrait mobile kitchen scene that matches the provided reference image's warm, tactile, soft 3D diner aesthetic. The upper 62% of the canvas must be completely empty warm cream plaster wall, with only subtle soft sunlight and gentle natural shadows: no objects, no tile, no signs, no artwork, and no text, so the real mobile interface can sit over it. The lower 38% is a compact kitchen vignette: teal ceramic wall tiles behind a cream countertop. On the left, a small rounded cream grocery bag with an open top holding subtle groceries, fully visible. On the right, a small teal enamel cooking pot with a cream lid on a compact cream retro hotplate, with a folded towel nearby. Both objects must be entirely within the frame and roughly 260 physical pixels tall or less (about 130px at a 390px display), balanced with ample margins; do not make them large, close-up, cropped, or dominant.
Input images: reference image: style reference only
Scene/backdrop: warm cream wall in upper 62%, teal tiled backsplash and cream counter only in lower 38%
Style/medium: soft 3D rendered illustration, rounded tactile forms, premium friendly food-app background
Composition/framing: strict narrow portrait mobile canvas; clean empty wall above; low compact still life across the bottom
Lighting/mood: low-angle soft morning sunlight from upper left, delicately cast shadows
Color palette: warm cream, muted teal, restrained chrome highlights
Materials/textures: matte plaster wall, lightly glossy square ceramic tiles, soft enamel pot, plush fabric towel, rounded paper grocery bag
Text (verbatim): none
Constraints: image only; no writing, no UI, no brand marks, no logo, no signs, no people, no checker or patterned strip at the top, no cropped objects; preserve a large uncluttered cream-wall area
Avoid: typography, letters, labels, logos, watermarks, extra utensils, oversized hero objects, close-up crop, dark moody lighting


## Hanging sign

Extract the hanging Сільпо sign from the selected reference. Preserve the magenta enamel plate, restrained chrome rim, triangular chain and round pin. Keep the exact lettering and a genuinely transparent background. Remove the wall and all other artwork and UI.

## Export

WebP quality 84. Desktop 1600 × 1000, mobile 780 × 1688, sign 384 × 394 with alpha quality 100. The tablet scene is 1200 × 1200. The four assets total 125,964 bytes; each viewport loads one scene and the sign. Sign alpha ranges from 0 to 254; all corner pixels are transparent. Backgrounds are deliberately opaque scenes.

## Tablet scene

Adapt the desktop background to a square composition. Preserve both objects in the lower 35 percent, extend the continuous cream wall through the upper 65 percent, and keep all text and UI out of the asset. Preserve the desktop materials, lighting, and camera without stretching.

## Retina desktop correction, 2026-09-08

The original 1600 × 1000 export supplied only 55.6% of the dimensions needed at a 1440 × 900 CSS viewport with device pixel ratio 2. The built-in regeneration still returned 1586 × 992 despite a larger-size prompt. The user authorized OpenRouter for native high-resolution generation.

Used OpenRouter’s official `openrouter-images` edit script and `google/gemini-3.1-flash-image-preview`, requesting `resolution: 4K` and `aspect_ratio: 3:2`. The returned JPEG is 5056 × 3392. Source: `design/sources/starter-kitchen-4k.jpg`. The crop removes 232px of blank upper wall, producing 5056 × 3160 before downsampling. No image was upscaled.

Restore this exact approved kitchen background as a native 4K high-detail render for a Retina desktop. Preserve the composition, camera, perspective, object sizes and positions, warm cream wall, soft sunlight, teal tiled backsplash, grocery bag and onion on the left, teal enamel pot on a cream hotplate and folded towel on the right. The upper and central wall must remain empty for live website controls. Keep every object and edge in sharp focus: visible fine canvas weave and stitching, clean tile grout lines, individual parsley leaves, fine onion skin, crisp enamel and chrome highlights. Do not introduce blur, depth of field, haze, smoothing, new objects, lettering, UI, signs, logos or borders. This is a detail restoration, not a redesign. Adapt the original 16:10 composition to 3:2 only by a small extension of the blank upper wall, never stretch objects.

Exports use cwebp method 6: standard 1920 × 1200 at quality 92, 97,462 bytes; Retina 3840 × 2400 at quality 95, 502,840 bytes. Native CSS `image-set()` selects the density; the single-URL declaration remains as fallback. Mobile, tablet, sign, layout, and authentication behavior are unchanged. Candidate mobile/tablet rerenders were not integrated because they changed the approved composition or introduced lettering.
