# Public Blog Shell

## Purpose

The public shell treats the blog as the primary content destination while keeping the portfolio homepage available at `/`. It removes repeated text navigation and gives search, reading preferences, and account utilities clear ownership.

## Public Visual System

`src/styles/_public-design-tokens.scss` owns the public route frame's structural tokens: maximum content widths, responsive gutters, section rhythm, surface/control/overlay radii, and light/dark elevation. The variables are scoped to `.site-theme-scope`, so `/os`, boot, login, sleep, and other Core OS routes retain their independent geometry and theme. `tailwind.config.js` exposes the same contract through `site` colors, `site-*` widths, radii, and shadows without requiring runtime-generated class names.

`src/styles/ui-components.scss` remains the semantic component layer. Its public inventory now includes:

- `.site-page`, `.site-section`, `.site-section-inner`, and the section-band variants for route and homepage rhythm;
- `.site-layout` with reading, wide, and prose width modifiers for archive, search, author, and policy shells;
- `.site-card`, `.site-card-dark`, `.site-card-interactive`, `.site-resource-link`, `.site-empty-panel`, `.site-error-panel`, `.site-success-panel`, and skeleton cards for one surface/radius/elevation contract;
- `.site-input`, `.site-header-search-input`, shared button variants, blog action controls, and `.blog-media-frame` for consistent control and media geometry;
- `.site-icon-control` and its size/state modifiers for circular header, search, account, and auth actions;
- `.site-menu-link` with success, accent, and danger modifiers for the responsive utility menu and install/account entries; and
- Tailwind-backed `rounded-site-overlay` and `shadow-site-overlay` utilities for the header menu and search overlay.

Utilities on an individual template can still override spacing when a feature needs deliberate art direction, but public components should prefer these primitives for base geometry. The homepage hero, topic map, recovery boards, article body, and Reader Tools retain their specialized visual systems.

`SiteHeaderComponent`, `SiteSearchDrawerComponent`, `SiteAuthControlsComponent`, and `PwaInstallControlComponent` now compose the same search, icon, and menu-link primitives. `BlogCommentsComponent` composes the shared card, field, button, success, error, and empty-state primitives while keeping threading and reply presentation local. This completes the generic public utility-cluster migration; feature-specific archive filters, article blocks, recovery panels, topic-map graphics, and Core OS controls remain deliberately component-owned.

This is an Angular/Tailwind presentation migration only. It changes no route, content model, Firestore document, Storage object, Function, Security Rule, theme preference, or Core OS state. Existing elements incrementally opt into semantic classes; rollback consists of reverting the template class substitutions, shared component declarations, token import, and Tailwind mappings. No data migration or cache invalidation is required beyond the normal Hosting asset refresh.

## Style Ownership Boundary

`src/styles.scss` is the global-style ownership manifest rather than a mixed rule file. It loads only three explicit layers:

- shared foundations: fonts, scrollbars, and route transitions used by every shell;
- Core OS: `_core-os-globals.scss`, `_core-os-motion.scss`, and `_core-os-gradients.scss`; and
- public website: `_public-globals.scss`, `_public-motion.scss`, `_public-design-tokens.scss`, and `ui-components.scss`.

`AppComponent` assigns the owning scope on the `app-root` host. Public routes receive `.site-theme-scope`; `/os`, `/login`, `/boot`, `/sleep`, and `/external` receive `.core-os-scope`; admin receives neither because it owns a dedicated shell. These classes are mutually exclusive, so header, membership, notification, and other route-level siblings inherit the same boundary as the routed page instead of relying on a class attached only to the route frame.

Core OS autofill, menus, app windows, macOS controls, gradients, and motion utilities are descendants of `.core-os-scope`. Public blog media motion is a descendant of `.site-theme-scope`. Window-header and dock glass chrome now live in `WindowHeaderComponent`, `AppWindowComponent`, and `DockComponent`, allowing deliberate embedded OS chrome without reopening global selectors. Public templates must use the `.btn-*`, `.site-*`, and `.blog-*` primitives instead of `.mac-*` classes.

