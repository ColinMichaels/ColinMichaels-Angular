# ColinMichaels.com Blog Post Creation Skill

**Purpose:** Use this skill whenever creating a new blog post package for **colinmichaels.com**.

This document defines the repeatable process for turning a rough idea, voice note, weekly recovery update, project description, photo set, or article concept into a complete blog-ready package.

A complete package usually includes:

1. A polished blog post draft.
2. A CMS-compatible JSON import file.
3. A square post thumbnail prompt or generated image.
4. An optional 16:9 hero / Open Graph image prompt or generated image.
5. Optional social sharing copy for Facebook or other platforms.
6. When generated images are included, an image manifest that lets the CMS upload and attach them in one New Post package import.

---

## 1. Core Output Standard

Every new blog post should be created with the following deliverables unless the request says otherwise:

```markdown
## Proposed Title

[Title]

## Excerpt

[Short excerpt]

## Categories

[Categories]

## Tags

[Tags]

## Blog Draft

[Full post]

## Image Direction

[Thumbnail / hero image prompt]

## JSON Export

[Downloadable JSON import file when requested]
```

When the user asks specifically for a JSON file, create a valid downloadable `.json` file.

When the user asks specifically for a Markdown reference, prompt, or skill file, create a downloadable `.md` file.

### Generated image package contract

For a post package with generated images, keep the post JSON, images, and `image-manifest.json` in one folder. Use `media://` placeholders in the post JSON for every generated media field, then list the same placeholder and relative file path in the manifest:

```json
{
  "images": [
    {
      "file": "images/post-cover.webp",
      "reference": "media://images/post-cover.webp",
      "role": "cover",
      "altText": "Accurate descriptive alt text"
    }
  ]
}
```

Use only safe relative paths. Valid roles are `cover`, `post-background`, `open-graph`, `thumbnail`, `inline-image`, and `editor-image`. The CMS New Post **Import post package** action uploads every manifest file through the trusted media workflow, replaces only declared media placeholders, and leaves the result as an unsaved draft for review. Exact duplicate source files reuse an existing finalized media asset; changed source bytes create a new immutable asset rather than replacing an old one. Package import cannot update an existing article: an already-used slug triggers an explicit warning and confirmation before a separate draft with a unique slug is imported. Do not put `media://` values in prose, links, embeds, or other non-image fields.

---

## 2. ColinMichaels.com Voice and Vibe

The writing should sound personal, grounded, and honest.

The site’s voice is:

- First-person when the post is personal.
- Reflective without being overly sentimental.
- Practical without sounding clinical.
- Honest about setbacks.
- Forward-looking without pretending everything is fixed.
- Lightly funny when appropriate.
- Human, not corporate.

The best posts usually feel like:

> “Here is what happened, what I learned, and maybe this helps someone else.”

Avoid writing that sounds like:

- A generic AI wellness article.
- A medical brochure.
- A corporate SEO post.
- A motivational speaker monologue.
- A detached technical manual, unless the post is intentionally technical.

---

## 3. Common Post Types

Identify the post type before drafting.

### Weekly Recovery Update

Used for cardiac recovery progress, rehab, pain, weight, sleep, work, activity, pets, drones, or family updates.

Typical structure:

1. Short emotional/state-of-life opening.
2. What changed this week.
3. What stayed the same.
4. Wins.
5. Setbacks.
6. What comes next.
7. Grounded closing.

### Personal Essay

Used for reflection posts such as fear, wrong choices, recovery lessons, pain, gratitude, or personal growth.

Typical structure:

1. Strong personal hook.
2. Story or realization.
3. Lesson learned.
4. Broader reflection.
5. Practical takeaway.
6. Closing thought.

### Medical Lesson / Recovery Resource

Used for posts about TENS units, cardiac rehab, pain management, surgery prep, medication tracking, or hospital lessons.

Typical structure:

1. Why the topic came up.
2. Colin’s experience.
3. What helped.
4. What did not help.
5. Caution / doctor disclaimer.
6. Practical checklist or takeaway.

### Project Showcase

Used for software, drones, AI, apps, games, automation, or creative builds.

Typical structure:

1. What the project is.
2. Why it exists.
3. Core features.
4. Tech stack.
5. What was learned.
6. What is next.

### Video / Music Companion Post

Used when embedding or referencing a YouTube video, song, drone edit, Suno track, or creative media project.

Typical structure:

1. Context for the video/song.
2. Why it matters.
3. Production notes.
4. Lyrics or excerpt when appropriate.
5. Embedded media reference.
6. Reflection.

---

## 4. Categories

