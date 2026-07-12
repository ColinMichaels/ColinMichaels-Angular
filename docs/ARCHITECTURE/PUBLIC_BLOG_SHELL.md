# Public Blog Shell

## Purpose

The public shell treats the blog as the primary content destination while keeping the portfolio homepage available at `/`. It removes repeated text navigation and gives search, reading preferences, and account utilities clear ownership.

## Header Contract

`SiteHeaderComponent` renders three responsive regions:

- the Colin Michaels logo, which always routes to `/`
- a rounded `Search` field that opens and filters the existing live-results drawer
- compact utilities: an optional post-list shortcut and one site/account menu

The utility menu owns links to All Posts and OS, install discovery, and the role-aware account/admin controls supplied by `SiteAuthControlsComponent`. Personal reading-library, saved-offline, notification, native-device, and storage settings live on the protected Profile page instead of expanding the global menu. On narrow screens the post-list shortcut is hidden because the same destination remains available inside the menu.

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

## Labs Pause

Labs code is preserved under `src/app/labs`, but its public entry points are intentionally paused:

- `/labs` redirects to `/blog`
- the header, homepage Labs promotion, blog footer, and static search items omit Labs
- existing experimental components are not deleted or moved
- `/background` remains available as an existing standalone route

Re-enabling Labs should restore the route component and selected discovery links only after the section redesign is ready.

## Reader Tools

Reader Tools remains available on public reading routes and owns the persisted light/dark theme action alongside text size, spacing, contrast, and reduced-motion controls. Its current-status readout uses a prominent fixed-height treatment, and the panel reserves stable width and help-text height so hover/focus descriptions cannot shift controls under the pointer.

## Profile Controls

The protected `/profile` route is the management surface for device-local reader data and capability-gated app preferences. It groups reading history, favorites, read later, offline article removal, Web Push opt-in, native share/fullscreen/wake-lock actions, and storage protection without changing the underlying browser-local storage boundaries. Empty reading and offline lists remain visible there so users can discover where future saved items will be managed.

## Sticky Post Toolbar

`BlogStickyPostToolbarComponent` sits immediately after the full blog-detail header in the article grid. It scrolls into place naturally and then remains pinned beneath `SiteHeaderComponent` with the current cover thumbnail, truncated title, persistent read percentage and progress bar, a single Share control that fans provider actions leftward on hover/focus or tap, separate favorite/read-later controls, an explicit offline download/update/remove action, and a comments shortcut. The progress control lives inside the post rail instead of competing with the public header at the viewport's top edge. Progress is scoped to the rendered article-body container: the title/cover header remains at 0%, the final body block reaches 100%, and post navigation, tags/share controls, comments, suggested posts, and the site footer do not extend the reading distance. IndexedDB retains the greatest article-body percentage reached, marks the post read at 95%, and restores that status on later visits without moving the page automatically. Favorites and read later store only summary metadata; only the offline control downloads the article body. On mobile, the public header and post rail use shared 56px and 52px height tokens, and the rail keeps its thumbnail, title, status, and actions in one row. The section heading uses their combined 108px offset, so the three sticky
surfaces meet without gaps; the wider layout uses the same contract with 64px and 60px layers. The share fan preserves keyboard dismissal and reduced-motion behavior while keeping the reading rail compact. The comments shortcut targets a stable wrapper around the deferred comments block so anchor navigation triggers loading without losing the scroll destination. System and Reader Tools reduced-motion preferences switch the comments jump from smooth to immediate scrolling.

Once the post header leaves the viewport, the reading rail exposes a scroll-to-top action using one `IntersectionObserver` rather than a continuous scroll listener. Only the active level-two content heading receives sticky positioning below the public header and reading rail; when the next heading reaches the pinned heading's lower edge, the previous heading immediately returns to normal flow. The pinned treatment also reduces heading type and vertical padding while leaving full-size headings in article flow. Heading anchor offsets account for both persistent rails on desktop and mobile.

On desktop, `BlogTableOfContentsComponent` sticks below the public header rather than underneath it. The active heading link uses `aria-current="location"`, and the contents scroller recenters that link when article scroll position changes so long outlines continue following the reader without moving the page itself. TOC clicks scroll to each heading's natural document position rather than its current sticky rectangle, which preserves backward navigation after earlier headings have already pinned to the reading stack.

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
- `blog-post-background.component.spec.ts` for decorative semantics, preload ownership, and failed-image fallback
- `blog-validation.util.spec.ts`, `blog-repository.service.spec.ts`, and `offline-blog-post.service.spec.ts` for the optional schema, normalization, and offline preservation contract
- browser checks for live result filtering, the compact menu, Reader Tools theme changes, desktop/mobile layout, and the `/labs` redirect