The boundary changes presentation ownership only. It requires no route, Firebase, content, preference, or local-storage migration. Rollback restores the former stylesheet imports and route-frame site class, removes the host scope bindings, and restores the global OS selectors; no stored data changes are involved.

## Header Contract

`SiteHeaderComponent` renders three responsive regions:

- the Colin Michaels logo, which always routes to `/` without claiming the page-level `h1`
- a rounded `Search` field that opens and filters the existing live-results drawer
- compact utilities: an optional post-list shortcut and one site/account menu

The utility menu owns links to All Posts and OS, install discovery, the Cat Corner link for `catCornerAddict`/full-admin accounts, and the role-aware account/admin controls supplied by `SiteAuthControlsComponent`. Its rows use `.site-menu-link` plus purpose modifiers, while the header shortcut, menu trigger, search close action, and desktop account buttons use `.site-icon-control`. Personal reading-library, saved-offline, notification, native-device, and storage settings live on the protected Profile page instead of expanding the global menu. On narrow screens the post-list shortcut is hidden because the same destination remains available inside the menu.

The public shell places a keyboard-revealed **Skip to main content** link before the sticky header and gives the shared route frame a stable focus target. Page components retain ownership of their one meaningful `h1`; the homepage featured article exposes its previously hidden title as a visible, two-line `h2`. Header search, logo, post-list, and menu controls retain at least a 44px target at narrow and desktop widths.

## Cat Corner Discovery

Cat Corner uses the public shell as a playful discovery gate rather than a confidential-content boundary. The reusable Gretchen Editor.js block sends guests through the existing login return flow, then an authenticated callable grants the fixed `catCornerAddict` role. A refreshed token reveals `/cat-corner`, its utility-menu link, and the profile badge immediately; full administrators receive the same hub access without needing the role.

Cat Corner discovery metadata keeps normal posts and selected discovery posts in existing public lists. Non-discovery Cat posts remain readable by direct article URL but are omitted from the homepage, Blog archives, site search, taxonomy discovery, feeds, sitemap, and crawler-facing public lists. See `CAT_CORNER.md` for the complete content, SEO, deployment, and rollback contract.

## Search Flow

The header field is the single search input for the live-results experience. `SiteSearchDrawerComponent` is mounted inside that positioned header control so the result panel opens directly beneath it and matches its width and center from the `sm` breakpoint upward. On narrower screens it remains directly below the header but clamps to 12px viewport gutters to prevent overflow. Activating or typing in the header field opens the panel, which:

- streams recent content before a query is entered
- filters quick results directly from the header query without rendering a duplicate field
- links to the full `/search` page with the current query
- exposes the field and result panel as one labelled modal search surface
- keeps keyboard focus inside that surface while open and announces the number of available results without reading the full list on every update
- preserves Escape, backdrop, and close-button dismissal, returning focus to the header field unless a result navigation has begun

The Blog index no longer renders a duplicate Search action because the global launcher remains visible in the sticky header.

The focus boundary uses Angular CDK's maintained `CdkTrapFocus` primitive rather than a feature-specific key loop. Global `:focus-visible` styling provides a three-pixel, theme-aware outline; pointer focus is not globally suppressed. These changes require no route, content, Firebase, or stored-data migration. Rolling back the shell restores the earlier search and heading presentation without changing public URLs or documents.

## Reusable Post Presentation

`BlogPostListingComponent` is the shared public post-discovery surface for the Blog index, category and tag archives,
homepage writing/recovery sections, and topic hubs. Parents keep ownership of repository queries and filtering while
the component owns post anatomy, links, metadata, media, accessible state panels, and four explicit layout variants:
`list`, `grid`, `fan`, and `compact`. This preserves familiar interaction and typography without forcing every page
into the same visual density. Topic hubs use the fan only for the first three promoted posts and return to normal list
rows for the remaining archive. See `TOPIC_PAGES_AND_POST_LISTING.md` for the component and data migration contract.

## Archive Navigation And Filtering

The public archive shell keeps repository queries in route components and shares presentation and URL-state behavior through three reusable boundaries:

