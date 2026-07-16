# Public Blog Shell

## Purpose

The public shell treats the blog as the primary content destination while keeping the portfolio homepage available at `/`. It removes repeated text navigation and gives search, reading preferences, and account utilities clear ownership.

## Header Contract

`SiteHeaderComponent` renders three responsive regions:

- the Colin Michaels logo, which always routes to `/`
- a rounded `Search` field that opens and filters the existing live-results drawer
- compact utilities: an optional post-list shortcut and one site/account menu

The utility menu owns links to All Posts and OS, install discovery, the Cat Corner link for `catCornerAddict`/full-admin accounts, and the role-aware account/admin controls supplied by `SiteAuthControlsComponent`. Personal reading-library, saved-offline, notification, native-device, and storage settings live on the protected Profile page instead of expanding the global menu. On narrow screens the post-list shortcut is hidden because the same destination remains available inside the menu.

## Cat Corner Discovery

Cat Corner uses the public shell as a playful discovery gate rather than a confidential-content boundary. The reusable Gretchen Editor.js block sends guests through the existing login return flow, then an authenticated callable grants the fixed `catCornerAddict` role. A refreshed token reveals `/cat-corner`, its utility-menu link, and the profile badge immediately; full administrators receive the same hub access without needing the role.

Cat Corner discovery metadata keeps normal posts and selected discovery posts in existing public lists. Non-discovery Cat posts remain readable by direct article URL but are omitted from the homepage, Blog archives, site search, taxonomy discovery, feeds, sitemap, and crawler-facing public lists. See `CAT_CORNER.md` for the complete content, SEO, deployment, and rollback contract.

## Search Flow

The header field is the single search input for the live-results experience. `SiteSearchDrawerComponent` is mounted inside that positioned header control so the result panel opens directly beneath it and matches its width and center from the `sm` breakpoint upward. On narrower screens it remains directly below the header but clamps to 12px viewport gutters to prevent overflow. Activating or typing in the header field opens the panel, which:

- streams recent content before a query is entered
- filters quick results directly from the header query without rendering a duplicate field
- links to the full `/search` page with the current query
- preserves Escape, backdrop, and close-button dismissal

The Blog index no longer renders a duplicate Search action because the global launcher remains visible in the sticky header.

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

## Direct Article Loading

`BlogDetailComponent` resolves a cold `/blog/:slug` entry through a bounded Firestore query for that published slug instead of waiting for the auth-aware full post collection. This keeps links opened from social apps, email, search, and other fresh browser sessions independent from the heavier archive/suggestion load. If the post is already in the repository cache, the detail route reuses it without issuing the additional query.

The direct query requires both `status == published` and the exact slug so Firestore rules can prove that drafts are not exposed. Firestore merges the existing automatic equality indexes; no document migration or composite-index deployment is required. The full published collection continues loading in the background for previous/next navigation and suggestions, while its loading or error state no longer blocks the primary article and cover image.

Rollback is limited to restoring the repository slug observable to the shared collection stream and restoring the detail page's shared repository loading state. No stored content or Firebase configuration changes are involved.

## Sticky Post Toolbar

`BlogStickyPostToolbarComponent` sits immediately after the full blog-detail header in the article grid. It scrolls into place naturally and then remains pinned beneath `SiteHeaderComponent` with the current cover thumbnail, truncated title, persistent read percentage and progress bar, a single Share control that fans provider actions leftward on hover/focus or tap, separate favorite/read-later controls, an explicit offline download/update/remove action, and a comments shortcut. The progress control lives inside the post rail instead of competing with the public header at the viewport's top edge. Progress is scoped to the rendered article-body container: the title/cover header remains at 0%, the final body block reaches 100%, and post navigation, tags/share controls, comments, suggested posts, and the site footer do not extend the reading distance. IndexedDB retains the greatest article-body percentage reached, marks the post read at 95%, and restores that status on later visits without moving the page automatically. Favorites and read later store only summary metadata; only the offline control downloads the article body. On mobile, the public header and post rail use shared 56px and 52px height tokens, and the rail keeps its thumbnail, title, status, and actions in one row. The section heading uses their combined 108px offset, so the three sticky
surfaces meet without gaps; the wider layout uses the same contract with 64px and 60px layers. The share fan preserves keyboard dismissal and reduced-motion behavior while keeping the reading rail compact. The comments shortcut targets a stable wrapper around the deferred comments block so anchor navigation triggers loading without losing the scroll destination. System and Reader Tools reduced-motion preferences switch the comments jump from smooth to immediate scrolling.

