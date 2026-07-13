# Changelog

- Added a dedicated CMS App Embed block for the Hear the Hook soundboard, with exact-page trust and canonicalization of its existing root link, sandboxed inline rendering, bounded cross-origin resize messages, CSP coverage, and an always-visible external link fallback while keeping iframes and scripts prohibited in custom HTML blocks.
- Documented the July 13, 2026 pause point for external social auto-posting, including the completed Calendar/outbox foundation, the still-unimplemented provider connection layer, and the guarded checklist for resuming without duplicating Web Push or draining historical queued work.
- Completed the Calendar publishing-flow slice with launch-following or fixed social timing, safe reschedule conflict handling, Instagram media planning, Editor deep links, automation-readiness guidance, and deterministic outbox reconciliation that prevents stale imports from resetting delivery work.
- Clarified that Web Push already fires once at article publication, external providers are not connected yet, LinkedIn is the recommended first OAuth-backed adapter, Instagram requires professional-account media publishing, and YouTube Community posting remains manual under the current supported API.
- Simplified Posts administration by keeping `New Post` as the sole primary action, grouping JSON import/export and Firestore refresh under a native Maintenance disclosure, and showing compact bulk status/delete controls only after row selection without changing repository behavior.
- Aligned the paused Labs route across Firebase Hosting, Angular, Functions SEO fallback behavior, sitemap output, homepage crawler links, `llms.txt` guidance, and public documentation while preserving the Labs implementation for redesign; `/labs` now has one temporary redirect contract and `/topics/labs-projects` remains discoverable.
- Removed obsolete OpenAI and weather vendor-key requirements from Angular environment examples and Firebase preview builds, documented the still-open deployable proxy boundary accurately, and refreshed stale Node/Angular setup, services, security, roadmap, audit, admin-baseline, and documentation-index records.
- Redesigned public author pages as responsive editorial résumés with a portrait/contact rail, icon-led social links and publishing metrics, a color-banded biography, compact article archive, and dark-mode support without adding fictional career data.
- Added canonical multi-author profiles with Colin Michaels as the new-post and legacy-post default while preserving the homepage's fixed Colin identity.
- Added CMS author assignment and management with Media Library-backed avatar selection/upload, an Author column and author-aware post search, plus public author pages with derived publishing statistics and reusable post archives.
- Added author-aware public search, dynamic bylines, profile links, and browser/crawler SEO contracts with migration-safe embedded post snapshots, deployment order, and rollback guidance.
- Added the soft-gated Cat Corner editorial hub with a reusable Gretchen Easter egg, authenticated self-service `Cat Corner Addict` role, immediate profile badge/menu access, full-admin override, responsive light/dark presentation, and accepted desktop/mobile/unlock visual specifications.
- Added migration-safe Cat Corner post/discovery metadata and CMS controls so selected discovery posts retain normal public reach while non-discovery Cat posts remain directly readable but stay out of public listings, search, feeds, sitemap, promotion workflows, and indexing.
- Added a custom Editor.js Cat Corner unlock block, preserved unrelated Firebase claims during idempotent unlocks, and documented the feature's deliberate soft-gate security boundary, deployment order, rollback, and validation contract.
- Revised `/llms.txt` into a proposal-conformant, evergreen index with canonical Markdown links, accurate current topic routes, explicit scope boundaries, representative optional articles, and documented AI-crawler limitations.
- Added accessible, non-wrapping previous and next controls beneath the homepage hero article so readers can browse the
  canonical featured selection followed by recent posts one at a time, with endpoint arrow hiding, live position
  feedback, endpoint focus handoff, a stable 16:9 frame, and a full-width mobile card.
- Added image-backed homepage Weekly Updates cards with shorter, line-clamped titles while preserving readable media rows on mobile.
- Made the homepage hero automatically choose the newest published featured post while retaining older feature flags,
  preserved a manual selected-post override, excluded the resolved post from More writing, and aligned browser/crawler
  social selection with the same deterministic policy.
- Added an explicit Homepage Hero control for special announcements that can use the resolved hero post's optional
  full-screen background instead of the CMS slideshow, with a migration-safe off default, centered decorative
  rendering, disabled rotation, critical-image preload ownership, and slideshow/static fallback when disabled or after
  load failure.
