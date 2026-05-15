# Changelog

## 2026-05-14

- Rebuilt the full-screen background lab as a dedicated `/background` labs page with route-entry scroll reset, scroll-reactive sections, and a Rick Roll video trigger at the bottom of the page.
- Refactored the public homepage into a focused hub for work, blog posts, labs, and the single OS launch entry.
- Added a public `/labs` route and labs index component while preserving the existing `/background` experiment route.
- Embedded the former homepage project demos inside `/labs` with their original project/window wrappers instead of presenting them as standalone apps.
- Changed `/labs` component demos to mount only when selected, preventing all demo services and side effects from starting on initial page load.
- Removed the duplicate OS launch link from footer social links and covered the homepage, labs, route map, social links, and typewriter behavior with focused specs.
- Updated architecture and README documentation for the public/blog/labs/admin/core-os route boundaries.