Use 1–3 categories per post.

Recommended categories:

- Health & Recovery
- Cardiac Recovery
- Personal Stories
- Medical Lessons
- Personal Growth
- Projects
- AI & Automation
- Drones & FPV
- Photography & Video
- Creative Technology
- Life Updates
- Opinion
- Tutorials
- Experiments

For weekly recovery posts, a strong default is:

```json
[
  "Health & Recovery",
  "Personal Stories",
  "Cardiac Recovery"
]
```

---

## 5. Tags

Use 5–15 tags.

Tags should be specific but reusable.

### Recovery Tag Examples

```json
[
  "Endocarditis",
  "Open Heart Surgery",
  "Cardiac Rehab",
  "Recovery",
  "Heart Valve Repair",
  "Return To Work",
  "Sleep Recovery",
  "Pain Management",
  "Weight Loss",
  "Healthy Lifestyle"
]
```

### Personal / Lifestyle Tag Examples

```json
[
  "Personal Growth",
  "Life Lessons",
  "Family",
  "Recovery Journey",
  "Mental Health",
  "Resilience"
]
```

### Drone / Creative Tag Examples

```json
[
  "FPV",
  "Drones",
  "Drone Footage",
  "Photography",
  "Video Editing",
  "Jupiter Florida",
  "Outdoor Recovery"
]
```

### Project / Tech Tag Examples

```json
[
  "Angular",
  "Firebase",
  "AI Tools",
  "Automation",
  "Web Development",
  "App Prototype",
  "Creative Coding",
  "Side Project"
]
```

---

## 6. Writing Structure

Use short paragraphs and clear section headings.

### Recommended Article Flow

```markdown
# Title

Opening paragraph with a direct personal hook.

## Section Heading

Short paragraph.

## Section Heading

Short paragraph.

## What I Learned

Practical reflection.

## This Week's Wins

- Win one
- Win two
- Win three

## Final Thought

Grounded closing.
```

### Strong Opening Examples

- “This week was not dramatic, and honestly, that might be the best news.”
- “Pain has a way of making you negotiate with yourself.”
- “I thought cardiac rehab was going to be something completely different.”
- “Some lessons only become obvious after life forces you to slow down.”
- “Recovery is weird because progress does not always feel like progress while it is happening.”

### Strong Closing Examples

- “I am not fully there yet, but I am a lot further than I was. For now, that counts.”
- “The goal is not just getting back to normal. The goal is building something healthier than normal.”
- “This week was not perfect, but it was progress. That is enough.”
- “Recovery is still a work in progress, but at least now it feels like life is coming back into the picture.”

---

## 7. Medical Content Rules

For posts involving surgery, cardiac rehab, pain, medications, diabetes, THC drinks, TENS units, supplements, or treatment options, include cautious language.

### Preferred Disclaimer

Use a simple human disclaimer when appropriate:

```text
I am not a doctor, and this is not medical advice. This is just what I am learning through my own recovery, and anything medical should be discussed with your own care team.
```

### Preferred Medical Phrasing

Use:

- “For me…”
- “In my experience…”
- “My doctor recommended…”
- “This seemed to help temporarily…”
- “This is something I am asking my care team about…”

Avoid:

- “This cures…”
- “Everyone should…”
- “This is guaranteed…”
- “This is better than medication…”
- “You should stop taking…”

---

## 8. SEO Requirements

Every post should include the following metadata.

### Title

Clear, personal, and searchable.

Examples:

```text
Cardiac Rehab Is Not What I Expected
Pain Management Without Reaching for Painkillers
Even Though You Were Wrong, You Can Still Be Right
Recovery Update #10: Back to Normal(ish)
```

### Slug

Lowercase, hyphen-separated.

Example:

```text
recovery-update-10-back-to-normalish
```

### Excerpt

1–2 sentences suitable for blog cards and previews.

Example:

```text
Full-time work continues, cardiac rehab rolls on, sleep is finally improving, drones are back in the air, and life is slowly starting to feel normal again.
```

### SEO Description

Approximately 140–180 characters.

Example:

```text
A weekly recovery update covering cardiac rehab, work, sleep improvements, flying drones again, Father's Day reflections, and life after open-heart surgery.
```

---

## 9. Confirmed CMS JSON Import Format

Use this format for JSON exports.

This structure is based on a working import example from `recovery-update-10-full-import.json`.

### Top-Level Structure

```json
{
  "version": 1,
  "source": "colinmichaels-cms",
  "collection": "posts",
  "exportedAt": "2026-06-19T20:00:00Z",
  "totalPosts": 1,
  "posts": []
}
```

