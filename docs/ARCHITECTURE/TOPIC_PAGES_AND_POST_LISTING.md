# Topic Pages and Reusable Post Listing

## Public Identity Contract

The code-defined public topic hubs are permanent crawlable identities. Their IDs, slugs, eyebrows, titles, descriptions, summaries, published state, short labels, article-matching terms, and code-defined public resource paths cannot be replaced by a stale, renamed, or archived Firestore document. Firestore may overlay artwork, guide content, theme color/icon/map presentation, ordering, and additive resources; unknown CMS-created topics remain fully CMS-authoritative. A future public slug or publication-state change requires an explicit redirect/removal decision plus synchronized Angular, Functions, sitemap, `llms.txt`, and contract-test updates.

`lockDefaultTopicHubIdentity` applies that boundary before public and admin topic projections are sorted. Unknown CMS-created topics remain CMS-authoritative. `findTopicHubBySlug` resolves exact public slugs only; it no longer turns a valid server route into an undeclared client-only canonical.

Functions topic fallbacks use `topic-hub-public-identity.ts` as the single Functions-side source for slug, heading, description, matching terms, and sitemap paths. They render actual related article links with `CollectionPage` and `ItemList` data rather than a heading-only shell. Angular keeps its richer presentation contract in `topic-hubs.data.ts`; focused contracts assert the same public identities and reject undeclared aliases such as `weekly-updates`.

Topic resources may include same-origin printable PDFs, crawlable first-party resource pages, and current external authority references. `TopicGuideComponent` assigns a filename-bearing `download` attribute only to same-origin `.pdf` resources and opens HTTP(S) authority links in a separate, `noopener noreferrer` browsing context. The Drones & FPV hub links the Personal Aircraft Buyer Verification guide at `/resources/personal-aircraft-buyer-verification`; that guide supplies context, official starting points, related stories, and the direct PDF download. Functions mirror those paths in initial HTML so no-JavaScript readers and crawlers discover the same journey. PDF paths remain static assets: Firebase Hosting serves an existing file directly, while a missing PDF receives a real `404` instead of the Angular shell.

The Gadgets & Toys hub uses `/resources/gadget-usefulness-scorecard` as its featured **Is It Actually Useful?** framework. Both hydrated and crawler fallbacks state the same owned/tried/borrowed/research-only evidence labels plus problem-fit, proof, true-cost, everyday-friction, and support criteria. Prepared HOVERAir AQUA, Unitree R1, and Laundry Chair packages link the guide; their staged YouTube descriptions use the same canonical resource URL.

The Drone Flight Field Notes source lives at `scripts/build-drone-flight-field-notes-pdf.py`; its one generated public artifact lives at `public/downloads/captain-colin-drone-flight-field-notes.pdf`. The worksheet is a planning and debrief aid, not a comprehensive legal checklist. Its embedded official-source review date must be refreshed whenever its readiness language or FAA reference paths change.

The Personal Aircraft Buyer Verification source lives at `scripts/build-personal-aircraft-buyer-verification-pdf.py`; its generated artifact lives at `public/downloads/captain-colin-personal-aircraft-buyer-verification.pdf`. The guide and PDF organize research and do not determine legal classification, safety, transaction rights, or suitability. Angular and Functions must keep the guide's canonical, visible heading, caution language, source links, and reviewed date aligned; there is no Firestore migration.

The Gadget Usefulness Scorecard source lives at `scripts/build-gadget-usefulness-scorecard-pdf.py`; its generated artifact lives at `public/downloads/captain-colin-gadget-usefulness-scorecard.pdf`. The score is a documented conversation tool, not scientific product testing or buying advice. The route, Functions fallback, hub, packages, sitemap, search, `llms.txt`, and analytics identifier must change together if its public identity changes.

## Purpose

Topic pages are editorial entry points into published writing. They should identify the subject quickly, promote the most useful posts, and then provide deeper guide material without repeating the same stack of checklist cards on every route.

The post presentation system is shared across topic hubs, blog archives, taxonomy pages, and homepage writing sections so readers learn one card anatomy while each page can choose an appropriate layout rhythm.

The accepted visual references are:

- `docs/design/topic-page-desktop-concept.png`
- `docs/design/topic-page-mobile-concept.png`

## Component Inventory

### `BlogPostListingComponent`

Location: `src/app/features/blog/components/post-listing/blog-post-listing.component.ts`

This is a presentational, repository-free component. Its parent supplies already-filtered `BlogPostSummary` values and chooses one of five layouts:

- `list`: media-led editorial rows for the blog index, topic archives, and single-post features;
- `grid`: image-led cards for category and homepage discovery;
- `fan`: three overlapping feature cards on desktop that become readable media rows on mobile;
- `compact`: dense archive rows for tag results and other high-volume indexes;
- `editorial`: one lead story followed by compact rows for the homepage More to read section.

