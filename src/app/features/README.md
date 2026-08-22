# Features

Stable product and public website features belong here.

Feature folders should own their route groups, page components, feature-specific UI, and data services. Shared primitives should move to `shared` instead of being duplicated across features.

Current feature boundaries:

- `public`: homepage, privacy/editorial standards, public resources, and the shared public route assembly.
- `blog`: archive, category/tag/detail routes, trusted full-post and evidence-only publishing services, Editor.js block rendering, reading progress/library/offline state, reactions, polls, comments, related reading, and post presentation.
- `search`: public site search page and result presentation; the shared header owns the live search launcher.
- `topics`: canonical topic hubs, guide content, cinematic image-led heroes, and topic-aware post presentation.
- `authors`: public author routes and reusable byline/profile presentation.
- `youtube`: verified channel-aware feed and exact companion-video presentation.
- `submissions`: public contact and prospective-author questionnaires backed by a trusted, rate-limited callable. Applications remain private review records and never grant author, post, role, or CMS access automatically.
- `cat-corner`: role-aware editorial hub, unlock success flow, Firebase claim client, route access guard, and reusable accessible Gretchen Easter egg. It reuses Blog repository/rendering contracts while keeping Cat-specific UI and membership behavior feature-scoped.
- `screen-saver`: first-use lazy-loaded app-shell media viewer with Hero and device-local image modules, persistent Ken Burns and slideshow tuning, a bottom studio toolbar, keyboard/mouse wake controls, accessibility motion safeguards, focus return, and page scroll locking.

Reusable cross-route presentation:

- `blog/components/post-listing`: repository-free post presentation with shared `list`, `grid`, `fan`, and `compact`
  variants, owned loading/error/empty states, configurable heading semantics, optional per-post topic appearance,
  and a bounded interaction-triggered preview of deduplicated in-body post images.
- `topics/topic-hub`: image-led topic landing composition that prioritizes featured/recent posts, owns the reusable
  topic hero, and delegates the preserved checklist, learning path, resources, disclaimer, and distinct featured
  project to `TopicGuideComponent`.