### Post Object Structure

Each post object should contain:

```json
{
  "id": "post-example-slug",
  "slug": "example-slug",
  "title": "Example Blog Post Title",
  "excerpt": "Short excerpt for blog previews.",
  "coverImage": "/assets/images/blog/category/example-slug.webp",
  "author": {
    "name": "Colin Michaels",
    "title": "Applications Developer"
  },
  "categories": [
    "Health & Recovery",
    "Personal Stories"
  ],
  "tags": [
    "Recovery",
    "Personal Growth"
  ],
  "status": "draft",
  "seo": {
    "title": "Example Blog Post Title",
    "description": "Short SEO description.",
    "openGraphImage": "/assets/images/blog/category/example-slug-og.jpg"
  },
  "contentFormat": "editorjs",
  "blocks": [],
  "createdAt": "2026-06-19T20:00:00Z",
  "updatedAt": "2026-06-19T20:00:00Z",
  "publishedAt": null
}
```

### Important Schema Notes

The confirmed format stores Editor.js blocks directly at:

```json
"blocks": []
```

Do **not** wrap blocks inside:

```json
"body": {
"blocks": []
}
```

unless a newer CMS example proves that the schema changed.

Use:

```json
"contentFormat": "editorjs"
```

Use:

```json
"status": "draft"
```

unless the user explicitly asks for `"published"`.

Use:

```json
"publishedAt": null
```

for draft posts.

---

## 10. Editor.js Block Format

### Paragraph Block

```json
{
  "id": "intro",
  "type": "paragraph",
  "data": {
    "text": "This is a paragraph."
  }
}
```

### Header Block

```json
{
  "id": "h1",
  "type": "header",
  "data": {
    "text": "Section Heading",
    "level": 2
  }
}
```

### List Block

```json
{
  "id": "list1",
  "type": "list",
  "data": {
    "style": "unordered",
    "items": [
      "First item",
      "Second item",
      "Third item"
    ]
  }
}
```

### Quote Block

```json
{
  "id": "quote1",
  "type": "quote",
  "data": {
    "text": "This is a quote.",
    "caption": "Optional caption"
  }
}
```

### Image Block

Use this only when the post should include an image inside the body.

```json
{
  "id": "image1",
  "type": "image",
  "data": {
    "file": {
      "url": "/assets/images/blog/category/example-image.webp"
    },
    "caption": "Optional image caption.",
    "withBorder": false,
    "withBackground": false,
    "stretched": false
  }
}
```

---

## 11. JSON Validation Checklist

Before delivering a JSON export:

- Confirm the file parses as valid JSON.
- Confirm `totalPosts` matches the number of posts.
- Confirm `source` is `"colinmichaels-cms"`.
- Confirm `collection` is `"posts"`.
- Confirm each post has:
  - `id`
  - `slug`
  - `title`
  - `excerpt`
  - `coverImage`
  - `author`
  - `categories`
  - `tags`
  - `status`
  - `seo`
  - `contentFormat`
  - `blocks`
  - `createdAt`
  - `updatedAt`
  - `publishedAt`
- Confirm `blocks` is an array.
- Confirm all block IDs are unique.
- Confirm there are no trailing commas.
- Confirm there are no unescaped newline characters inside string values.
- Confirm quotes are escaped correctly.
- Confirm image paths use `/assets/images/blog/...`.
- Confirm the file extension is `.json`.

---

## 12. Image Requirements

Every post should have a main image.

### Main Thumbnail

Recommended:

```text
1200 × 1200
1:1 square
.webp
```

Also acceptable:

```text
1024 × 1024
1:1 square
.webp
```

Use square images for:

- Blog thumbnails
- CMS cards
- Weekly recovery updates
- Infographics
- Social posts with unpredictable crop behavior

### Open Graph Image

Recommended:

```text
1200 × 630
.jpg or .webp
```

Use for:

- Facebook sharing
- LinkedIn sharing
- Open Graph previews
- Wide social cards

### 16:9 Hero Image

Recommended:

```text
1920 × 1080
16:9
.webp
```

Also acceptable:

```text
1792 × 1024
wide cinematic
.webp
```

Use for:

- Cinematic blog headers
- YouTube-style visuals
- Visual essays
- Posts with multiple visual elements

### Safe Zone

Keep important subjects and text near the center.

Avoid placing faces, titles, or key objects near the edges because cards and previews may crop.

---

## 13. Visual Style

Images should match the existing ColinMichaels.com blog style.

### Overall Look

