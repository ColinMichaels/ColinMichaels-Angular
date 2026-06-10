# Changelog

## 2026-06-10

- Added the protected `/admin/cms/media-library` Media Library Organizer UI with sidebar navigation, toolbar search/sort/filter controls, responsive media grid/list/compact views, inspector, preview, batch rename, resize request, tag editing, selection, and status states.
- Added a media-library service boundary over existing Firebase upload, storage, Firestore, and callable Functions services so the organizer does not introduce a new backend or upload pipeline.
- Included CMS blog attachments in the media library by deriving cover, Open Graph, and inline image block URLs into globally manageable media records.
- Documented the media library architecture, component inventory, and migration notes.

## 2026-06-08

- Added Firebase custom-claim admin authorization across admin routes, callable CMS AI functions, Realtime Database rules, Firestore rules, and Storage rules.
- Added a trusted Admin SDK script for granting or revoking the initial `admin` custom claim.
- Added Google login support on the OS login screen with popup sign-in, redirect fallback, safe redirect handling, and reusable route role requirements for future admin sections.
- Expanded the trusted Admin SDK claim script to grant or revoke named roles without removing existing custom claims.
- Added CMS post delete handling with local-draft deletion and safe archiving for seeded posts.

## 2026-06-07

- Added a CMS writing assistant panel for blog post creation and editing with generated title, description, SEO, category, tag, and thumbnail prompt suggestions.
- Added Firebase callable functions for server-side CMS AI metadata and thumbnail generation with OpenAI keys bound through Firebase Functions secrets.
- Added Firebase Storage rules and generated-thumbnail storage under `cms/blog-thumbnails/{slug}/`, with stored URLs applied to post cover and Open Graph fields.
- Added a CMS-only assistant service/model boundary so server-backed AI metadata and thumbnail generation can fall back to the local suggestion provider without changing public blog rendering.
- Added local browser storage for CMS-created and edited blog posts, layered over the existing seeded blog data.
- Added `/admin/cms/new` and CMS entry points for creating a new post with metadata, SEO fields, status, tags, categories, cover image, and Editor.js content.
- Added Editor.js-to-blog block conversion so saved CMS content feeds the public blog renderer when posts are published.

## 2026-05-14

- Added a selectable sound driver model with the existing Web Audio synth driver, an experimental Tone.js sampled preset driver, and a SoundFont General MIDI sampled driver for comparing more realistic instrument playback paths.
- Expanded the patch builder preset library with categorized instrument variants across keys, guitars, organs, strings/pads, bass, bells/mallets, and synth leads.
- Added reusable synth factory presets for Piano, Guitar, Organ, Strings, Bass, Bell, Lead, and Warm Pad, with patch editor loading and piano tester playback support.
- Added a patch keyboard tester toggle to the patch builder and refreshed the piano component with patch-aware playback, octave/range controls, and responsive horizontal scrolling.
- Upgraded the patch builder lab with a richer dark studio UI, reliable save/load/duplicate/delete controls, generated patches, chord/sequence preview modes, oscillator pan/octave controls, and optional filter/LFO/delay/master synth settings.
- Rebuilt the full-screen background lab as a dedicated `/background` labs page with route-entry scroll reset, scroll-reactive sections, and a Rick Roll video trigger at the bottom of the page.
- Refactored the public homepage into a focused hub for work, blog posts, labs, and the single OS launch entry.
- Added a public `/labs` route and labs index component while preserving the existing `/background` experiment route.
- Embedded the former homepage project demos inside `/labs` with their original project/window wrappers instead of presenting them as standalone apps.
- Changed `/labs` component demos to mount only when selected, preventing all demo services and side effects from starting on initial page load.
- Removed the duplicate OS launch link from footer social links and covered the homepage, labs, route map, social links, and typewriter behavior with focused specs.
- Updated architecture and README documentation for the public/blog/labs/admin/core-os route boundaries.