- `SitePaginationComponent` owns accessible previous, next, numbered-page, range-summary, and List/Grid/Image + title controls without querying content. It merges unrelated query parameters and omits default page/view values so canonical page-one URLs remain clean.
- `pagination.util.ts` owns positive page parsing, page-count calculation, out-of-range clamping, immutable slicing, and compact page windows. Public blog, category, and author archives use the shared ten-item default while retaining full result sets for statistics and filter counts.
- `BlogCategoryNavComponent` owns the category-only combobox, match counts, removable selected chips, keyboard highlighting, outside-click dismissal, and Clear filters action. Multi-category selection resolves to the blog index through `?categories=slug,slug`, where every selected category must match a result.

`blog-archive-view.util.ts` maps the shared `?view=` contract to the existing post-listing layouts. Changing a category or view clears `?page=` while preserving unrelated topic and category state, preventing stale page numbers from producing empty slices. No post, category, or author data migration is required; rolling back restores the previous route templates and leaves the optional query parameters inert.

## Authors And Bylines

Posts reference a canonical Firestore author through `authorId` and retain a compact `author` snapshot for cards,
previews, feeds, offline copies, and crawler fallback rendering. New and legacy posts default to Colin Michaels, while
the CMS author selector can assign a published post to another published author. Public bylines link to
`/authors/:slug`; that route presents the canonical profile, derived publishing statistics, and a reusable
`BlogPostListingComponent` archive of the author's publicly discoverable posts.

Site identity remains intentionally separate from article authorship. The homepage About section, publisher identity,
and Colin-specific recovery copy continue using the shared Colin profile even when an article has another author.
Search indexes author name, title, and slug and supports a stable `?author=<slug>` filter on `/search`. See
`AUTHORS_AND_BYLINES.md` for the data model, access boundaries, migration order, SEO behavior, and rollback contract.

## Labs Pause

Labs code is preserved under `src/app/labs`, but its public entry points are intentionally paused:

- `/labs` redirects to `/blog`
- Firebase Hosting performs the temporary `302` before the catch-all SEO renderer, and `/labs` is omitted from the sitemap and homepage fallback links
- the header, homepage Labs promotion, blog footer, and static search items omit Labs
- existing experimental components are not deleted or moved
- `/background` remains available as an existing standalone route

Re-enabling Labs should restore the route component and selected discovery links only after the section redesign is ready.

## Reader Tools

Reader Tools remains available on public reading routes and owns the persisted light/dark theme action alongside text size, spacing, contrast, and reduced-motion controls. Its current-status readout uses a prominent fixed-height treatment, and the panel reserves stable width and help-text height so hover/focus descriptions cannot shift controls under the pointer.

## Profile Controls

The protected `/profile` route is the management surface for device-local reader data and capability-gated app preferences. It groups reading history, favorites, read later, offline article removal, Web Push opt-in, native share/fullscreen/wake-lock actions, and storage protection without changing the underlying browser-local storage boundaries. Empty reading and offline lists remain visible there so users can discover where future saved items will be managed.

## Continue Reading Shelf

`ContinueReadingShelfComponent` is a reusable, non-modal reader-assistance surface shared by the homepage and `/blog`. It renders only when the device-local library contains unfinished articles, limits itself to three recent records, and introduces no empty placeholder, prompt, account gate, notification permission request, or automatic interruption. Each card exposes the saved percentage, last section label when available, an accessible progress bar, and one article link.

Resume links use the existing canonical `/blog/:slug#heading-id` route. The heading id comes from the same stable Editor.js heading projection used by the table of contents. Because a cold Firestore post can resolve after Router anchor scrolling has already run, `BlogDetailComponent` performs a bounded post-render retry and focuses the heading's existing anchor after it is found. The high-water completion percentage and latest resume section remain separate: rereading an earlier section updates the resume destination without lowering completion.

## Direct Article Loading

`BlogDetailComponent` resolves a cold `/blog/:slug` entry through a bounded Firestore query for that published slug instead of waiting for the auth-aware full post collection. This keeps links opened from social apps, email, search, and other fresh browser sessions independent from the heavier archive/suggestion load. If the post is already in the repository cache, the detail route reuses it without issuing the additional query. A direct result is merged into the post cache, and the detail route remains subscribed to published collection updates so an article can appear or refresh when the auth-aware collection finishes after the initial route or social-login callback.

