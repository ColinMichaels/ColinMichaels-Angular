# Features

Stable product and public website features belong here.

Feature folders should own their route groups, page components, feature-specific UI, and data services. Shared primitives should move to `shared` instead of being duplicated across features.

Current cross-route feature components:

- `cat-corner`: role-aware editorial hub, unlock success flow, Firebase claim client, route access guard, and reusable accessible Gretchen Easter egg. It reuses Blog repository/rendering contracts while keeping Cat-specific UI and membership behavior feature-scoped.
- `screen-saver`: first-use lazy-loaded app-shell media viewer with Hero and device-local image modules, persistent Ken
  Burns and slideshow tuning, a bottom studio toolbar, keyboard/mouse wake controls, accessibility motion safeguards,
  focus return, and page scroll locking.
- `blog/components/post-listing`: repository-free post presentation with shared `list`, `grid`, `fan`, and `compact`
  variants, owned loading/error/empty states, configurable heading semantics, and optional per-post topic appearance.
- `topics/topic-hub`: image-led topic landing composition that prioritizes featured/recent posts and delegates the
  preserved checklist, learning path, resources, disclaimer, and distinct featured project to `TopicGuideComponent`.
