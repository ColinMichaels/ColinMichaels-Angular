# Changelog

- Made the live header search dismiss when a visitor clicks anywhere outside its input and results surface, clearing input focus for pointer dismissal while preserving inside interaction and the existing focus-restoring close-button and Escape behavior.
- Added an Admin-only **Preview reader experience** to Daily Discovery drafts so CMS operators can test future advanced questions locally with direct question navigation, hints, incorrect/correct feedback, explanations, source links, completion, and restart without replacing the live set or writing guest progress, account streaks, or points.
- Simplified the homepage Daily Discovery rail by removing its duplicate search buttons, separating the question from a clear question-type-aware **Answer** or **Solve** control, and briefly highlighting the existing header search when the answer panel opens without moving keyboard focus away from the answer.
- Added a version-controlled, read-only Firebase Storage browser CORS policy for published media, with validation tests, isolated production deployment detection, an explicit manual workflow gate, post-apply inspection, and documented verification/rollback steps so PWA image fetches no longer depend on untracked bucket configuration.
- Added admin-only reader point management to `/admin/users` as a separate alternate view that preserves the original paginated user-management table as the default, with a complete multi-page points leaderboard ranked by current total, bidirectional sorting for user and every earned/manual point source, visible balances and category breakdowns, Add/Remove/Set total controls, bounded whole-number validation, negative-balance protection, required audit reasons, atomic callable-backed updates, signed `admin_adjustment` activity records, Profile visibility, Firestore zero-state rules, canonical Profile-point hydration when an older callable omits projections during staggered deployments, focused tests, and separate role-filtered Admin Guide entries.
- Added a guarded manual importer, CMS-role-gated backend, and responsive `/admin/cms/daily-discovery` visual editor for dated Mac mini/Codex Daily Discovery JSON with file/drop/paste intake, existing imported-set editing, normalized downloads, structured question/choice/source controls, server dry-run validation, published-post canonicalization, explicit draft/live approvals, private create/revision-protected replacement operations, current-day question-id safeguards, idempotent retry receipts, audit records, backend-only Rules, loopback emulator testing, multiple-choice hints, and multi-article solution links while retaining the provider-free title-gap fallback.
- Removed the redundant Today at ColinMichaels.com and date block from the Daily Discovery rail so the prompt receives the full leading width and compact layouts use less vertical space.
- Added a fully isolated Auth emulator and repeatable local reader fixture so signed-in Daily Discovery points and streaks can be tested without production credentials or data.
- Expanded Daily Discovery to ten daily interactions generated on demand from searchable published-post titles without an AI provider, added private transactional question-set storage, sequential guest and account progress, per-question five-point awards up to 50 points daily, a next-question flow, responsive progress feedback, backend-only Rules coverage, and migration/deployment documentation.
- Fixed homepage featured-post artwork framing so embedded labels remain visible in compact desktop crops while tablet and mobile layouts preserve the full 16:9 image.
- Added a guest-accessible Daily Discovery rail to the homepage hero with seven Eastern-time rotating questions, reuse of the single header search, inline answer checking, device-local guest completion, signed-in five-point awards and streaks, Profile summaries, server-private accepted answers, idempotent reward events, responsive states, and deployment/rollback documentation.
- Added an explicit manual-production `force_functions` confirmation that permits Firebase `--force` only for reviewed Functions policy changes while keeping automatic push, Hosting, and Rules deployments on their existing non-forced safety path.
- Added admin-only Firebase Auth account controls to `/admin/users` with disable/restore, refresh-token revocation, typed Auth-record deletion, self-account safeguards, per-user mutation serialization, structured audit logs, accessible confirmation and result feedback, and Admin Guide coverage; deletion preserves site data and does not prevent the same email from registering again.
- Added immediate server-side owner alerts for accepted contact and author submissions plus a protected `/admin/submissions` inbox with status counts, search, private master-detail review, alert health, Start review, authenticated email replies, reversible Archive/Reject/Restore actions, response audit records, CMS-role-gated callables and Rules, SMTP/DNS deployment guidance, and role-aware Admin Guide coverage; accepted forms remain successful when an alert fails, full private content stays out of owner alerts, and no submission creates author or publishing access automatically.
- Added public `/contact` and `/write-for-us` questionnaires with accessible contact, topic, proposal, reference, publishing-history, and author-credit fields; a collision-safe editorial hero, restrained draft-stack artwork, numbered form sections, and responsive single-column presentation; private callable-backed review records; server validation, honeypot filtering, opaque connection rate limiting, backend-only Firestore Rules, navigation and sitemap discovery, and an explicit boundary that applications never grant author profiles, drafts, roles, or publishing access automatically.
- Added an unobtrusive Continue Reading shelf to the homepage and blog archive for unfinished device-local articles, upgraded the reader library to preserve the last active section for fragment-based resume, and changed signed-in read points from route-load awards to server-validated 95% article completion without adding a popup or account gate.
- Reused the Publishing Calendar's Monday-first month grid inside the post editor's Publish Date control so editors can see nearby scheduled posts, review open suggested times, and choose an available slot without leaving an unsaved draft; the change adds no data migration or backend scheduling policy.
- Fixed authenticated CMS image uploads by treating the create-only staging write as complete without requesting a forbidden staging download URL; finalization now begins from the private Storage path, while public Media Library uploads retain their existing URL-resolution behavior.
- Completed the inactive integration quality pass by preserving authenticated CMS OpenAI callables, archiving the undeployed anonymous OpenAI/weather proxy with restoration safeguards, converting the referenced terminal AI and Weather prototypes to explicit local behavior, removing obsolete browser API URL configuration from environments and CI, and documenting local credential rotation without changing Firebase configuration.
- Completed the public semantic-primitive migration by replacing repeated header search, circular icon, utility-menu, PWA install, auth, comment-card, comment-form, button, and feedback utility clusters with shared purpose-based classes while preserving 44px controls, responsive menu geometry, focus restoration, dark mode, and component-owned specialty visuals.
- Split global CSS ownership into shared, public-site, and Core OS entry points; assigned mutually exclusive public/OS route scopes at the application host; contained macOS inputs, menus, windows, controls, gradients, and motion under Core OS; moved reusable window-header and dock chrome into their owning components; and replaced the public resume's leaked OS button class with the public control primitive.
- Consolidated the public visual system around scoped layout, gutter, spacing, radius, elevation, and content-width tokens; mapped those tokens into Tailwind; routed homepage sections, archive/search/privacy/author shells, cards, fields, buttons, media frames, and header/search overlays through shared semantic primitives; preserved light/dark and Core OS separation; and reduced the local development stylesheet from 253.52 kB to 250.45 kB.
- Hardened the public shell's keyboard and responsive behavior with a visible skip link, one route-owned page H1, a visible semantic featured-post H2, a focus-contained and labelled single-input search dialog with result-count announcements and focus restoration, focus containment/restoration for reader membership, high-contrast global focus rings, corrected muted-dialog contrast, and 44px header/dialog controls across desktop and mobile.
- Made reader membership prompting wait for a resolved Firebase Auth state and cancel stale anonymous offers when a signed-in session appears; consolidated protected public, Cat Corner, and Core OS routes on one authentication guard; and moved shared logging to a local-only boundary that preserves Core OS log controls without anonymous Firestore writes.
- Completed the seven-phase blog editor source release candidate and final local audit, including warning-free builds, lint, all Angular and Functions tests, publishing/media emulators, six hardened Firestore/Storage Rules cases, desktop/mobile public-reader browser coverage, zero dependency vulnerabilities, restricted canonical-media deletion, atomic media readiness/deletion concurrency, and explicit remaining authenticated deployment, corpus, accessibility, performance, monitoring, operator, and paused exhaustive-security gates.
- Added the seventh blog-editor production-readiness layer with a CMS-role-gated canonical publishing callable, complete server-owned post/block validation, optimistic revisions, transactional slug reservations and Draft Preview state, idempotent retry receipts, scheduled/manual parity, publishing/media audits, backend-only canonical Rules, safe write-time URL policy with legacy read compatibility, signature-validated image staging, bounded responsive AVIF/WebP/JPEG variants, durable media identity, reference-first explicit deletion, emulator coverage, zero-audit Sharp and CLI-tooling dependency hardening, exact local acceptance evidence, and coordinated deployment/rollback guidance without rewriting existing posts or legacy media URLs.
- Added the sixth blog-editor production-readiness layer without another image package: optional Small/Medium/Large/Wide sizing on the existing Editor.js Image block, migration-safe Automatic behavior for legacy posts, responsive clamp-based inline media that stacks for narrow or Reader-scaled layouts, aligned figures/captions, intrinsic-dimension validation, visible broken-image recovery, Production Preview parity, and a focus-trapped lightbox with restoration, inert background content, scroll locking, Escape, and gallery navigation.
- Added the fifth blog-editor production-readiness layer without another list plugin: migration-safe Standard/Step sequence presentation on the existing Editor.js List tool, three-level keyboard nesting, preserved ordered starts/counter types and checklist state, semantic recursive public rendering, Reader-scaled markers and controls, mobile-safe indentation and long-link wrapping, synchronized WYSIWYG/JSON/Production Preview contracts, focused regression coverage, and role-aware operator guidance.
- Added the fourth blog-editor production-readiness layer with shared responsive article H1/H2/H3 tokens across WYSIWYG, Production Preview, and public posts; identical flowing/sticky H2 metrics; restrained heading rules; preserved Reader-scaled typography variants; default-collapsed narrow contents; content-aware article rail tracks; and advisory repeated-title/Markdown-heading diagnostics while retaining stored levels, source, and historical anchors without migration or backend changes.
- Added the third blog-editor production-readiness layer with a synchronized local Production Preview mode that sends the current unsaved Editor.js document through the exact public block renderer and sanitizer, offers light/dark, Mobile/Tablet/Desktop canvas, 100/150/200 percent Reader text, reduced-motion, and keyboard controls, keeps polls read-only and compatibility payloads opaque, preserves the separate saved Draft Preview workflow, and requires no data migration, backend, Rules, dependency, or token change.
- Added the second blog-editor production-readiness layer with unified WYSIWYG/JSON/form/social dirty state, browser and Angular navigation protection, owner-scoped 30-day Firestore recovery copies, invalid-source retention, restore/compare/discard/reload/duplicate recovery controls, monotonic transactional post revisions across editor/preview/bulk/import writes, backend revision increments, stale/deleted conflict protection, focused reliability coverage, operator guidance, and documented migration/deployment/rollback gates while keeping canonical Save and Publish explicit.
- Established the first blog-editor production-readiness compatibility layer with migration-safe recursive and checklist lists in browser and crawler rendering, block-indexed known-block validation, lossless opaque preservation and warnings for unsupported Editor.js blocks, safe public omission, focused round-trip coverage, an updated role-aware author workflow, and a phased roadmap covering recovery, production-preview parity, typography, list and image presentation, trusted publishing/media services, deployment, rollback, and the final production audit.
- Kept socially linked articles intact through Google/Facebook redirect callbacks with validated short-lived return state, added an explicit **Continue reading — remind me later** campaign-login bypass, made cold slug routes continue listening for late Firestore publication data, and reduced article/image scrolling stalls by coalescing reading-state work and avoiding full block-renderer rebuilds on active-heading changes.
- Added a blog-only reader membership campaign that explains comments, points, and update choices; carries browser/email/newsletter preferences through existing login and registration with Apple-style glass settings rows and switches; stabilizes mobile-keyboard scrolling and browser autofill so registration fields remain available after email entry; saves reversible account preferences under owner-restricted Firestore rules; adds Profile controls; and packages six platform-sized social graphics plus an editable 15-second vertical promo video while keeping email delivery explicitly deferred until a provider is connected.
- Fixed CMS Chart blocks so Chart.js-style `labels` and multiple `datasets` survive JSON import, Editor.js render/save cycles, and public preview rendering; charts now honor series colors, legends, axes, bounds, suffix/decimal formatting, source attribution, and accessibility summaries while preserving the legacy single-series `chartPoints` format.
- Added a synchronized WYSIWYG/JSON toggle to the CMS Article Content editor so administrators can inspect and edit the raw Editor.js document in place, receive live syntax and block-shape validation, safely remain in source mode when JSON cannot render, and save valid source edits through the existing post workflow without a data migration.
- Aligned browser and server `BlogPosting` URLs with each article's route-derived canonical, added non-empty crawler-fallback alt text for legacy image blocks, added the report's missing contextual article link, raised indexable taxonomy thresholds to three category posts and five tag posts without removing archive routes, and added a 26-post metadata-only CMS optimization manifest from the July 19 SEO report.
- Fixed Editor.js chart imports so standard Chart.js `labels`/`datasets` JSON becomes typed, series-aware chart points, multi-series line charts render independent colored lines with an accessible legend, CMS edits preserve optional series labels, and blank chart rows no longer save as a misleading `Point 1 = 0`.
- Added an admin-only, tab-scoped **View as User** workflow to User Management with force-refreshed admin verification, target profile/role-aware navigation and Angular guards, target Profile projections, disabled-account visibility, a persistent recovery banner, safe session restoration, provider-mutation blocking, focused permission tests, and explicit documentation that Firebase requests retain the real admin identity.
- Added a searchable `/admin/guide` with role-filtered task instructions, stable section links, copyable deep links, direct admin-tool actions, keyboard search, desktop/mobile navigation, and negative permission coverage; added and locally installed the reusable `$update-admin-guide` skill so future blog/admin features update operator guidance, roles, tests, and project documentation together.
- Reused the CMS Media Library uploader in the Social Shares composer so editors can select an existing image or video, upload a new supported file, preview it, remove it, or retain direct public-URL entry; image-only uploader consumers remain unchanged and social video uploads follow the existing 25 MB Storage limit.
- Added a Facebook Login for Business configuration ID to Page authorization so Meta can request the required Page publishing permissions and return manageable Pages, and stopped forcing a fresh Instagram login so an authenticated Instagram session can continue into consent.
- Aligned Instagram Social Connections with the configured Instagram Business Login use case by adding provider-specific credentials, `instagram_business_basic` and `instagram_business_content_publish` authorization, direct Instagram token/profile exchange, single-account connection metadata, updated CMS guidance, and reconnect/deployment notes while preserving Facebook Page selection, Threads authorization, encrypted backend-only tokens, and disabled delivery workers.
- Added a URL-backed Social Shares workspace directly beside the CMS article editor, made Post/Social/Preview visibility explicit so Tailwind display utilities cannot defeat tab switching, reused its controlled native-first composer in the Publishing Calendar, added channel-aware formats for Facebook, Instagram, X, Threads, LinkedIn, and YouTube, preserved unscheduled social drafts in unified post saves/backups, and prepared an explicit-apply CMS-protected AI variant workflow with grounded media ideas and deterministic fallback copy; Firebase key/model verification and deployment remain a separate activation step.
- Expanded inline `TLDR`/`TL;DR` article headings centrally to `Quick Summary (TL;DR)`, preserved each heading's existing anchor (`#tldr` or `#tl-dr`), aligned table-of-contents labels, and added a plain-language explanation above the heading on hover or keyboard focus without migrating stored post content.
- Reordered public blog-detail headers so the eager, high-priority cover image follows the title and publishing metadata on normal posts, bringing the primary visual above the fold while moving category chips and the introductory dek beneath the image; preview, offline, editing, and health notices retain their priority before media, and the intro, reading toolbar, contents, and article body now use one compact 24px transition rhythm instead of stacked outer margins.
- Expanded the Publishing Calendar from link-first announcements into native social promotion plans with editable personal-story, conversation, practical, and behind-the-scenes starter copy; image or video attachments for every provider; explicit in-post, first-comment, profile, or no-link strategies; migration-safe outbox metadata; and focused Calendar/content validation coverage.
- Added a public `/authors` directory that lists every published canonical author as a responsive profile link, connects homepage and author-profile navigation, and keeps browser/crawler metadata, `CollectionPage`/`ItemList` schema, fallback HTML, and sitemap discovery aligned without loading blog posts.
- Added a shared URL-backed pagination component and pagination utilities, then limited public author archives, the main blog index, and category archives to ten rendered posts per page with compact accessible controls, responsive presentation, linkable `?page=` state, preserved topic filters, range feedback, and out-of-range clamping while preserving all-post author statistics; the same template now offers reusable List, Grid, and Image + title modes through `?view=`, places those controls above archive listings and beneath blog category filters, resets pagination on presentation changes, and retains each archive's existing default layout.
- Replaced the all-category scrolling chip rail and quick links with an accessible category-only multi-search filter that renders removable selections as chips, combines matches through shareable `?categories=` state, offers Clear filters instead of All, preserves keyboard selection and match counts, and shares one compact desktop row with archive layout controls; category landing titles now use a smaller responsive scale.
- Cleared all 20 vulnerable npm dependency paths behind the 18 Dependabot warnings across the app and Functions lockfiles by aligning Angular 22 patch releases, updating compatible transitive packages, and adding narrowly documented Vite/esbuild and Firebase Google-client/UUID overrides; both audits, both builds, lint, all 573 Angular specs, and all 27 Functions tests now pass without changing application behavior or Firebase data.
- Prevented topic-hero headings from splitting words, and sized them against their copy column so concise titles such as Web Development stay on one desktop line while longer titles still wrap at spaces.
- Moved the blog table of contents into a left reading rail, added a migration-safe right rail for polls and future explicitly placed blocks, reused the existing taxonomy-ranked suggestions as compact More Posts links, and kept the complete layout in one responsive semantic flow with percentage-scaled desktop tracks and gutters, edge-aligned rails, and no duplicated interactive components.
- Added a dedicated Editor.js Suno Song block that canonicalizes exact song/embed URLs, renders Suno's responsive 240px player through a narrowly sandboxed provider boundary, keeps a direct listening fallback, extends Hosting CSP for only `https://suno.com`, and requires no API, secret, Function, Firestore change, or data migration.
- Added a native Editor.js blog poll block with two-to-eight stable answers, authenticated one-vote-per-account updates, server-enforced result visibility, backend-only Firestore vote storage, accessible responsive result bars, no-JavaScript fallback copy, and deployment/rollback documentation without adding external APIs.
- Replaced duplicated Topics and Recommended Links search markup with a shared `AdminSearchFieldComponent`, preserving each manager's labels, placeholders, local filtering, and visual treatment while centralizing input semantics and value emission.
- Standardized CMS load-error and empty-list feedback with shared accessible alert and status components across Homepage Hero, Topics, and Recommended Links, preserving the managers' existing copy and visual treatment while removing repeated state markup.
- Stabilized sticky post-toolbar motion tests by isolating the Reader Tools reduced-motion class, covering both smooth and immediate scroll behavior, and preventing unrelated preference state from changing full-suite expectations.
- Replaced 13 duplicated Homepage Hero, Topics, and Recommended Links metric blocks with a shared `AdminStatCardComponent`, preserving the existing computed values and responsive grids while centralizing label, value, sizing, capitalization, and card styling.
- Added a shared CMS editor action bar across Homepage Hero, Topics, and Recommended Links with consistent save/delete layout, accessible live status, explicit busy state, and unsaved-change feedback while preserving existing form submission and Firestore handlers.
- Started the admin Phase 3 site-content consistency pass with a shared `AdminPageHeaderComponent` used by Homepage Hero, Topics, and Recommended Links, preserving each manager's actions, routes, editor density, and Firestore behavior while removing duplicated page identity markup.
- Replaced public blog and main-site `innerHTML` rendering with a shared sanitized rich-text renderer and inert HTML-to-text utilities, preserved Editor.js formatting and link/image behavior, rendered terminal/contact content as text, and added XSS regression coverage plus live article verification while leaving OS-only HTML paths outside this public-site cleanup scope.
- Replaced the last allowlisted CommonJS package, `editorjs-youtube-embed`, with a typed local Editor.js block that preserves the existing `youtubeEmbed` and `{url}` document contract, validates YouTube watch/share/short URLs, renders accessible previews, supports read-only editing, removes the package and CommonJS allowlist, and leaves the production build warning-free without suppressed dependencies.
- Replaced the optional Tone.js sampler runtime with a browser-native multi-sample driver that preserves the existing `tone-sampler` settings ID and 26-preset catalog, fetches only the nearest sample needed for each note, caches decoded audio, applies pitch and release envelopes directly through Web Audio, removes four packages and the roughly `348 kB` Tone lazy chunk, and brings production builds to zero optimization warnings.
- Replaced the CommonJS custom-oscillator wrapper with a typed local Web Audio factory that imports only the 15 wave tables the app exposes, preserves all 25 compatibility oscillator names, reuses generated waves per audio context, fixes multi-note routing through independent gain/pan chains, removes the wrapper package, reduces its lazy chunk from about `979 kB` to `284 kB`, and leaves one Tone.js-related optimization warning.
- Replaced the legacy CommonJS SoundFont player stack with a native browser audio loader that fetches, decodes, caches, envelopes, and disposes individual General MIDI samples while preserving the existing driver catalog; removed seven obsolete packages and reduced build optimization warnings from `5` to `2`.
- Migrated application, development-server, extraction, and Karma targets from the deprecated `@angular-devkit/build-angular` package to Angular 22's `@angular/build` builders, removed 354 Webpack-era packages from the lockfile without changing retained dependency versions, and routed Day.js through its ESM distribution to eliminate two optimization warnings without changing relative-time behavior.
- Cleared the remaining Firebase and dormant weather explicit-typing backlog, replaced private-method `any` casts in Firestore tests with a typed harness, and restored `npm run lint` to `0` errors and `0` warnings without adding or activating an external weather API integration.
- Completed the OS/game accessibility lint cleanup, replaced remaining tray/desktop/SpaceX custom interactions with keyboard-native controls, tightened shared media, settings, storage, window, sound, scroll, video-provider, and SpaceX types, migrated scroll directives to standalone, reduced the lint baseline from `208` to `100` errors, and expanded the passing suite to `517` specs.
- Continued the OS accessibility cleanup through Finder and notifications with named native controls, keyboard-ready folder navigation, explicit dismiss/clear-all actions, focused interaction coverage, and deterministic visibility/motion slideshow tests; reduced the lint baseline from 221 to 208 errors and expanded the passing suite to 514 specs.
- Replaced non-semantic click targets and unassociated form labels across the first OS accessibility cleanup batch, added keyboard-native controls and accessible names, removed redundant terminal autofocus, tightened touched component types, and reduced the lint baseline from 262 to 221 errors.
- Restored the full 511-spec baseline by updating the Social Connections route contract and making motion-sensitive scroll tests independent of host accessibility preferences.
- Removed OpenAI/weather API development from the active roadmap while preserving existing inactive integrations for a documented removal review.
- Simplified Tailwind source scanning and stopped tracking generated Firebase hosting output and local editor settings without deleting local files.
- Added the public social OAuth base URL and Meta Graph API version to the production Functions dotenv file so non-interactive Firebase deploys can resolve both parameters without prompting.
- Unified Facebook and Instagram authorization under the Meta publishing app, removed obsolete standalone Instagram secret bindings, and resolved linked professional Instagram accounts through manageable Facebook Pages.
- Fixed cold blog links from social apps and other external entries by loading the requested published slug independently from the auth-aware full post collection, while preserving cached post reuse and background archive/suggestion loading.
- Added direct post-and-discussion links to every Comment Moderation card so reviewers can open the public article context in a separate tab without losing their moderation queue position.
- Added a connection-only Facebook, Instagram, and Threads authorization layer with CMS-role-gated OAuth starts, signed one-time state, provider-bound encrypted token storage, explicit Facebook Page selection, protected callback rewrites, sanitized admin health controls, and Threads Calendar planning while keeping all external delivery workers disabled.
- Added a plain-language `/privacy` policy with no-sale and user-requested deletion commitments, linked it from the homepage and blog information footers, and included it in client/server SEO metadata and the generated sitemap.
- Expanded the homepage information footer with primary navigation, copyright ownership, privacy access, and a working email contact path while keeping the future spam-protected contact form deferred.
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