- Added an existing-media picker directly to the Editor.js inline Image block so editors can reuse library images without creating a duplicate block or uploading the file again.
- Added optional full-screen blog post backgrounds with CMS media-library selection/upload/removal, decorative fixed public rendering, readable translucent article surfaces, offline-copy preservation, and legacy-post fallback behavior.
- Redesigned the homepage recovery area as a three-post, tech-styled Weekly Updates board plus one compact Hospital Lessons feature, with focused archive/topic routes, preserved patient-safety notes, responsive placeholders, and regression coverage.
- Added a published Gadgets & Toys topic for owned products, wish-list items, hands-on reviews, and interesting online finds, including amber workbench artwork, focused taxonomy, a distinct knowledge-map icon, crawler metadata, and migration-safe missing-default seeding.
- Rebuilt topic hubs as image-led editorial entry points that promote featured and recent writing before the preserved topic guide, with topic-specific section language and image-backed related navigation.
- Added four brand-matched, text-free topic hero images for AI setup, recovery planning, Angular/Firebase architecture, and Labs/project writing, including client and Firebase Functions social metadata.
- Added a reusable blog post listing with `list`, `grid`, `fan`, and `compact` layouts, then adopted it across topic hubs, blog/category/tag archives, homepage writing, and recovery sections.
- Added migration-safe optional topic artwork/page-copy fields, CMS controls, legacy Firestore fallbacks by stable topic ID or slug, focused regression coverage, and topic/post-listing architecture documentation.

- Fixed inline-left and inline-right article media so section headings clear the active float instead of painting over
  the lower image or caption; verified the corrected caption flow at desktop and mobile widths.

- Kept the post editor's desktop inspector rail pinned beneath the admin header with a bounded internal scroll area,
  and made browser-tab titles follow the active admin section, including new and edited posts.

- Replace mouse-to-wake behavior with a two-second auto-hiding studio interface: movement reveals controls, movement
  over media shows an `S`/`Esc` exit hint, and mouse activity never closes the screen saver.

- Expand the screen saver Ken Burns renderer with four directional pan paths, alternating zoom depth, clean animation
  restart behavior, and compositor-only motion that remains disabled for reduced-motion users.

- Lazy-load the screen saver renderer, studio controls, preferences, and local-media storage on the first `S` shortcut
  so the feature adds only a lightweight launcher to the initial app shell and remains warm for later toggles.

- Added an app-shell screen saver studio with Hero and IndexedDB-backed My Images modules, persistent Ken Burns and slideshow speed controls, local multi-image upload, smooth full-screen crossfades, delayed mouse wake, Escape/Exit controls, typing safeguards, reduced-motion handling, focus return, and scroll locking.
- Simplified the public account menu by moving favorites, read-later progress, offline downloads, notifications, native-device actions, and storage controls to the protected Profile page, and moved the persisted light/dark toggle into Reader Assistance.
- Added signed-in Web Push opt-in with validated Firebase subscription storage, publish-transition notifications, safe public deep links, stale-endpoint cleanup, and progressive application badges through a minimal Angular service-worker wrapper.
- Added a device-local IndexedDB reading library with persistent high-water article progress, automatic read completion at 95%, independent favorites and read-later lists, sticky article controls, and Profile-based reading-state management kept separate from offline downloads.
- Added Code and Markdown options to the CMS Editor.js toolbox, including typed Markdown persistence, sanitized public rendering, search/reading-stat coverage, and focused block tests.
- Added explicit offline article saving through a user-controlled Cache Storage namespace, including sticky save/update/remove controls, saved-article management on Profile, safe public-snapshot validation, same-origin image warming, and offline blog-detail fallback without persisting previews or protected Firestore data.
- Added progressive OS-native PWA controls for sharing the current page, entering fullscreen, keeping the screen awake while reading, and protecting offline origin storage, with real quota reporting, installed-app state, capability fallbacks, and Profile-based device settings.
- Restored article-body-only reading progress inside the sticky post rail, aligned the desktop contents sidebar below the site header, kept its active section highlight visible through long posts, fixed backward TOC navigation, and limited the smaller pinned section-title treatment to one active heading at a time.
- Compressed the mobile blog sticky stack into a 56px public header, single-row 52px post rail, and smaller section title, with shared safe-area-aware offsets that remove gaps and overlap between all three layers.
- Added the first mobile PWA foundation with a linked install manifest, production Angular service worker, conservative app-shell/public-image caching, install guidance, offline status, safe update reloads, iOS safe-area layout support, protected-route cache exclusions, and Firebase worker cache headers.
- Replaced the partial Angular animation-runtime route fade with compositor-driven Router View Transitions for all navigations, using a subtle CSS fade/vertical settle, graceful browser fallback, and system/Reader Tools reduced-motion suppression.
- Added native scroll-driven fade/rise reveals to lazy and deferred post media, including post lists, homepage writing cards, article body figures, sanitized custom HTML images, and suggested posts, with a longer ease-in-out reveal window, visible fallback behavior, and no per-image observer code.
- Added a compact sticky post toolbar that naturally pins the current cover thumbnail and title beneath the public header, keeps providers behind a single hover/focus/tap Share fan while reading, and smoothly jumps to the stable deferred-comments anchor.
- Added an observer-triggered scroll-to-top action to the sticky post rail and native sticky level-two article headings that temporarily remain below the reading controls until the next section takes over.

