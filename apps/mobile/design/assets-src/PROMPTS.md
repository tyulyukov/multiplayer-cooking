# Mobile app icon generation record

Generated on 2026-10-07 with the built-in imagegen tool. Blender 5.2.1 LTS was available but was not used. These assets are raster illustrations; there is no Blender scene, render seed, or deterministic model setting.

## Selected artwork

Candidate B, magenta diner, supplies `../../assets/icon.png`. Its magenta background separates both cream handles from the backdrop at 60px. The teal pot stays dominant and the checker floor connects it to the diner identity. Candidate A loses handle contrast against cream. Candidate C adds a spotlight shape that competes with the pot.

The central object is one closed teal enamel pot with two cream handles and a cream knob. The handles suggest cooking together. There is no text. The supplied basket is a style reference only.

## Shared scene specification

Slightly elevated three-quarter orthographic camera; chunky rounded miniature proportions; teal enamel #3ec1be; warm cream #f3eee4; restrained chrome; soft studio lighting from upper left. The prompts specify this appearance rather than numerical camera coordinates, lights, or roughness. Generated enamel is glossy, matching the existing basket and recipe-box references. Colours include physically shaded and illuminated variations.

The iOS output is a flattened, opaque, full-bleed square. Corners are unmasked, following [Apple app icon guidance](https://developer.apple.com/design/human-interface-guidelines/app-icons). The transparent object exports share the selected pot. They contain neither floor nor cast floor shadow.

## Exact candidate prompts

Each generation call used `transparent_background=false` and `referenced_image_paths=[apps/web/public/images/ingredients-basket.webp]`, resolved to the absolute project path. The basket was inspected before generation.

### Candidate A, cream

```text
Use case: stylized-concept. Create a single production iOS app icon for Multiplayer Cooking. Output 1024 x 1024, completely opaque full-bleed square with sharp square canvas corners; the operating system will mask the corners. No inset app tile, no pre-rounded corners. Reference image is STYLE ONLY: match chunky rounded miniature proportions, tactile teal enamel #3ec1be, warm cream #f3eee4, restrained chrome, soft studio lighting from upper left, slightly elevated three-quarter orthographic product render. Central symbol is one squat teal enamel cooking pot with exactly two big cream loop handles, one on each side, to suggest cooking together. Closed teal domed lid, big cream rounded knob, one restrained chrome lid rim. Pot and both handles fill about 78 percent of image width, centrally balanced; clean simple silhouette, thick substantial details readable at 60px. No text, letters, logos, numbers, watermark, food, steam, utensils, people, sparkles, UI, detailed kitchen scenery. Keep teal pot clearly separate from background. Candidate A, cream diner. Background warm cream #f3eee4, smoothly lit. A bold black ink #16191d and warm white checker floor occupies only the lower 28 percent of the canvas with large squares in perspective. A single subtle magenta #d6408b accent is confined to a wide enamel collar directly beneath the cream lid knob. The floor is secondary to the pot. Light gentle contact shadow. Icon should feel warm, tangible, uncluttered.
```

### Candidate B, magenta

```text
Use case: stylized-concept. Create a single production iOS app icon for Multiplayer Cooking. Output 1024 x 1024, completely opaque full-bleed square with sharp square canvas corners; the operating system will mask the corners. No inset app tile, no pre-rounded corners. Reference image is STYLE ONLY: match chunky rounded miniature proportions, tactile teal enamel #3ec1be, warm cream #f3eee4, restrained chrome, soft studio lighting from upper left, slightly elevated three-quarter orthographic product render. Central symbol is one squat teal enamel cooking pot with exactly two big cream loop handles, one on each side, to suggest cooking together. Closed teal domed lid, big cream rounded knob, one restrained chrome lid rim. Pot and both handles fill about 78 percent of image width, centrally balanced; clean simple silhouette, thick substantial details readable at 60px. No text, letters, logos, numbers, watermark, food, steam, utensils, people, sparkles, UI, detailed kitchen scenery. Keep teal pot clearly separate from background. Candidate B, magenta sign. Background is a solid rich diner magenta #b82c74, gently lit, with no frame, gradients only from physical studio lighting. A bold black ink #16191d and cream checker floor occupies lower 22 percent, large squares in perspective. Pot is teal and both handles cream, knob cream, no additional magenta on the pot. High separation between subject and background. Light gentle contact shadow. Icon should read as a confident bright diner sign.
```

### Candidate C, ink

```text
Use case: stylized-concept. Create a single production iOS app icon for Multiplayer Cooking. Output 1024 x 1024, completely opaque full-bleed square with sharp square canvas corners; the operating system will mask the corners. No inset app tile, no pre-rounded corners. Reference image is STYLE ONLY: match chunky rounded miniature proportions, tactile teal enamel #3ec1be, warm cream #f3eee4, restrained chrome, soft studio lighting from upper left, slightly elevated three-quarter orthographic product render. Central symbol is one squat teal enamel cooking pot with exactly two big cream loop handles, one on each side, to suggest cooking together. Closed teal domed lid, big cream rounded knob, one restrained chrome lid rim. Pot and both handles fill about 78 percent of image width, centrally balanced; clean simple silhouette, thick substantial details readable at 60px. No text, letters, logos, numbers, watermark, food, steam, utensils, people, sparkles, UI, detailed kitchen scenery. Keep teal pot clearly separate from background. Candidate C, night diner. Background ink #16191d. A large cream #f3eee4 softly illuminated circular spotlight behind the pot fills 86 percent of the square width but is NOT an inset rounded app tile. A narrow checker floor band of large cream and ink squares occupies lower 20 percent. One wide magenta enamel collar beneath cream knob. Soft bright studio lighting on teal pot, restrained chrome rim. No neon glow or thin lines. The circular light gives the teal pot a clear silhouette on dark background.
```

## Exact extraction prompt

The edit target was `icon-candidates/candidate-b-magenta.png`. The call used `transparent_background=true`.

```text
Use case: background-extraction. Image 1 is the EDIT TARGET, selected Multiplayer Cooking app icon. Extract only the existing teal enamel cooking pot, including BOTH cream loop handles with their holes, teal closed lid, cream knob and restrained chrome rim and fittings. Preserve the existing object geometry, colour, camera, material highlights and shading exactly. Remove the entire magenta wall, checker floor, ground plane and cast/contact floor shadow. Replace all background pixels, including inside both handle holes, with genuinely transparent zero-alpha background. Do NOT paint a checkerboard, white background or magenta matte. Do not redraw or restyle the pot. Keep all object edges clean with no magenta fringe. Single central isolated object, square canvas with clear margin. Object occupies about 85 percent of width. No text, no additional objects. Save actual PNG with RGBA transparency.
```

The first extraction had actual alpha but left detached pixels and edge residue. It is retained as `pot-cutout-first.png` for provenance.

## Exact correction prompt

The edit target was the first extraction. The call used `transparent_background=true`. Its result is `pot-cutout-source.png`.

```text
Use case: precise-object-edit. Image 1 is the edit target: an isolated teal enamel pot on transparent background. Repair only the cutout alpha mask and edge fringe. Remove every detached pixel, coloured fleck and stray residue outside the pot. Remove residual white and magenta matte around outer contour and inside both cream handle holes. Keep smooth antialiased edges and genuinely transparent zero-alpha pixels outside the exact clean object silhouette. Both handle openings must be entirely transparent in the gaps. Preserve the pot shape, camera angle, cream knob and handles, teal enamel, chrome rim, lighting, colours and all opaque interior pixels. No restyling, no background, no shadow, no added object. Re-centre intact whole pot with at least 8 percent clear margin on all sides on a square RGBA PNG canvas. This is a final production splash illustration.
```

## Source and export settings

All five original generator outputs were 1254×1254 PNGs. Original candidates are `icon-candidates/candidate-a-source.png`, `candidate-b-source.png`, and `candidate-c-source.png`. Their named cream, magenta, and ink exports are 1024×1024 RGB PNGs, resized with Pillow 12.1.1 Lanczos. The selected magenta export was copied directly to `../../assets/icon.png`.

The corrected RGBA pot was cropped to its alpha bounding box, preserving every nonzero-alpha pixel. The cropped image was fitted proportionally into an 86% width and height box on the 512×512 splash canvas, and a 64% box on the 1024×1024 Android canvas. Both use Lanczos resampling and centered alpha compositing onto transparent RGBA canvases. Padding is added without changing the pot shape or colours.

The old placeholder is preserved byte-for-byte in `icon-old.png`. No app configuration was changed. The current splash background is cream #f3eee4; the current Android adaptive background is #0e7c77. The Android foreground was inspected against that existing background.

## Verification

- `icon.png`: 1024×1024, RGB, completely opaque, square unmasked corners.
- `splash-icon.png`: 512×512, RGBA, alpha range 0–255, four corner alpha values 0; 67.60% fully transparent pixels.
- `android-icon-foreground.png`: 1024×1024, RGBA, alpha range 0–255, four corner alpha values 0; 82.08% fully transparent pixels.
- Android alpha bounding box: left 184, top 199, right 839, bottom 800. All nonzero-alpha pixels are inside the centered 66% safe square, bounded by 174.08 and 849.92 pixels.
- All candidates and final assets were visually inspected at 60px and 180px. The splash was inspected on cream and ink. The Android foreground was inspected on the configured teal background. Both handles, the lid, and the pot body remain recognizable at 60px; chrome stays a secondary edge detail.
- Small previews live beside this file and in `icon-candidates/`. The local comparison page is `icon-review.html`.

The alpha audit used `/Users/tyulyukov/.agents/skills/blender-imagegen/scripts/audit_alpha.py` on both transparent exports. Dimensions, image modes, and safe-zone bounds were also checked with Pillow.

Workspace typechecking, linting, formatting, and all 222 tests passed. The full `bun run check` pipeline was not run because its web build stage writes outside the two authorized asset directories. The comparison page was previewed at 728px and 390px with no browser console errors.

# Mobile empty-state kitchen family

Created on 2026-10-07 with Blender 5.2.1 LTS. The briefs below guided procedural modeling, rather than imagegen calls. `illustrations/render_family.py` is the reproducible source; each subject also has a saved `.blend` scene and its original 768×768 RGBA PNG in `illustrations/`.

## References and shared brief

Studied `apps/web/DESIGN.md`, its "Empty states and service failures" and "Kitchen illustration family" sections, and `apps/web/design/illustration-prompts.md`. Visually inspected `ingredients-basket.webp`, `oven-mitts.webp`, `recipe-box.webp`, `memory-fridge.webp`, `serving-dome.webp`, and `basket-filled.webp` in `apps/web/public/images/`.

```text
Create one isolated soft-3D kitchen miniature for Multiplayer Cooking. Match ingredients-basket.webp as the master style reference and the existing kitchen illustration family. Slightly elevated three-quarter orthographic camera, rounded substantial proportions, teal #3ec1be enamel or canvas, warm cream #f3eee4 details, restrained chrome, soft upper-left studio lighting. Keep contact shading within the objects. Whole subject centered with clear margins and a readable silhouette at 80–112px. Real transparent alpha everywhere outside the objects and inside handle and chain gaps. No floor, wall, backdrop, text, numerals, logo, watermark, people, UI, food, or floating decorations. Cream is the dominant material only for the specified sign and kettle. Static square artwork.
```

## Subject briefs

Each subject uses the shared brief above.

### apron-hook.webp

```text
Join room screen, 112pt. One teal canvas apron with a broad rounded lower panel, small front pocket, cream neck loop and cream waist ties. Hang the neck loop from one small chrome wall hook. Show tactile canvas and gentle fabric folds. Include the isolated hook without a wall. Keep the neck-loop opening transparent.
```

### blank-sign.webp

```text
Invalid link or room unavailable, 96pt. One blank warm cream door-hanger plate with thick rounded edges, hanging from a short chrome chain attached at two small chrome fittings. The chain is an inverted U above the plate. Absolutely no lettering, symbol, or decoration. Show the plate and chain alone without a door, wall, or door knob. Keep chain openings transparent.
```

### helper-ladle.webp

```text
Helper chat empty, 80pt. One open teal enamel ladle resting diagonally across a folded cream towel. A substantial rounded ladle bowl, a simple long teal handle with a small cream grip, and a softly folded towel with restrained teal edge stitching. Keep this close pair compact and legible at 80pt. The bowl is visibly concave; the towel has layered folded edges and a matte fabric surface.
```

### notes-clip.webp

```text
Helper notes empty, 96pt. One small teal clipboard with rounded substantial edges, a completely blank cream note, and one restrained chrome spring clip at the top. Show enough thickness and a small chrome clip arch to read as a miniature object. No writing, ruled lines, checkboxes, or symbols.
```

### kitchen-timer.webp

```text
No timers or new timer unavailable, 96pt. One round teal mechanical kitchen timer with a cream dial and a substantial teal turning knob. A small cream pointer and twelve restrained teal tick marks, but no numerals or lettering. A narrow chrome dial rim and a small rounded teal foot. Strong recognizable circular silhouette.
```

### unplugged-kettle.webp

```text
Offline or room cannot load, 112pt. One squat rounded cream electric kettle with a teal lid and open loop handle, a cream lid knob, and a cream pouring spout. A coiled teal power cord rests beside the kettle, ending in an unplugged teal plug with two visible restrained chrome pins. Show the entire cord and plug. No outlet, steam, water, wall, base station, or scene. Keep the kettle-handle opening transparent.
```

## Modeling and export recipe

All six share one setup: Cycles, 64 samples with denoising, orthographic camera looking from direction `3.2, -7, 3.5`, and object-centered framing that fits the projected geometry into 84% of a square canvas. Materials convert the specified sRGB colors to linear values. Enamel roughness is 0.27, cream 0.36, teal canvas 0.75, cream towel fabric 0.85, and chrome 0.25 with metallic 0.85. Fabric uses a restrained noise bump. Three large area lights provide upper-left key, fill, and rim lighting. World strength is 0.35; transparent film hides the world. Color management is Standard with exposure -0.85. There is no floor.

The first renders were too muted beside the reference. Lighting and color management were corrected, framing was fitted to evaluated geometry, and all six were rerendered. The apron and towel received a final fabric pass. The cream plate is a chain-hung sign, which interprets "door-hanger" without adding a door or knob. All other subjects retain the requested meaning.

`illustrations/export_family.py` exports the source PNGs with Pillow 12.1.1 to 768×768 WebP, quality 85, method 6, preserving alpha. It also creates the cream #f3eee4 contact sheet with six new assets and three references at 112px. `family-size-review.png` shows every new asset beside the master basket at 112px, then again at its requested 80px, 96px, or 112px size.

## Final audit

| WebP                  |  KiB | Dimensions | Alpha range | Corner alpha |
| --------------------- | ---: | ---------- | ----------- | ------------ |
| apron-hook.webp       | 18.5 | 768×768    | 0–255       | 0, 0, 0, 0   |
| blank-sign.webp       | 23.8 | 768×768    | 0–255       | 0, 0, 0, 0   |
| helper-ladle.webp     | 16.8 | 768×768    | 0–255       | 0, 0, 0, 0   |
| notes-clip.webp       | 14.1 | 768×768    | 0–255       | 0, 0, 0, 0   |
| kitchen-timer.webp    | 21.5 | 768×768    | 0–255       | 0, 0, 0, 0   |
| unplugged-kettle.webp | 25.8 | 768×768    | 0–255       | 0, 0, 0, 0   |

The six WebPs total 123,430 bytes, about 120.5 KiB. All source PNGs and final WebPs pass `blender-imagegen/scripts/audit_alpha.py`. The final WebPs were inspected individually and beside the master basket at 112px on cream; transparent edges and internal openings were also inspected against a dark background. The dial and notes remain text-free. Every export is below 60 KiB.

This task delivers artwork only. The mobile helper and tools routes were placeholders during inspection, so verification uses the supplied display sizes. No app integration or commit was performed. `bun run check` was not run because its web build writes outside the two directories authorized for this task.