The component owns consistent post/category/tag links, image resolution, date metadata, heading level, excerpt/tag visibility, optional promotional excerpt clamping, topic appearance variables, and loading/error/empty states. Its default media treatment remains unchanged, while parents can opt a listing into `mediaPresentation="background"` to place each resolved post image behind that card's content. `titleMaxLength` bounds the displayed heading copy by character count, and `titleLineClamp` caps its rendered lines; both title controls are opt-in so archive consumers retain their full titles. Parents can expose the same code-native read action outside the `fan` layout with `showReadLink` and customize its label with `readLinkLabel`. `appearanceByPostId` supports mixed-topic feeds without moving topic lookup into the component.

The shared listing enables its reusable image scrubber by default; a specialized parent can opt out with `enableImagePreview="false"`. The repository summary projection extracts at most five unique in-body Image or Image Gallery entries in reading order, omits the resolved cover/thumbnail, and copies URL, alt, caption, and intrinsic-dimension metadata only. Homepage feeds intentionally retain full posts for hero/editorial decisions, so the listing derives and memoizes the same bounded projection from their blocks when summary metadata is absent. Search items now carry the same bounded in-memory projection from the full posts already loaded for indexing, allowing larger search artwork to share the interaction without a Firestore field. Preview URLs are not added to the DOM until a fine-pointer visitor intentionally rests on the linked thumbnail for 120 milliseconds or focuses it from the keyboard. The activated thumbnail expands above its existing layout position—modestly for
list/grid/editorial and search rows and more strongly for the compact featured-fan thumbnail—while the cover softens and the bounded set buffers. The active interior image then replaces it inside that
same enlarged frame. Horizontal pointer position changes the visible image, while leaving the thumbnail restores the normal artwork and exact original size. Keyboard readers use Left/Right Arrow for the same swaps and Escape to restore the cover; Enter and ordinary clicks retain the canonical article route. Coarse-pointer and no-hover devices keep the normal one-tap link and do not request preview image bytes. Failed image requests settle the buffer instead of leaving the cover in a permanent loading state.

The original single-layout `BlogPostCardComponent` remains preserved for compatibility, but current public archive and homepage consumers use `BlogPostListingComponent`.

### `PostImageScrubberComponent`

Location: `src/app/features/blog/components/post-image-scrubber/post-image-scrubber.component.ts`

This shared visual component owns the contained image-swap layer, active-frame transition, buffer treatment, load/error settlement events, and reduced-motion styling. `PostImagePreviewDirective` owns the interaction contract while each linked-thumbnail consumer decides when to instantiate the visual layer.

### `PostImagePreviewDirective`

Location: `src/app/features/blog/directives/post-image-preview.directive.ts`

This standalone directive centralizes the 120-millisecond fine-pointer delay, horizontal frame selection, focus activation, Arrow-key cycling, Escape/leave restoration, buffering state, accessible status relationship, and timer cleanup. `BlogPostListingComponent` and the advanced-search result rows apply the directive to their existing article links, so navigation, analytics, query parameters, and coarse-pointer behavior remain owned by the consuming surface while the preview behavior stays consistent.

### `HomeRecoveryBlogSectionsComponent`

Location: `src/app/components/main/home-recovery-blog-sections.component.ts`

The homepage recovery area is promotional rather than archival:

1. **Weekly Updates** filters the shared newest-first feed to the exact Weekly Updates category, caps it at three posts, and places the existing `fan` cards inside one teal, grid-backed update board. This listing opts into `mediaPresentation="background"`, `titleMaxLength`, and `titleLineClamp` so each desktop card uses its resolved post image behind a shorter, height-bounded title. The board's technical rail and keylines remain code-native rather than paper or cork decoration, while the primary route opens the same Weekly Updates category archive.
2. **Hospital lessons** excludes posts assigned to the Weekly Updates category taxonomy, caps hospital/medical matches at one post, and presents that article as a compact media-led feature beside the section introduction. A separate route opens the broader Recovery Planning topic for additional posts and planning resources.

Both safety notes remain visible. The deferred homepage placeholder mirrors the three-note board and one-post hospital feature so lazy rendering does not replace two generic archive lists with a materially different layout.

### `TopicHubComponent`

Location: `src/app/features/topics/topic-hub.component.ts`

The route component now composes the page in this order:

1. a cinematic topic hero with breadcrumb, title, concise summary, actions, and topic-specific scene rotation;
2. up to three prioritized posts in the image-backed `fan` layout, with each resolved post image remaining visible as a linked thumbnail;
3. remaining matching posts in the `list` layout;
4. an optional topic-owned companion surface, currently the latest Captain Colin videos on `drones-fpv`;
5. the supporting topic guide;
6. image-led related-topic navigation.