- Prioritized all CMS-managed rotating homepage hero backgrounds so whichever slide becomes the Largest Contentful Paint image is fetched early without Angular performance diagnostics.
- Replaced the deprecated `@angular/animations` route fade with Router-native view transitions scoped to page content, including reduced-motion handling, and removed the obsolete package dependency.
- Updated homepage Open Graph rendering to use the CMS-selected post, newest featured post, newest published post, or branded fallback image, with matching client/server selection and deterministic image cache versioning.
- Added signed-in tracked sharing for the homepage and blog posts using provider-specific opaque IDs, while preserving clean canonical and `og:url` values.
- Added server-only share-link and idempotent landing telemetry records, a new homepage share-points event, explicit Firestore rule denial for direct tracking access, and a strict boundary that prevents landing or crawler traffic from awarding points.
- Added a protected dry-run Bulk Post Editor at `/admin/cms/content-operations` with compact post auditing, filtering, selection, responsive candidate review, and a permanently locked apply/publish rail.
- Added read-only optimization-manifest import with stable-slug matching, unmatched-row reporting, redirect-required blocking, and candidate updates limited to SEO title, meta description, categories, and tags.
- Added opaque CMS post artifact descriptors with SHA-256 hashes, allowlisted diffs, guard projections, protected-field validation, focused regression tests, and architecture/migration documentation for the future revision and apply service.
- Added a repository-wide commit and pull request standard based on PR #194, including a reusable GitHub PR template, preview-build parameters, validation disclosure rules, deployment/rollback sections, and persistent agent instructions.
- Simplified live site search to use the header pill as its only editable field; the anchored results panel now streams from that query without rendering a duplicate search form.
- Protected `/os` and `/os/:app` with a capability-based device guard; mobile, touch-only, and undersized viewports now receive a dedicated desktop-requirements page before OS assets or authentication flows load.

## 2026-07-09