The direct query requires both `status == published` and the exact slug so Firestore rules can prove that drafts are not exposed. Firestore merges the existing automatic equality indexes; no document migration or composite-index deployment is required. The full published collection continues loading in the background for previous/next navigation and suggestions, while its loading or error state no longer blocks the primary article and cover image.

Article scroll and resize work is coalesced into one animation-frame update. Active-heading changes no longer rebuild the renderer's complete Editor.js block projection, so lazy image decoding and section transitions do not compete with repeated markdown, embed, and gallery preparation on the main thread.

Rollback is limited to restoring the repository slug observable to the shared collection stream, restoring the detail page's shared repository loading state, and removing the animation-frame coalescing. No stored content or Firebase configuration changes are involved.

## Sticky Post Toolbar

`BlogStickyPostToolbarComponent` sits immediately after the full blog-detail header in the article grid. It scrolls into place naturally and then remains pinned beneath `SiteHeaderComponent` with the current cover thumbnail, truncated title, persistent read percentage and progress bar, a single Share control that fans provider actions leftward on hover/focus or tap, separate favorite/read-later controls, an explicit offline download/update/remove action, and a comments shortcut. The progress control lives inside the post rail instead of competing with the public header at the viewport's top edge. Progress is scoped to the rendered article-body container: the title/cover header remains at 0%, the final body block reaches 100%, and post navigation, tags/share controls, comments, suggested posts, and the site footer do not extend the reading distance. IndexedDB retains the greatest article-body percentage reached, marks the post read at 95%, and restores that status on later visits without moving the page automatically. Favorites and read later store only summary metadata; only the offline control downloads the article body. On mobile, the public header and post rail use shared 56px and 52px height tokens, and the rail keeps its thumbnail, title, status, and actions in one row. The section heading uses their combined 108px offset, so the three sticky
surfaces meet without gaps; the wider layout uses the same contract with 64px and 60px layers. The share fan preserves keyboard dismissal and reduced-motion behavior while keeping the reading rail compact. The comments shortcut targets a stable wrapper around the deferred comments block so anchor navigation triggers loading without losing the scroll destination. System and Reader Tools reduced-motion preferences switch the comments jump from smooth to immediate scrolling.

The detail grid, header, toolbar, table of contents, and article body use a single 24px inter-row rhythm at narrow and wide layouts. The header keeps its divider with 20px bottom padding, while the table-of-contents component contributes no outer margin of its own. This prevents parent grid gaps and child margins from stacking into 80px empty bands while preserving component reuse and sticky positioning.

Once the post header leaves the viewport, the reading rail exposes a scroll-to-top action using one `IntersectionObserver` rather than a continuous scroll listener. Only the active level-two content heading receives sticky positioning below the public header and reading rail; when the next heading reaches the pinned heading's lower edge, the previous heading immediately returns to normal flow. Sticky and flowing level-two headings use identical font size, line height, padding, border, and measure, so entering or leaving the sticky state cannot reflow the article. Heading anchor offsets account for both persistent rails on desktop and mobile.

On desktop, `BlogTableOfContentsComponent` owns the left reading rail and sticks below the public header rather than underneath it. The active heading link uses `aria-current="location"`, and the contents scroller recenters that link when article scroll position changes so long outlines continue following the reader without moving the page itself. TOC clicks scroll to each heading's natural document position rather than its current sticky rectangle, which preserves backward navigation after earlier headings have already pinned to the reading stack. Below the desktop breakpoint the table of contents becomes a native button disclosure and starts collapsed; selecting a heading collapses it again. A separate right rail renders post polls or future explicitly placed custom blocks above the existing taxonomy-ranked suggested posts. The desktop grid now selects article-only, contents/article, article/related, or three-column tracks from the rails that actually exist, rather than reserving empty columns. See `BLOG_READING_RAILS.md` for placement, migration, and rollback details.