- Cinematic editorial blog art.
- Semi-realistic stylized avatar.
- Warm lighting.
- Personal and reflective.
- Modern but not sterile.
- Slightly playful when the topic allows it.
- Not generic stock photography.
- Not overly cartoonish unless requested.

### Colin Avatar / Likeness

When Colin appears:

- Middle-aged male.
- Closely shaved or bald head.
- Facial hair consistent with provided references.
- Approachable but realistic.
- Thoughtful or resilient expression.
- Not a young generic person.
- Not a random hospital patient.
- Match reference photos when provided.

### Gretchen

When Gretchen appears:

- Tortoiseshell cat.
- Therapy-cat energy.
- Slightly humorous or affectionate presence.
- Can be represented as “Chief Recovery Supervisor” when playful.

### Recovery Visual Motifs

Use:

- Walking paths.
- Cardiac rehab equipment.
- Subtle heart monitor lines.
- Medical notes.
- Home recovery environment.
- Warm sunrise/sunset light.
- Progress markers.
- Gentle humor.
- Gretchen.
- Drones or RC toys when relevant.

Avoid:

- Excessively dark hospital imagery.
- Overly angelic effects.
- Random medical symbols.
- Blood, gore, or surgical imagery.
- Depressing mood unless specifically requested.

### Personal Growth Visual Motifs

Use:

- Roads.
- Mirrors.
- Branching paths.
- Trailheads.
- Overlooks.
- Shadow/reflection versions of Colin.
- Drone cases.
- Camera bags.
- Light breaking through clouds.

### Project / Technology Visual Motifs

Use:

- Clean developer desk.
- Mac-style UI.
- Code editor windows.
- App mockups.
- Automation pipelines.
- AI agent diagrams.
- Modern blue/purple tech lighting.
- Clean glassy UI panels.

### Drone / Photography Visual Motifs

Use:

- FPV drones.
- Open sky.
- Florida parks.
- Jupiter scenery.
- Camera gear.
- Sunrise or sunset.
- Movement and freedom.

---

## 14. Image Text Rules

Use text sparingly.

Good image text format:

```text
MAIN TITLE
Short subtitle
```

Example:

```text
RECOVERY UPDATE
Back to Normal(ish)
```

Rules:

- Keep text large and readable.
- Avoid tiny paragraphs.
- Use high contrast.
- Do not rely on detailed text inside generated images.
- If image-generation text quality is poor, create the image without text and add text later in design software.

---

## 15. Main Post Image Prompt Template

Use this prompt as the base for a post thumbnail or hero image.

```text
Create a cinematic editorial blog post image for colinmichaels.com.

Topic: [POST TOPIC]

Style:
- Matches the existing ColinMichaels.com blog visuals
- Semi-realistic stylized avatar look
- Warm cinematic lighting
- Personal, reflective, modern blog aesthetic
- Clean composition with strong central subject
- Slightly playful but grounded
- Not overly cartoonish
- Not generic stock photography

Main subject:
- Colin Michaels represented as a middle-aged male avatar based on provided reference images
- Closely shaved or bald head
- Facial hair consistent with reference photos
- Thoughtful, resilient expression
- Natural posture
- Accurate likeness when reference images are available

Scene:
[DESCRIBE SCENE]

Mood:
[DESCRIBE EMOTION]

Composition:
- Keep key subject centered within safe crop area
- Leave space for optional title text
- Avoid clutter
- High readability as a thumbnail

Text:
[INCLUDE TITLE/SUBTITLE OR SAY "No text"]

Aspect ratio:
[Square 1:1, 1200x1200] or [Wide 16:9, 1920x1080]

Avoid:
- Extra fingers or distorted hands
- Random medical symbols
- Unreadable text
- Generic faces
- Overly young version of Colin
- Excessive angelic/glowing effects unless requested
```

---

## 16. Weekly Recovery Infographic Prompt Template

Use this when making the weekly recovery update graphic.

```text
Create a square infographic-style weekly recovery update image for colinmichaels.com.

Style:
- Matches previous weekly recovery update graphics
- Friendly, modern, clean layout
- Semi-realistic avatar of Colin based on reference images
- Warm and encouraging but not cheesy
- Organized sections with readable labels
- Blog/social share ready

Format:
- Square 1:1 image
- 1200x1200 preferred
- Clear title at top
- Several clean update cards or panels
- Strong central Colin avatar
- Optional small icons for rehab, walking, work, weight, pain, sleep, pets, drones, RC toys, or hobbies

Content to include:
- Title: [TITLE]
- Main update points:
  1. [UPDATE POINT]
  2. [UPDATE POINT]
  3. [UPDATE POINT]
  4. [UPDATE POINT]
  5. [UPDATE POINT]

Visual elements:
- Colin avatar
- Cardiac rehab / walking path elements
- Gretchen the tortoiseshell therapy cat if relevant
- Drone, RC crawler, camera gear, or creative tool if relevant
- Warm home/recovery atmosphere

Avoid:
- Too much text
- Tiny unreadable labels
- Overly clinical medical design
- Sad hospital-heavy mood unless the post requires it
```

