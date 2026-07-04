# Codex Agent Specification
# Signature Knowledge Map & Topic Hub Redesign for ColinMichaels.com

> Project Goal: Transform the existing Topic Guides section from a standard card grid into a memorable, interactive knowledge map that becomes a signature feature of the website.

## Project Scope

### Phase 1
- Replace the homepage `#topic-guides` section.
- Build a reusable Angular standalone component.
- Use TailwindCSS.
- Use CSS + SVG for visuals.
- Static routes.
- Existing Angular animations may be used where appropriate.
- No raster artwork in the first pass.
- Leave placeholders and documentation for future illustrations.

### Phase 2
- Apply the same visual language to:
  - `/topics/ai-setup`
  - `/topics/recovery-medical-planning`
  - `/topics/angular-firebase-architecture`
  - `/topics/labs-project-demos`

---

# Design Philosophy

This should not feel like a blog.

It should feel like entering my personal engineering lab.

Visitors should immediately understand:

- what I'm building
- what I'm learning
- where they should begin

The experience should resemble:

- engineering blueprints
- GitHub network graphs
- Figma connection maps
- Linear
- Raycast
- Apple's subtle motion language

Avoid cyberpunk excess.

Aim for clean, premium, technical.

---

# Homepage Layout

Desktop concept:

- Section header uses a normal homepage heading scale: `Topics`.
- No subtitle is required on the homepage section.
- Topic nodes float in a loose 2.5D depth field instead of orbiting a center `Start Here` hub.
- Dashed arcs, ghost nodes, opacity, scale, and soft shadows imply expandable depth.

Hovering a node should:

- brighten node
- animate SVG orbit context
- dim other nodes
- keep metadata readable

Mobile should gracefully collapse into staggered themed floating cards.

---

# Component

TopicKnowledgeMapComponent

Suggested location:

src/app/features/topics/components/topic-knowledge-map/

Use standalone Angular patterns where possible.

Implementation notes:

- First pass uses a CSS/SVG 2.5D floating field for the current four topic hubs.
- Topic data should remain theme-driven so future map modes can reuse labels, accent colors, icons, counts, placement, and routes.
- Placement data should include x/y position, depth, scale, and float delay.

---

# Styling

Background:
- blueprint grid
- subtle noise
- soft vignette
- optional animated scanline

Accent colors:

AI
- electric cyan

Recovery
- emerald / teal

Architecture
- blue

Labs
- purple

Keep colors restrained.

---

# SVG Layer

Use SVG instead of canvas.

Include:

- animated connection lines
- glowing nodes
- small moving pulse indicators
- hover path animation

Animations should use CSS where possible.

---

# Topic Nodes

Each node displays:

- Label
- Title
- Description
- Post count
- Explore CTA

Data should be reusable.

Avoid hardcoded values where CMS data already exists.

---

# Topic Pages

Each topic receives a themed hero.

Sections:

1 Hero

2 Introduction

3 Start Here

4 Featured Project

5 Latest Articles

6 Learning Path

7 Related Topics

---

# Future Image Placeholders

Reserve a 16:9 hero area.

Recommended size:

1920x1080

Safe area:

1600x900

Document placeholder comment in template:

<!-- Future Hero Illustration -->

Art direction:

AI
- workflow map
- terminals
- prompt nodes
- automation arrows

Recovery
- sunrise trail
- heartbeat
- contour map

Architecture
- blueprint
- Angular
- Firebase nodes

Labs
- workbench
- browser windows
- prototype markers

---

# Motion

Use subtle motion.

Examples:

- SVG line draw
- Node pulse
- Glow transition
- Mouse parallax
- Floating particles (optional)

Respect prefers-reduced-motion.

---

# Accessibility

Keyboard navigation.

Visible focus.

High contrast.

Semantic headings.

ARIA labels.

---

# Performance

Prefer:

- CSS
- SVG
- Angular animations

Avoid heavy animation libraries.

Lazy load decorative assets.

---

# Future Expansion: Orbital Topic Map

If the site grows beyond the current four topic hubs, the static cross layout may become cluttered.

Future exploration:

- Optional 3D-style orbital mode with topics rotating around the center.
- Use topic data to place nodes on x, y, and z axes, with depth, scale, and opacity communicating which topics are behind the center.
- Explore mouse-tracked parallax using the existing placement/depth metadata before introducing a 3D engine.
- Keep visible links and readable labels available without motion.
- Respect prefers-reduced-motion with a static map/list fallback.
- Keep route links and post counts code-native.

Recommended guardrails:

- Do not add true 3D, canvas, or WebGL until the topic count requires it.
- Prototype the orbit as an optional enhancement separate from the current CSS/SVG component.
- Keep mobile on a stacked rail/list layout unless a 3D interaction proves clearly usable on touch screens.

---

# Acceptance Criteria

✓ Homepage becomes a signature experience.

✓ No generic card grid remains.

✓ Interactive node map on desktop.

✓ Responsive mobile layout.

✓ Reusable architecture.

✓ Topic pages share the same design language.

✓ CSS/SVG only for first implementation.

✓ Future hero artwork placeholders documented.

---

# Inspiration

Think less "blog."

Think more "interactive knowledge operating system."

This should become one of the defining visual experiences of ColinMichaels.com.