The detail grid, header, toolbar, table of contents, and article body use a single 24px inter-row rhythm at narrow and wide layouts. The header keeps its divider with 20px bottom padding, while the table-of-contents component contributes no outer margin of its own. This prevents parent grid gaps and child margins from stacking into 80px empty bands while preserving component reuse and sticky positioning.

Once the post header leaves the viewport, the reading rail exposes a scroll-to-top action using one `IntersectionObserver` rather than a continuous scroll listener. Only the active level-two content heading receives sticky positioning below the public header and reading rail; when the next heading reaches the pinned heading's lower edge, the previous heading immediately returns to normal flow. The pinned treatment also reduces heading type and vertical padding while leaving full-size headings in article flow. Heading anchor offsets account for both persistent rails on desktop and mobile.

On desktop, `BlogTableOfContentsComponent` owns the left reading rail and sticks below the public header rather than underneath it. The active heading link uses `aria-current="location"`, and the contents scroller recenters that link when article scroll position changes so long outlines continue following the reader without moving the page itself. TOC clicks scroll to each heading's natural document position rather than its current sticky rectangle, which preserves backward navigation after earlier headings have already pinned to the reading stack. A separate right rail renders post polls or future explicitly placed custom blocks above the existing taxonomy-ranked suggested posts. Below the desktop breakpoint both rails return to normal document flow without duplicating interactive components. See `BLOG_READING_RAILS.md` for placement, migration, and rollback details.

The shared reading utilities treat heading-only `TLDR` variants as a presentation alias for `Quick Summary (TL;DR)`. Stored Editor.js content remains unchanged, each historical anchor remains stable (`#tldr` or `#tl-dr`), and the table of contents uses the expanded label. The block renderer adds the plain-language meaning above the heading on hover or keyboard focus through an `aria-describedby` tooltip, so the explanation does not depend on editing individual posts or on pointer input alone.

Inline-left and inline-right image figures float only at the `sm` breakpoint and above so nearby paragraphs can wrap around them. Level-two and level-three article headings clear both float directions before starting a new section. This keeps the complete figure and caption in normal visual order and prevents the heading's opaque sticky-ready surface from painting over floated media that extends below the preceding paragraph text. Narrow viewports continue rendering inline media at the full article-column width without floats.

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

## Validation

Relevant regression coverage includes:

- `site-header.component.spec.ts` for logo/search/menu ownership and the single-input search contract
- `app.routes.spec.ts` for the temporary Labs redirect
- `reader-tools.component.spec.ts` for stable panel dimensions
- `offline-blog-post.service.spec.ts` for public snapshot validation and Cache Storage lifecycle
- `blog-article-library.service.spec.ts` for IndexedDB persistence, progress high-water state, completion, and independent list membership
- `article-library-control.component.spec.ts` for reading-state and list-management controls
- `offline-articles-control.component.spec.ts` and `blog-sticky-post-toolbar.component.spec.ts` for saved-content management controls
- `pwa-push.service.spec.ts` and `pwa-native-controls.component.spec.ts` for explicit opt-in, safe notification routing, subscription validation, and menu control states
- `blog-block-renderer.component.spec.ts` for linkable/sticky headings, inline media layouts, and float clearing before subsequent sections
- `blog-block-renderer.component.spec.ts`, `blog-embed.util.spec.ts`, `app-embed-block.tool.spec.ts`, and `blog-editorjs-adapter.spec.ts` for exact app URL trust, authoring conversion, sandbox attributes, outbound fallback, and custom HTML iframe removal
- `blog-suno-embed.util.spec.ts`, `suno-embed-block.tool.spec.ts`, `editor-js.component.spec.ts`, `blog-editorjs-adapter.spec.ts`, and `blog-block-renderer.component.spec.ts` for Suno URL trust, authoring registration, canonical round trips, sandbox attributes, responsive height, and external fallback
- `blog-block-placement.util.spec.ts`, `poll-block.tool.spec.ts`, `blog-editorjs-adapter.spec.ts`, `blog-post-rail.component.spec.ts`, and `blog-poll.component.spec.ts` for left/center/right ownership, migration-safe poll placement, compact rail presentation, and suggested-post reuse
- `blog-post-background.component.spec.ts` for decorative semantics, preload ownership, and failed-image fallback
- `blog-validation.util.spec.ts`, `blog-repository.service.spec.ts`, and `offline-blog-post.service.spec.ts` for the optional schema, normalization, and offline preservation contract
- `blog-repository.service.spec.ts` for cached and cold direct-slug article loading without a full-collection dependency
- browser checks for live result filtering, the compact menu, Reader Tools theme changes, desktop/mobile layout, and the `/labs` redirect
