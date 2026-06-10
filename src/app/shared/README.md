# Shared

Reusable application primitives belong here.

Use this boundary for shared UI, directives, pipes, Firebase facades, design tokens, and utilities that are not specific to the public site, OS framework, labs, or admin tools.

Current shared primitives:

- `site-header`: global site/admin/labs navigation with the persisted theme toggle.
- `theme`: `SiteThemeService`, which applies the document-level `light`/`dark` class and stores the preference in `localStorage`.
- `not-found`: shared 404 route component.