- Added a protected `/admin/cms/calendar` publishing Calendar with month navigation, scheduled/published/social filters, day agendas, post lookup, inline rescheduling, and an upcoming queue.
- Added post-linked social announcement planning for Notify, YouTube, Facebook, Instagram, and LinkedIn with provider-specific messages and delivery times, including follow-up sharing for posts that are already live.
- Extended scheduled publishing with a protected, deterministic Firestore `socialOutbox` queue so due announcements become durable backend work only after their source article is published; external provider connectors remain intentionally separate.
- Documented social connector readiness, security boundaries, migration notes, component inventory, and the next provider-integration phase.
- Added a staged admin-console reorganization plan covering shared navigation, page-flow simplification, responsive behavior, safe bloat removal, and incremental migration without changing existing URLs.
- Implemented the first admin-console reorganization slice with a role-aware five-group sidebar, 64px utility header, responsive navigation drawer, persistent New Post action, and compact environment/account footer.
- Added a persistent desktop sidebar toggle that switches between the 224px labeled navigation and a 72px icon rail with accessible hover/focus tooltips, compact footer controls, and unchanged full-label mobile navigation.
- Tightened the post editor into compact control modules with live collapsed summaries, preserved form state, validation-driven section expansion, a denser Editor.js toolbar, and a reduced mobile save bar with contextual View/Delete actions.
- Enlarged the Reader Tools status readout and stabilized the panel dimensions so longer hover/focus help messages no longer move the control surface or redirect pointer actions.
- Simplified the public site into a blog-first utility experience with a compact homepage logo, rounded live-results search launcher, post-list shortcut, and one responsive account/site menu for theme, OS, and role-aware actions; removed the duplicate Blog search action and redirected `/labs` to `/blog` while its implementation remains preserved.
- Removed the public site header and repeated page-local global navigation from protected admin surfaces while preserving all existing routes and guards.
- Replaced the Overview workflow-card catalog with a repository-backed publishing dashboard for status counts, the next scheduled post, recent drafts, recently published work, and compact management links.
- Added a protected `/admin/cms/homepage` hero manager with Firestore-backed homepage copy, featured article selection, multi-image hero slide uploads, ordering, focal points, and slideshow timing controls.
- Updated the public homepage hero to consume CMS-managed slideshow settings with static fallback behavior, automatic decorative rotation, reduced-motion/page-visibility pauses, and selected/featured/latest post fallback selection.
- Added a per-slide CMS toggle for subtle Ken Burns background motion on homepage hero slides, with reduced-motion suppression on the public page.
- Smoothed homepage hero crossfades by keeping Ken Burns transforms independent from active slide state and extending the effective fade when motion-enabled slides are present.
- Removed unused public/blog component duplicates, including the legacy blog search page, old homepage blog wrapper/tech tips section, old disclaimer/subheader components, and the obsolete `components/not-found` compatibility path.
- Removed local generated/editor cleanup artifacts such as `.DS_Store`, ignored build output, and ignored Firebase debug logs from the workspace cleanup pass.
- Tightened lazy rendering for the public shell by deferring OS notifications, reader tools, footer socials, below-the-fold homepage sections, the site search drawer, blog table of contents, blog comments, and article author widgets until their route/state/viewport trigger requires them.
- Switched signal/input-driven public, blog, search, header, and YouTube display components to `OnPush` change detection while leaving mutable legacy/demo components untouched.

## 2026-07-07

- Added a lightweight inline public-site Signal Sweep + Postcard preloader that masks first render instability until Angular, route stability, fonts, and one marked above-the-fold image are ready or capped by failsafes.
- Added a shared `SitePreloaderService` and public image preload markers for the homepage hero and blog detail cover while keeping lower-priority blog media lazy-loaded.
- Reduced production CSS output by replacing the broad generated Tailwind safelist with an opt-in debugging flag and CSS-variable-based preview styling.
- Documented the public-site preloader architecture, component inventory, migration notes, validation expectations, and route boundary.

## 2026-07-04

- Replaced the homepage topic guide card grid with a reusable CSS/SVG `TopicKnowledgeMapComponent` that uses a blueprint-style map, themed topic nodes, responsive mobile rail layout, and dynamic published-post counts.
- Refined the homepage topics section into a lighter 2.5D floating field with a smaller `Topics` heading, no explanatory subtitle, no center hub, depth-based placement metadata, and staggered mobile topic nodes.
- Restored compact topic descriptor text inside homepage topic nodes while removing the mismatched section-level "Browse all writing" link.
- Restyled topic hub pages around the same technical knowledge-map language with themed heroes, future 16:9 illustration placeholders, start-here checklists, featured project modules, latest article rows, learning paths, related topic nodes, and quick references.
- Added light-mode variants for the topic knowledge map and topic hub pages so the blueprint UI remains readable in both persisted site themes.
- Added an optional CMS blog `featured` flag so published posts can be prioritized in the homepage writing section without hardcoding a specific article.
- Tightened topic post matching so one-word hub terms match whole normalized tokens instead of substrings inside unrelated words.
- Added a protected `/admin/cms/topics` Topic Manager with Firestore-backed CRUD, default topic seeding, auth-aware topic storage, public published-topic queries, and topic search integration.
- Switched public topic routes to a managed slug route while preserving the existing topic slugs as the default bootstrap/fallback topic set.

## 2026-07-03