Article H1/H2/H3 sizing, line height, text measure, rhythm, letter spacing, contrast, and heading rules come from shared `--blog-*` tokens consumed by the public page, local Production Preview, and WYSIWYG heading surface. Level-two headings use a restrained top rule and short accent instead of the earlier full divider and shadow treatment. Reader text scaling keeps lead, section-intro, pull-quote, key-takeaway, eyebrow, attribution, aside, and caption variants intentionally distinct rather than flattening them to the body size. The CMS warns when the first Heading block repeats the post title and when Markdown headings will render without joining the generated contents rail; neither warning rewrites stored content.

List blocks preserve native ordered, unordered, and checklist meaning while the renderer owns their editorial presentation. Missing `data.listPresentation` defaults to `standard`; only ordered lists honor the optional `steps` presentation, and nested children return to standard list treatment. Ordered `start` and supported numeric, Roman, or alphabetic counter types remain semantic, with tabular counters for scanability. Logical marker spacing, hanging indents, recursive indentation, checkbox size, and item gaps scale with Reader text, while long rich-text links wrap within the article at narrow widths. Explicit list roles protect semantics in browsers that remove native list exposure when custom markers use `list-style: none`. No legacy post migration is required; rolling back returns to the previous list styling and leaves optional presentation data inert.

The shared reading utilities treat heading-only `TLDR` variants as a presentation alias for `Quick Summary (TL;DR)`. Stored Editor.js content remains unchanged, each historical anchor remains stable (`#tldr` or `#tl-dr`), and the table of contents uses the expanded label. The block renderer adds the plain-language meaning above the heading on hover or keyboard focus through an `aria-describedby` tooltip, so the explanation does not depend on editing individual posts or on pointer input alone.

## Chart Blocks

`BlogChartComponent` owns public rendering for typed chart blocks and keeps Chart.js concerns out of the generic `BlogBlockRendererComponent`. It accepts both the legacy `chartPoints` single-series contract and the richer `labels` plus `datasets` contract used by imported Editor.js JSON. Multi-series charts preserve dataset labels and colors, chart type, axis titles and maximum, legend visibility, suffix/decimal formatting, source attribution, and the author-provided accessibility summary. A semantic screen-reader table carries every category and dataset value alongside the canvas.

The CMS chart tool exposes the same labels/datasets object as editable formatted JSON and preserves it through Editor.js render/save cycles. Existing point-editor CSV/JSON import remains available for simple single-series charts. No Firestore migration is required for valid stored blocks, but posts previously saved after the old tool collapsed an unsupported dataset chart to `Point 1: 0` must be re-imported from their original JSON backup after this client change is deployed. Rollback restores the point-only renderer and editor; dataset-backed blocks remain stored but will not render correctly until the richer client is restored.

Body images retain the existing Full width, Contained, Inline left, and Inline right layout meanings. The optional `data.imageSize` accepts only `small`, `medium`, `large`, or `wide`; a missing value remains the legacy Automatic layout and requires no post migration. Responsive `clamp()` widths replace the former fixed inline width. Inline Small, Medium, and Automatic figures float only from 800 CSS pixels upward and stack when the viewport is narrower, the image is Large/Wide, or Reader text reaches 150 percent. Level-two and level-three headings continue clearing both float directions. Figure, frame, media, and caption share one bounded width, while Wide means all available article-column space rather than viewport overflow. Known positive intrinsic dimensions stay on the image to reserve aspect-ratio space; missing dimensions remain valid. Portrait, landscape, and extreme ratios use `object-fit: contain` without forced cropping.

Every body image opens through the same accessible gallery dialog. Opening stores the trigger, makes article and surrounding page content inert, locks body scroll with scrollbar compensation, and places focus on Close. Tab and Shift+Tab remain inside the dialog, Left/Right moves through multi-image galleries, Escape closes, and focus returns to the original image trigger. If an article or lightbox image fails, the renderer replaces the broken control with a visible status fallback while retaining alt-derived context and the caption. Crop ratios, focal points, art direction, and generated responsive sources remain deferred until the trusted media backend can own durable variants.

## Optional Post Backgrounds