Featured CMS posts sort ahead of the otherwise newest-first repository order. Topic membership still uses legacy normalized term matching through `topic-post-matching.util.ts`; explicit post-to-topic IDs remain a future data-model improvement.

Topic listings keep each post visually identifiable. The featured `fan` opts into `mediaPresentation="background"`, pairing a full-width, center-cropped linked image panel with a subdued atmospheric reuse of the same resolved post image on desktop. The remaining `list` rows retain their standard linked image. Both presentations use `resolveBlogPostImage`, so a post-specific thumbnail is preferred before its cover-image fallback.

Both topic listing presentations inherit the bounded interior-image scrubber. This is a progressive visual enhancement: posts without usable in-body images remain unchanged, and the initial topic render requests only the normal post artwork.

### `TopicHubHeroComponent`

Location: `src/app/features/topics/components/topic-hub-hero/topic-hub-hero.component.ts`

The shared topic hero turns the existing topic artwork into a full-bleed editorial environment instead of a boxed side image. Each bootstrap topic receives its CMS-compatible primary artwork plus one checked-in companion scene. The component owns the crossfade, restrained Ken Burns drift, scene progress, direct scene selection, pause/resume control, page-visibility suspension, reduced-motion behavior, long-title scaling, mobile crop, and code-native section actions. `TopicHubComponent` retains route navigation and scroll ownership so the extraction does not change fragment behavior.

### `BlogTopicGuideComponent`

Location: `src/app/features/blog/components/topic-guide/blog-topic-guide.component.ts`

Published article pages end their reading content with one compact route to the strongest matching public topic. `selectPrimaryTopicHubForPost` scores exact normalized matches in taxonomy first, followed by tags, title, slug, and excerpt; equal scores use the public topic display order, title, and slug. This keeps the choice deterministic and prevents an incidental title mention from overriding an explicit category. Posts without a genuine match receive no generic topic card.

The guide remains outside `data-reading-content`, so it does not inflate reading-progress calculations. It uses the already published topic summary and route, creates no new Firestore relation, and remains backward-compatible with offline articles. Explicit post-to-topic IDs remain the preferred future model once the post schema has a controlled migration.

### `TopicGuideComponent`

Location: `src/app/features/topics/components/topic-guide/topic-guide.component.ts`

This component preserves the existing start-here asset, learning path, checklist, resources, recovery disclaimer, and any distinct featured project. It uses open numbered rows and compact routes instead of repeated card grids. A featured project is suppressed when its normalized title duplicates the start-here asset.

## Topic Artwork and Page Copy

`TopicHub` now supports two optional presentation fields:

```ts
heroImage?: {
  src: string;
  alt: string;
  width: number;
  height: number;
  objectPosition?: string;
};

pageCopy?: {
  featuredHeading: string;
  featuredDescription: string;
  archiveHeading: string;
  archiveDescription: string;
};
```

Default artwork is stored in `src/assets/images/topics/`:

- `ai-setup.webp` and `ai-setup-companion.webp`
- `recovery-planning.webp` and `recovery-planning-companion.webp`
- `angular-firebase-architecture.webp` and `angular-firebase-architecture-companion.webp`
- `labs-projects.webp` and `labs-projects-companion.webp`
- `gadgets-toys.webp` and `gadgets-toys-companion.webp`
- `drones-fpv.webp` and `drones-fpv-companion.webp`

The images are text-free 16:9 WebP assets. Alt text and intrinsic dimensions remain data, while UI labels stay code-native. `resolveTopicHubHeroImages` de-duplicates the resolved primary and stable bootstrap companion before the hero renders them.

## Firestore Migration

The presentation fields are intentionally optional. Existing Firestore topic documents remain valid and are not rejected by `isTopicHub`.

For the six bootstrap topics, `resolveTopicHubHeroImage` and `resolveTopicHubPageCopy` fall back to checked-in defaults by stable topic ID and then slug. `resolveTopicHubHeroImages` adds the code-owned companion scene without changing the Firestore document shape. Unknown topics receive generic post-section copy and no forced companion image; a CMS-created topic with one hero image therefore keeps a static hero.

When Firestore already contains some bootstrap topics, the repository merges only code defaults whose stable ID and slug are both absent. A matching default ID keeps its checked-in public slug, eyebrow, title, description, summary, short label, and matching terms so stale or renamed Firestore documents cannot change a crawlable route or reintroduce conflicting breadcrumb, CTA, guide, and archive labels after hydration. Firestore remains authoritative for publication status, ordering, theme colors/icons/map placement, artwork, guide content, and resources; an archived document therefore still stays out of public results. The Topic Manager's **Seed Missing Defaults** action refreshes the Firestore collection first and writes only the absent documents, so it can persist a new code default without resetting those supported customizations.

