# Illustration generation prompts

Generated with the built-in imagegen tool, using `public/images/ingredients-basket.webp` as the visual reference. Final assets are `public/images/<name>.webp`, resized to 384 × 384 with cwebp at quality 82, method 6, alpha quality 100.

Each asset used the shared prompt followed by its placement prompt.

## Shared prompt

Use case: stylized-concept. Create one production UI illustration for Multiplayer Cooking. The supplied basket is a STYLE REFERENCE, not an object to include unless the subject explicitly asks for a basket. Match its slightly elevated three-quarter orthographic camera, chunky rounded miniature proportions, glossy teal enamel (#3ec1be with deeper teal shading), warm cream (#f3eee4) details, restrained chrome, tactile materials, soft studio lighting and restrained contact shading. Isolate on a genuinely transparent alpha background, including internal gaps. Square composition, entire subject centered with a small clear margin, occupying about 85% of the canvas so it reads at small size. No embedded text, writing, logos, watermark, scenery, decorative backdrop, ground plane or floating decorations.

## recipe-box

Empty history drawer, displayed 112px square above a short message. Subject: a miniature teal enamel recipe index-card box, rounded corners, lid slightly open with a few blank cream index cards and cream tabs visible. Tiny restrained chrome hinge, no writing. Simple strong silhouette.

## memory-fridge

Empty memories section, displayed 112px square above a short message. Subject: a tiny single teal retro fridge door, rounded edges, a small cream handle with restrained chrome fittings. One blank cream paper note held by one small round teal magnet. Show enough thickness to read as a miniature object, no full kitchen.

## bag-pot

Connection card, displayed 128px square above a paragraph and primary button. Subject: a miniature warm cream grocery paper bag with rounded folded edges and handles beside a squat teal enamel cooking pot with a cream lid knob and very restrained chrome rim. Close compact pair, approximately balanced height and visual weight. No branding, no writing, no groceries spilling out.

## serving-dome

Inline failed dish-photo notice, displayed only 64px square beside a visible error, not inside a photo frame. Subject: a warm cream plate under a fully closed rounded chrome serving dome with a small teal knob. Simple readable silhouette, softly brushed chrome with gentle broad reflections, no mirror scenery. Dome completely hides plate contents; no visible food, no implied actual dish.

## basket-filled

Cart heading, displayed only 64px square. Create a filled companion to the supplied reference basket: preserve teal slotted basket body, chunky cream handles with small chrome hardware, camera angle and proportions. Fill the interior with a modest group of groceries: a cream milk carton with absolutely no label, a baguette, a few leafy greens and a tomato. Keep groceries contained and silhouette compact. Preserve the small existing ink-and-cream checker trim as a basket detail. Omit the loose external vegetables and hanging shopping list to simplify at 64px. Represents groceries ready for review. No checkmarks, celebration, receipt, text, logos or order-confirmation symbols.

## oven-mitts

Cook-count dialog, displayed 104px square above the count stepper. Subject: exactly two plump quilted fabric oven mitts leaning gently together, one teal and one warm cream with subtle contrasting cream/teal cuffs. Tactile softly stitched cloth, rounded mitten thumbs, a close friendly pair. Match reference basket camera, lighting and visual weight, but fabric rather than enamel. No arms, people, kitchen, food or multiplayer completion symbols.

## Transparency corrections

The first oven-mitts and basket-filled outputs had painted checkerboard backgrounds. A second built-in edit requested background extraction with genuine zero-alpha pixels, preserving the subject, materials, camera, and lighting. The basket edit explicitly retained the checker trim on the basket. Final exports were checked for transparent corners and partial alpha.