`BlogPost.backgroundImage` is an optional full-post field used by the single-post and draft-preview routes and, when
the post resolves as the homepage hero, as a custom homepage backdrop. When it is absent or blank,
`BlogDetailComponent` preserves the existing opaque blog page exactly. When it is present,
`BlogPostBackgroundComponent` renders the image as a decorative fixed viewport layer with a dark scrim while the
article and footer receive translucent surfaces. The cover image remains the article hero and the source for
cards/share fallbacks; a post background never replaces or implicitly derives from the cover.

The background is `alt=""`/`aria-hidden`, uses centered `object-fit: cover`, and becomes the route's high-priority
preload image so it does not compete with the cover for critical priority. Reader Tools high-contrast mode hides the
decorative layer and restores the normal opaque page background. The component stays inside the blog-detail route,
so it is removed automatically when navigating to another post or page and does not mutate global `body` styles.
If the configured image cannot load, the component reports the failure and immediately restores the standard page
surface and cover-image preload priority instead of leaving an empty enhanced backdrop.

## Interactive App Embeds

The CMS `App Embed` Editor.js tool stores only a hosted URL, accessible title, and starting height. The Editor.js adapter normalizes that authoring block into the existing typed `embed` blog block, so the public renderer remains independent from Editor.js and existing post documents require no migration.

Interactive framing is intentionally narrower than custom HTML. `BlogBlockRendererComponent` accepts the canonical Hear the Hook soundboard URL, its legacy `.html` redirect form, and the site's exact root landing-page URL; all three normalize to `/soundboard`, and no other path on the host is trusted. It renders the app in a cross-origin sandbox with scripts, same-origin behavior, and popups only; camera, microphone, geolocation, payment, clipboard, and fullscreen capabilities are explicitly denied. Custom HTML continues to remove `iframe` and `script` elements. Unapproved or invalid app destinations become normal `noopener noreferrer` links instead of trusted resource URLs.

The frame starts at a bounded CMS-configured height and can receive `hear-the-hook:resize` messages in production. Resize handling requires the exact hosted origin, the matching iframe window, the exact message type, and a finite height clamped from 360px to 2400px. Preview domains retain the fixed starting height because the hosted soundboard currently posts only to `https://colinmichaels.com`. An always-visible external link covers disabled framing, future host policy changes, and readers who prefer a separate tab.

Deployment requires the exact ChatGPT Sites origin in Firebase Hosting's `frame-src` policy; no Functions, rules, secrets, or data migration are needed. Rollback is removal of the post's App Embed block (or replacement with a paragraph link), followed by reverting the renderer/tool and CSP origin. The hosted app remains independently reachable throughout rollback.

## Suno Song Embeds

The dedicated CMS `Suno Song` tool accepts only exact HTTPS `/song/{uuid}` or `/embed/{uuid}` destinations on `suno.com`, canonicalizes both forms, and stores them through the existing typed `embed` blog block with `provider: 'suno'`. It is separate from App Embed because Suno has a fixed 240px media-player contract rather than an application height or resize-message lifecycle.

The public renderer repeats URL validation, loads the exact canonical player in a provider-specific sandbox, and keeps a visible `Listen on Suno` link. Invalid or future unsupported Suno paths remain external links. Custom HTML still cannot frame Suno or any other provider, and `frame-src` adds only the exact Suno origin. See `docs/ARCHITECTURE/EDITORJS_SUNO_EMBEDS.md` for the complete data, privacy, deployment, and rollback contract.

On the homepage, the same optional field replaces all CMS hero slides only while that post owns the hero and the
Homepage Hero manager's `Use featured post background` option is enabled. It remains decorative, uses a centered cover
crop, disables rotation, and falls back to the configured slideshow when the option is off or after a load error. The
cover continues to drive the article panel thumbnail and social-image fallback.

The CMS Post Images module reuses `BlogMediaUploaderComponent` for existing-library selection, URL entry, upload,
preview, and an explicit detach action. Empty values are normalized away and serialized with Firestore `deleteField()`
because posts use merge writes. Existing documents need no migration. Draft previews preserve the full field, and
offline public snapshots retain it and warm same-origin background assets alongside cover and body images.

## July 19 SEO Report Remediation