Bootstrap public slugs are code-owned canonical identities. An unexpected Firestore rename is ignored rather than exposed as a second route; unknown aliases resolve to the shared client 404 and receive explicit `noindex,follow` metadata after Angular navigation, matching the server-side unknown-route policy.

`drones-fpv` is the first topic-specific cross-channel hub. It reuses `YouTubeLatestVideosComponent` with its own heading, section ID, and `source_component=topic_drones_youtube` attribution. The component still loads the same read-only public feed callable and sends no video title, description, viewer identity, or account data to GA4.

The Topic Manager exposes the image path, alt text, dimensions, focal position, and topic-specific post-section language. Opening a legacy bootstrap topic populates the form from its fallback presentation data; saving the topic persists those fields to Firestore. Administrators can also use **Seed Missing Defaults** to persist only bootstrap documents that do not already exist.

No existing checklist, learning-path, featured-project, resource, route, or Firestore data is deleted. The redesign changes hierarchy and presentation only. Companion scenes are not yet editable in Topic Manager; replacing or expanding them is a code-and-asset change until a future bounded multi-image CMS field is designed.

The optional `BlogPostSummary.previewImages` field is derived in memory from existing canonical Editor.js blocks; it is not stored as a new Firestore field and requires no backfill. Legacy posts, posts with only cover artwork, and posts whose in-body media repeats the cover continue to render normally without image scrubbing.

## SEO and Deployment

Client topic metadata and Firebase Functions crawler metadata continue to use the resolved primary topic image. Companion scenes are decorative page media and do not change canonical or social-preview identity.

The cinematic hero, shared post-image-scrubber, and search-page preview changes require a Hosting deployment only. They change no Functions code, environment value, Firebase rule, Firestore document, or migration. The companion assets and Angular bundle must ship together.

## Accessibility and Responsive Contract

- Real headings, lists, links, dates, and image alt text remain code-native.
- The active hero scene is exposed as one labeled image region; duplicate slideshow images remain hidden from assistive technology.
- Parents select `h2` or `h3` card headings according to document context.
- Fan order is DOM order; keyboard focus does not depend on visual overlap.
- Interior-image previews are absent from the initial DOM, capped at five images after activation, announced as an indexed status to keyboard users, and controlled with Left/Right Arrow and Escape without replacing the article link.
- The swap remains clipped to the existing thumbnail, leaving stacked and vertical post layouts intact. Coarse-pointer/no-hover devices never activate it, and reduced-motion mode removes its scan, cover-buffer, and frame-transition animation while retaining direct selection on supported desktop input.
- At narrow widths the fan becomes normal media rows and the topic hero actions become full-width rule-separated links.
- Bootstrap topics rotate between two scenes every eight seconds, expose 44-pixel direct-selection targets plus pause/resume, pause when the document is hidden, and stop automatic rotation under `prefers-reduced-motion`.
- The homepage topic strip uses three readable columns on medium screens and six columns only when the viewport can support them; it remains a single-column list on narrow screens.
- The application-level viewport scroller keeps fragment targets 80 pixels below the top edge so the sticky public header does not cover topic and section headings reached through navigation links.
- The homepage update board keeps the same fan DOM/focus order; its rail and grid are decorative, and narrow viewports return the image-backed desktop cards to normal readable media rows while retaining the bounded title treatment.
- Reader high-contrast mode removes optional fan-card background images and restores solid theme-token text colors and
  surfaces so information and actions do not depend on overlays or image contrast.
- The Hospital lessons feature exposes one article action plus a separate Recovery Planning topic action, both with 44px minimum targets.
- Topic artwork sits behind the opening copy with targeted neutral black readability and edge fades; it receives no topic-color wash or full-image tint.
- Crossfade, Ken Burns drift, control animation, and other layout motion are removed for `prefers-reduced-motion`; readers can still select a static scene directly.
- Light mode derives a darker readable topic accent instead of using the pale dark-mode highlight directly.

## Rollback

Rollback is code-only: restore the previous topic hero template, remove the companion resolver and assets when no longer referenced, and redeploy Hosting. The optional Firestore fields remain backward-compatible. No Functions rollback or destructive Firestore migration is required.

The shared scrubber can be rolled back independently by defaulting `enableImagePreview` to false (or disabling it on individual listing consumers) and removing the derived `previewImages` summary projection, then redeploying Hosting. No stored post block, media asset, route, or index requires cleanup.

The homepage recovery promotion is also code-only. It requires no route, post, taxonomy, or Firestore migration; restoring the previous homepage template/list selections and redeploying Hosting is sufficient to roll it back.
