# Shared

Reusable application primitives belong here.

Use this boundary for shared UI, directives, pipes, Firebase facades, design tokens, and utilities that are not specific to the public site, OS framework, labs, or admin tools.

Current shared primitives:

- `site-header`: compact public blog header with a homepage brand link, live-results search launcher, post-list shortcut, and a responsive account/site menu containing theme, OS, and role-aware account controls. Labs implementation remains preserved, while `/labs` redirects to `/blog` during the section redesign.
- `pwa`: install, connection, version, native-control, and storage lifecycle services plus public install/native-controls and offline/update status surfaces. Cache policy remains owned by the root `ngsw-config.json` file.
- `theme`: `SiteThemeService`, which applies the document-level `light`/`dark` class and stores the preference in `localStorage`.
- `not-found`: shared 404 route component.