- Added a Firebase scheduled Function that promotes due CMS posts from `scheduled` to `published` based on their `publishedAt` timestamp.
- Required a future publish date when saving scheduled CMS posts and kept undated bulk status changes from marking posts as scheduled.
- Added homepage and labs server-rendered SEO fallback content, enriched homepage ProfilePage/WebPage JSON-LD, and shortened the homepage meta description.
- Centralized repeated site identity, title, description, image alt text, and JSON-LD values behind shared Angular and Firebase Functions SEO constants.
- Reviewed and tuned the homepage site identity copy, AI citation summary, and homepage Person/WebSite/ProfilePage schema for full personal-site positioning.
- Added `/llms.txt`, baseline Firebase Hosting security headers, and simplified sitemap XML to rely on canonical URLs plus `lastmod` instead of low-value `changefreq`/`priority` tags.
- Tightened CMS SEO checklist copy for title and description truncation warnings and added extra homepage bottom spacing for the fixed social bar.

## 2026-07-02

- Added explicit Firebase SEO route classification so unknown public paths return `404` with `noindex,follow`, missing blog posts return `404` missing-post metadata, and valid OS/admin routes remain `noindex,nofollow`.
- Pruned sitemap taxonomy output with thresholds of `2` published posts for categories/subcategories and `3` published posts for tags, while keeping low-count taxonomy pages navigable with `noindex,follow`.
- Added visible server-rendered fallback content for the blog index, article pages, and topic hubs so crawlers and no-JS readers can see links, metadata, and sanitized article body text before Angular hydrates.
- Added route-backed topic hubs for AI setup, recovery planning, Angular/Firebase architecture, and labs/projects, with homepage internal links and sitemap inclusion.
- Expanded topic hubs with fuller linkable asset sections and mirrored the asset content in Firebase SEO fallback HTML.
- Added a link-building outreach operating doc with asset URLs, prospecting criteria, tracker structure, pitch templates, and a 48-candidate seed prospect list.
- Strengthened author/trust signals and reframed health/recovery sections as patient-perspective resources instead of medical advice.
- Added SEO policy regression specs for route order, taxonomy robots thresholds, and missing-post noindex metadata.
- Documented the 90-day SEO implementation schedule and SEO rendering/sitemap policy.

## 2026-06-28

- Consolidated production Firebase deploys into a single push/manual workflow with shared deploy-scope and Firebase CLI helper scripts, replacing separate production merge, manual, and Functions-only workflows.
- Updated production deploy scope so any Functions deploy also deploys the matching Hosting assets, keeping `renderSeoHtml` deep-link shells aligned with Angular's hashed bundles.
- Fixed target-specific Firebase deploy configs so rules, Hosting, and Functions paths resolve from the repository workspace instead of the GitHub runner temp directory.
- Documented the Firebase Storage Admin IAM role required for GitHub Actions storage-rules deploys.
- Documented the Firebase Rules Admin IAM role required for GitHub Actions Firestore and Storage rules deploys.

## 2026-06-27

- Hardened Firebase GitHub Actions deploy authentication by writing the validated service account JSON secret to an explicit temporary Application Default Credentials file before Firebase CLI deploy steps.
- Added gcloud-backed Firebase deploy steps that activate and verify the service account before running `firebase-tools@14` with Application Default Credentials, while clearing legacy `FIREBASE_TOKEN` auth.
- Pinned Firebase deploy jobs to Node `22.22.3` before invoking `npx firebase-tools@14`, matching the build jobs and repository engine requirement.
- Installed production Functions dependencies in Functions deploy jobs, isolated rules-only deploys from Functions config parsing, and upgraded the Firebase Functions runtime metadata to Node 22.

## 2026-06-20

- Added custom CMS Editor.js blocks for blog stats, simple bar/line charts, and sanitized HTML sections, with typed post storage, assistant text extraction, reading stats, and public blog rendering.
- Added CSV/JSON file import, downloadable import examples, required-field help, and pasted comma-separated row import to CMS stats and chart blocks, including looser JSON normalization for full post imports.
- Split Firebase GitHub Actions into explicit detect, validate, build, and deploy jobs, with Functions rebuild/deploy skipped unless Functions or SEO-template inputs changed.

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