Article canonical ownership remains route-based. The browser and Firebase Functions renderers now build
`BlogPosting.url` and `mainEntityOfPage.@id` from `/blog/{slug}` instead of trusting the optional stored
`seo.canonical` value. This keeps structured data aligned with the canonical link even when a legacy post contains a
relative or stale canonical override. Existing Firestore fields are preserved; no post migration or redirect is
required.

Crawler fallback images use stored alt text first, then a caption, then the article title as a non-empty fallback. This
matches the existing Angular reader behavior and closes legacy empty-alt gaps in raw HTML without overwriting CMS
content. Editors should still replace generic fallbacks with image-specific text when they can identify the image.
The fallback for `recovery-update-finish-line-in-sight` also links to the canonical endocarditis story, matching the
related-post discovery that hydrated article pages already provide and closing the report's isolated raw-HTML link gap.

Taxonomy archive routes remain navigable. Categories now require three published posts and tags require five published
posts before they become indexable or enter the sitemap. Lower-count archives return `noindex,follow`, so existing
links continue working while the sitemap concentrates on stronger collections. Reverting the two shared thresholds
restores the previous two-category/three-tag policy; no data rollback is needed.

Deployment requires the Angular Hosting bundle and Firebase Functions. Post metadata proposals live in
`docs/SEO/SEO_PERFORMANCE_2026_07_19_OPTIMIZATION_MANIFEST.json` and remain a separate CMS review step.

## Validation

Relevant regression coverage includes:

- `site-header.component.spec.ts` for logo/search/menu ownership, the single-input dialog contract, and dismissal focus restoration
- `app.routes.spec.ts` for the temporary Labs redirect
- `reader-tools.component.spec.ts` for stable panel dimensions
- `offline-blog-post.service.spec.ts` for public snapshot validation and Cache Storage lifecycle
- `blog-article-library.service.spec.ts` for IndexedDB persistence, progress high-water state, completion, and independent list membership
- `article-library-control.component.spec.ts` for reading-state and list-management controls
- `offline-articles-control.component.spec.ts` and `blog-sticky-post-toolbar.component.spec.ts` for saved-content management controls
- `pwa-push.service.spec.ts` and `pwa-native-controls.component.spec.ts` for explicit opt-in, safe notification routing, subscription validation, and menu control states
- `blog-block-renderer.component.spec.ts`, `blog-reading.util.spec.ts`, and `blog-table-of-contents.component.spec.ts` for stable linkable headings, identical sticky metrics, inline formatting, responsive rail selection, collapsed mobile contents, backward navigation, semantic recursive lists, bounded Step sequences, ordered counters, long-link wrapping, bounded image sizes, intrinsic/missing dimensions, failed-image recovery, accessible lightbox focus/scroll behavior, and float clearing before subsequent sections
- `blog-block-renderer.component.spec.ts`, `blog-embed.util.spec.ts`, `app-embed-block.tool.spec.ts`, and `blog-editorjs-adapter.spec.ts` for exact app URL trust, authoring conversion, sandbox attributes, outbound fallback, and custom HTML iframe removal
- `blog-suno-embed.util.spec.ts`, `suno-embed-block.tool.spec.ts`, `editor-js.component.spec.ts`, `blog-editorjs-adapter.spec.ts`, and `blog-block-renderer.component.spec.ts` for Suno URL trust, authoring registration, canonical round trips, sandbox attributes, responsive height, and external fallback
- `blog-block-placement.util.spec.ts`, `poll-block.tool.spec.ts`, `blog-editorjs-adapter.spec.ts`, `blog-post-rail.component.spec.ts`, and `blog-poll.component.spec.ts` for left/center/right ownership, migration-safe poll placement, compact rail presentation, and suggested-post reuse
- `blog-post-background.component.spec.ts` for decorative semantics, preload ownership, and failed-image fallback
- `blog-validation.util.spec.ts`, `blog-repository.service.spec.ts`, and `offline-blog-post.service.spec.ts` for the optional schema, normalization, and offline preservation contract
- `blog-repository.service.spec.ts` for cached and cold direct-slug article loading without a full-collection dependency
- browser checks for live result filtering, contained search focus, Escape restoration, skip navigation, heading hierarchy, 44px targets, the compact menu, Reader Tools theme changes, desktop/mobile layout, and the `/labs` redirect
