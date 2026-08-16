# Laundry Chair Image Prompts

Generation method: OpenAI built-in image-generation tool  
Generated: August 15, 2026  
Rights boundary: original AI-generated editorial illustrations; no Yetch or Simone Giertz product photography was used as input

These prompts intentionally describe a generic chair-and-rail concept. The final visuals must never be labeled as Laundry Chair product photos, hands-on evidence, or exact depictions of Yetch's production furniture.

## Cover / Open Graph Source

```text
Use case: photorealistic-natural
Asset type: ColinMichaels.com blog cover and social crop source
Primary request: a witty editorial lifestyle photograph about the universal “half-dirty clothes chair” problem and a clever furniture solution
Scene/backdrop: tidy but lived-in modern bedroom, warm wood floor, neutral plaster wall, soft morning daylight
Subject: one original unbranded deep green corduroy lounge chair with a simple curved hardwood hanging rail pivoted behind the chair, holding one denim jacket and one cream shirt neatly; a small messy pile of once-worn clothes on the floor nearby shows the problem being solved
Style/medium: photorealistic editorial interior photography, believable furniture scale and materials, subtle natural imperfections
Composition/framing: wide landscape, chair prominent, clean negative space, mobile-safe center crop, no people
Lighting/mood: warm, curious, useful, lightly humorous, premium magazine realism
Color palette: deep green, walnut, cream, denim blue, warm neutrals
Materials/textures: visible corduroy ribbing, solid hardwood grain, natural cotton and denim
Constraints: original generic furniture concept, not an exact replica of any commercial product; no brand marks; no logos; no text; no price; no watermark; no distorted clothing; chair remains visibly usable as a seat
Avoid: showroom sterility, sci-fi mechanisms, luxury mansion styling, people, hands, duplicated rails, impossible geometry, product packaging
```

Final derivatives:

- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-cover.webp` — 1200×675
- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-og.jpg` — 1200×630

## Article Thumbnail

The cover source was the authoritative edit target.

```text
Use case: text-localization
Asset type: square ColinMichaels.com article-card thumbnail
Input images: Image 1 is the edit target and authoritative scene
Primary request: create a square, phone-readable curiosity thumbnail by cropping the original chair and rail tightly and adding one short truthful headline
Composition/framing: 1:1 square; chair and hanging rail fully understandable; strong central silhouette; keep key details away from crop edges
Text (verbatim): "CLOTHES CHAIR?"
Typography: render the exact phrase once in large condensed uppercase white type with a dark outline; place it in open wall space without covering the chair or garments
Constraints: preserve the original furniture, room, garments, lighting, materials, and editorial-photo realism; change only crop and headline; no logos; no brand names; no extra text; no price; no watermark; no arrows or circles; do not imply hands-on ownership or testing
Avoid: duplicated rails, fake product labels, tiny text, distorted furniture, sensational styling
```

Final derivative:

- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-thumbnail.webp` — 1200×1200

## Inline Problem Comparison

```text
Use case: photorealistic-natural
Asset type: ColinMichaels.com in-article editorial illustration showing the behavior problem
Primary request: a realistic side-by-side bedroom scene comparing the ordinary clothes-chair problem with a more intentional place for once-worn clothes
Scene/backdrop: the same modest modern bedroom photographed from a straight-on wide angle
Subject: left half shows a plain wooden chair buried under a believable pile of jeans, sweatshirt, and shirt; right half shows an original unbranded rust-red corduroy lounge chair with a separate simple curved hardwood rail behind it holding three garments neatly while the seat remains empty
Style/medium: photorealistic editorial home photography, truthful everyday clutter, premium but not glossy
Composition/framing: wide landscape diptych with a clear visual divide created by room architecture, no labels or text, both chairs fully visible
Lighting/mood: soft neutral daylight, relatable, lightly humorous
Color palette: warm neutrals, denim blue, rust red, walnut
Materials/textures: natural wrinkles, worn denim, knit cotton, corduroy ribbing, hardwood grain
Constraints: original generic furniture concept, not an exact commercial product; no people; no logos; no words; no watermark; no impossible rail geometry; keep the right chair usable and clothes visibly aired rather than packed together
Avoid: extreme mess, dirty stains, showroom perfection, sci-fi parts, duplicate objects, floating hangers, split-screen graphic line
```

Final derivative:

- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-inline-problem.webp` — 1500×1000

## Inline Alternatives Comparison

```text
Use case: photorealistic-natural
Asset type: ColinMichaels.com in-article editorial illustration for the “is it actually useful?” verdict
Primary request: a realistic small-bedroom floor-plan comparison showing the space and cost tradeoff between a premium chair-plus-clothes-rail concept and a simple inexpensive clothes valet
Scene/backdrop: compact ordinary bedroom corner with a closet door, warm wood floor, neutral wall
Subject: one original unbranded deep green corduroy lounge chair with a curved hardwood garment rail positioned behind it, holding two once-worn garments; nearby, clearly separate, a slim freestanding wooden clothes valet with one shirt and trousers; enough empty floor is visible to understand their different footprints
Style/medium: photorealistic consumer editorial photography, honest apartment scale, natural texture
Composition/framing: wide high three-quarter angle, both options fully visible and visually distinct, no people
Lighting/mood: clear daylight, practical, analytical, calm
Color palette: green, walnut, cream, muted blue, warm neutrals
Materials/textures: corduroy ribbing, wood grain, cotton, denim
Constraints: original generic furniture designs, not replicas; no product logos; no text; no price labels; no watermark; no impossible geometry; do not make the premium chair look magical or the simple valet look broken
Avoid: luxury mansion, showroom staging, visual arrows, infographic labels, measuring numbers, people, clutter piles, duplicated furniture
```

Final derivative:

- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-inline-alternatives.webp` — 1500×1000

## YouTube Thumbnail

The cover source was the authoritative edit target.

```text
Use case: text-localization
Asset type: 16:9 Captain Colin YouTube thumbnail
Input images: Image 1 is the edit target and authoritative scene
Primary request: turn this scene into a bold but truthful YouTube thumbnail by tightening the crop around the chair and garment rail and adding one short curiosity headline
Composition/framing: 16:9 landscape; keep the chair and hanging rail large and fully understandable; keep the bottom-right clear for YouTube's duration badge
Text (verbatim): "$1,100 CLOTHES CHAIR?"
Typography: render the exact phrase once in very large condensed uppercase white lettering with a dark near-black outline and subtle warm shadow; place it in open wall space without covering the chair or clothing; the dollar sign, comma, and question mark must be exact
Constraints: preserve the original furniture, room, garments, lighting, materials, and editorial-photo realism; change only crop and headline treatment; no faces; no logos; no brand names; no arrows; no circles; no badges; no extra text; no watermark; do not imply hands-on ownership or testing
Avoid: fake sale labels, red urgency graphics, duplicated furniture, sensational damage, tiny typography
```

Final derivative:

- `/src/assets/images/blog/gadgets/laundry-chair-half-dirty-clothes-youtube-thumbnail.jpg` — 1280×720

## Production Notes

- WebP derivatives use quality 82; JPEG derivatives use a high-quality visually reviewed export.
- Every final path was inspected after crop and format conversion.
- The source generations remain in the local Codex generated-image store. This package preserves the exact prompt set needed to recreate or revise the visuals without treating a compressed derivative as a new source master.
- Media Library rights note: `AI-generated editorial illustration. Not a Yetch product photo, independent test, or evidence that Colin handled the Laundry Chair.`
