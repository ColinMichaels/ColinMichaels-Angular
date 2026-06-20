# Changelog

## 2026-06-20

- Added custom CMS Editor.js blocks for blog stats, simple bar/line charts, and sanitized HTML sections, with typed post storage, assistant text extraction, reading stats, and public blog rendering.

## 2026-06-17

- Replaced the homepage About placeholder with a full Colin Michaels bio section, profile image, recovery disclaimer, and reusable author profile data.
- Added a linked blog-post author byline and author bio card that points readers back to the homepage bio section.
- Added the Editor.js YouTube embed tool to the CMS and normalized saved YouTube blocks into the existing public blog embed renderer.

## 2026-06-16

- Added a signed-in profile route at `/profile` with current Firebase Auth account details, provider IDs, and role claims.
- Replaced the top-right Sign Out text control with a user avatar/icon link to the profile page.
- Added shared user role definitions and opened the admin overview to limited roles while keeping CMS, media, and user-management routes role-scoped.
- Added a route-backed `/logout` flow and visible Sign Out controls for authenticated site/admin users.

## 2026-06-15

- Added an admin-only `/admin/users` user management console backed by Firebase callable functions for listing Auth users and updating role custom claims.
- Tightened route authorization so `admin` remains the super-admin override while `cmsAdmin` only authorizes routes that explicitly allow it.
- Added temporary public draft preview links for CMS blog posts at `/blog/preview/{token}`, backed by Firestore `postPreviews` snapshots with expiry checks.
- Added CMS editor controls to create, refresh, copy, open, and revoke draft preview links, plus post-list access for active previews.
- Updated Firestore rules so published posts remain publicly listable while preview documents are only publicly readable by direct active token.

## 2026-06-12

- Added RSS and JSON Feed endpoints for published blog posts, with Firebase Hosting rewrites at `/feed.xml` and `/feed.json`.
- Added feed discovery links to client-side and server-rendered SEO metadata, plus visible feed links on the blog index.
- Added route-backed public blog tag archive pages at `/blog/tag/:tag`, linked tag badges, tag SEO metadata, and tag sitemap entries.
- Added a public blog search page at `/blog/search` for title, excerpt, taxonomy, and body text discovery, marked `noindex,follow`.
- Added blog post reading UX with reading time, word count, meaningful updated dates, generated table of contents, heading anchors, and article progress.
- Added a CMS SEO/share checklist with title, description, canonical, taxonomy, image, alt text, heading, search-preview, and social-preview checks.

## 2026-06-11

- Added static homepage canonical, Open Graph, Twitter Card, and JSON-LD metadata to the initial Angular document.
- Added a 1200x630 homepage social preview image at `/assets/social/colin-michaels-og.jpg`.
- Migrated Angular routing from hash URLs to clean path URLs and updated share/canonical URL generation.
- Added shared route SEO metadata objects for home, blog, project/lab, background lab, and protected media library routes.
- Added a Firebase `renderSeoHtml` Function and Hosting rewrite so clean route requests receive metadata-injected HTML before Angular loads.
- Added server-rendered BlogPosting JSON-LD for published blog posts and homepage Person/WebSite JSON-LD.
- Added a custom Editor.js typography block for lead paragraphs, pull quotes, callouts, asides, captions, and eyebrow text, with CMS persistence and public blog rendering.
- Added auto-generated CMS post canonical URLs based on `/blog/{slug}` while preserving manual canonical overrides.

## 2026-06-10

- Added a homepage latest YouTube videos section backed by a Firebase callable Function that keeps the YouTube Data API key in Secret Manager and reads the target channel from `YOUTUBE_CHANNEL_ID`.
- Added a browser-testable `getLatestYouTubeVideosHttp` Firebase Function wrapper for local YouTube feed debugging while keeping the Angular app on the callable SDK endpoint.
- Added a shared global site header/menu for public, blog, labs, admin, and CMS routes while preserving OS desktop/login routes without the site shell.
- Added persistent light/dark theme selection through the global header, backed by `localStorage` and scoped theme tokens for site/admin/lab pages.
- Updated the global header to hide admin/CMS/media links unless the signed-in user has admin claims, use icon-only theme controls, and switch homepage hero imagery between day/night theme assets.
- Completed a safe cleanup pass that removed global Prism scripts from the initial Angular bundle, tightened public component typings, removed debug logs, improved subscription teardown, and reduced lint debt in public/chat/game utility code.
- Added the protected `/admin/cms/media-library` Media Library Organizer UI with sidebar navigation, toolbar search/sort/filter controls, responsive media grid/list/compact views, inspector, preview, batch rename, resize request, tag editing, selection, and status states.
- Added a media-library service boundary over existing Firebase upload, storage, Firestore, and callable Functions services so the organizer does not introduce a new backend or upload pipeline.
- Included CMS blog attachments in the media library by deriving cover, Open Graph, and inline image block URLs into globally manageable media records.
- Added explicit CMS control over blog post posted dates so `publishedAt` drives public ordering and article published metadata.
- Added thumbnails, search, sorting, and pagination to the admin CMS post listing.
- Added an Editor.js image insert panel for choosing images from the media library or uploading new embedded images, with fit-to-text-area and contained aspect-ratio layout options.
- Added public blog category filtering and sanitized HTML rendering for blog titles, excerpts, and content blocks.
- Added route-backed public blog category pages at `/blog/category/:category` for shareable sub-blog listings.
- Added homepage blog read-more calls to action and reusable blog share controls for homepage cards and article pages.
- Added Facebook blog sharing, Firestore-backed CMS post persistence, and CMS JSON export/Firestore backup controls.
- Added CMS post JSON import on new/edit post screens for restoring exported posts or raw Editor.js documents.
- Added fuller Editor.js image block preservation and blog OpenGraph/Twitter/canonical metadata for shared post links.
- Separated CMS post cover images from optional custom Open Graph/social share images while keeping cover-image fallback for posts without a custom social image.
- Switched blog post listing, editing, publishing, and media attachment derivation to Firestore-only post data with no browser localStorage fallback.
- Added CMS post-list bulk JSON import for restoring exported blog posts directly into Firestore `/posts`.
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