---

## 17. File Naming Conventions

### JSON Import File

Use:

```text
[slug]-import.json
```

Example:

```text
recovery-update-10-back-to-normalish-import.json
```

### Thumbnail Image

Use:

```text
/assets/images/blog/[category]/[slug].webp
```

Example:

```text
/assets/images/blog/recovery/recovery-update-10-back-to-normalish.webp
```

### Open Graph Image

Use:

```text
/assets/images/blog/[category]/[slug]-og.jpg
```

Example:

```text
/assets/images/blog/recovery/recovery-update-10-back-to-normalish-og.jpg
```

### In-Post Images

Use:

```text
/assets/images/blog/[category]/[slug]-inline-01.webp
```

Example:

```text
/assets/images/blog/recovery/recovery-update-10-back-to-normalish-inline-01.webp
```

---

## 18. Blog Creation Workflow

Follow this process.

### Step 1: Understand the Input

Input may be:

- Rough notes.
- Voice dictation.
- A weekly update.
- A project link.
- A YouTube link.
- A photo.
- A screenshot.
- A previous post.
- A JSON import example.

Extract:

- Main topic.
- Emotional angle.
- Practical takeaway.
- Important facts.
- Desired visuals.
- Required format.

### Step 2: Choose the Post Type

Pick the closest type:

- Weekly recovery update.
- Personal essay.
- Medical lesson.
- Project showcase.
- Technical guide.
- Creative experiment.
- Opinion/reflection.
- Video companion post.

### Step 3: Draft the Blog Post

Create:

- Title.
- Excerpt.
- Clear sections.
- Short paragraphs.
- Practical takeaway.
- Strong closing.

### Step 4: Create Metadata

Create:

- Slug.
- Categories.
- Tags.
- SEO title.
- SEO description.
- Cover image path.
- Open Graph image path.

### Step 5: Create Image Direction

Create:

- Square thumbnail prompt.
- Optional 16:9 hero prompt.
- Optional infographic prompt.
- Optional in-post collage prompt.

### Step 6: Build JSON

Create the import file using the confirmed CMS format.

### Step 7: Validate

Parse the JSON before delivery.

### Step 8: Deliver

Provide:

- Brief summary.
- Download link to JSON file.
- Download link to Markdown file if applicable.
- Image prompt or generated image.
- Notes on assumptions.

---

## 19. Questions to Ask Only When Needed

Ask only when the missing information materially affects the result.

Useful questions:

1. Is this a polished article, weekly update, or journal-style post?
2. Should the status be `draft` or `published`?
3. Do you want square thumbnail, 16:9 hero, Open Graph image, or all three?
4. Should the image include Colin, Gretchen, drones, RC toys, medical elements, or project visuals?
5. Should the tone be funny, serious, reflective, practical, or technical?
6. Do you have a current working JSON export that must be matched exactly?
7. Should the post include source links or medical references?
8. Should the post include a Facebook/social sharing blurb?

Do not ask unnecessary questions if there is enough information to make a strong first version.

---

## 20. Final Quality Checklist

Before final delivery, confirm:

- The post sounds like Colin.
- The writing is specific, not generic.
- The story has a clear point.
- The post is useful to readers.
- Medical statements are cautious.
- The categories and tags are appropriate.
- The image direction matches the existing site vibe.
- The image dimensions are specified.
- The JSON matches the confirmed CMS format.
- The JSON parses successfully.
- The file is named clearly.
- The result is ready to add to the repo.

---

## 21. Best Default Settings

When in doubt, use these defaults:

```json
{
  "author": {
    "name": "Colin Michaels",
    "title": "Applications Developer"
  },
  "status": "draft",
  "contentFormat": "editorjs",
  "publishedAt": null
}
```

Default recovery categories:

```json
[
  "Health & Recovery",
  "Personal Stories",
  "Cardiac Recovery"
]
```

Default thumbnail size:

```text
1200x1200 square .webp
```

Default Open Graph size:

```text
1200x630 .jpg
```

Default tone:

```text
Honest, reflective, practical, lightly funny, and forward-looking.
```
