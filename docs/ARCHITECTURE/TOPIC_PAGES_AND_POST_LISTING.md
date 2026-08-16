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

The original single-layout `BlogPostCardComponent` remains preserved for compatibility, but current public archive and homepage consumers use `BlogPostListingComponent`.

### `HomeRecoveryBlogSectionsComponent`

Location: `src/app/components/main/home-recovery-blog-sections.component.ts`

The homepage recovery area is promotional rather than archival:

1. **Weekly Updates** filters the shared newest-first feed to the exact Weekly Updates category, caps it at three posts, and places the existing `fan` cards inside one teal, grid-backed update board. This listing opts into `mediaPresentation="background"`, `titleMaxLength`, and `titleLineClamp` so each desktop card uses its resolved post image behind a shorter, height-bounded title. The board's technical rail and keylines remain code-native rather than paper or cork decoration, while the primary route opens the same Weekly Updates category archive.
2. **Hospital lessons** excludes posts assigned to the Weekly Updates category taxonomy, caps hospital/medical matches at one post, and presents that article as a compact media-led feature beside the section introduction. A separate route opens the broader Recovery Planning topic for additional posts and planning resources.

Both safety notes remain visible. The deferred homepage placeholder mirrors the three-note board and one-post hospital feature so lazy rendering does not replace two generic archive lists with a materially different layout.

### `TopicHubComponent`

Location: `src/app/features/topics/topic-hub.component.ts`

The route component now composes the page in this order:

1. topic breadcrumb, title, concise summary, actions, and topic artwork;
2. up to three prioritized posts in the `fan` layout;
3. remaining matching posts in the `list` layout;
4. an optional topic-owned companion surface, currently the latest Captain Colin videos on `drones-fpv`;
5. the supporting topic guide;
6. image-led related-topic navigation.

Featured CMS posts sort ahead of the otherwise newest-first repository order. Topic membership still uses legacy normalized term matching through `topic-post-matching.util.ts`; explicit post-to-topic IDs remain a future data-model improvement.

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

- `ai-setup.webp`
- `recovery-planning.webp`
- `angular-firebase-architecture.webp`
- `labs-projects.webp`
- `gadgets-toys.webp`
- `drones-fpv.webp`

The images are text-free 16:9 WebP assets. Alt text and intrinsic dimensions remain data, while UI labels stay code-native.

## Firestore Migration

The presentation fields are intentionally optional. Existing Firestore topic documents remain valid and are not rejected by `isTopicHub`.

For the six bootstrap topics, `resolveTopicHubHeroImage` and `resolveTopicHubPageCopy` fall back to checked-in defaults by stable topic ID and then slug. Unknown topics receive generic post-section copy and no forced image.

When Firestore already contains some bootstrap topics, the repository merges only code defaults whose stable ID and slug are both absent. A matching default ID keeps its checked-in public slug, eyebrow, title, description, summary, short label, and matching terms so stale or renamed Firestore documents cannot change a crawlable route or reintroduce conflicting breadcrumb, CTA, guide, and archive labels after hydration. Firestore remains authoritative for publication status, ordering, theme colors/icons/map placement, artwork, guide content, and resources; an archived document therefore still stays out of public results. The Topic Manager's **Seed Missing Defaults** action refreshes the Firestore collection first and writes only the absent documents, so it can persist a new code default without resetting those supported customizations.

Bootstrap public slugs are code-owned canonical identities. An unexpected Firestore rename is ignored rather than exposed as a second route; unknown aliases resolve to the shared client 404 and receive explicit `noindex,follow` metadata after Angular navigation, matching the server-side unknown-route policy.

`drones-fpv` is the first topic-specific cross-channel hub. It reuses `YouTubeLatestVideosComponent` with its own heading, section ID, and `source_component=topic_drones_youtube` attribution. The component still loads the same read-only public feed callable and sends no video title, description, viewer identity, or account data to GA4.

The Topic Manager exposes the image path, alt text, dimensions, focal position, and topic-specific post-section language. Opening a legacy bootstrap topic populates the form from its fallback presentation data; saving the topic persists those fields to Firestore. Administrators can also use **Seed Missing Defaults** to persist only bootstrap documents that do not already exist.

No existing checklist, learning-path, featured-project, or resource data is deleted. The redesign changes hierarchy and presentation only.

## SEO and Deployment

Client topic metadata uses the resolved topic image. Firebase Functions keeps its static route classification, but each default topic now maps to the same local image for server-rendered Open Graph and Twitter metadata.

Because `functions/src/index.ts` changed, deployment requires both Hosting assets and Functions so crawler metadata cannot point at an image that is absent from the deployed asset set. The existing deploy-scope workflow already pairs a Functions deploy with Hosting.

## Accessibility and Responsive Contract

- Real headings, lists, links, dates, and image alt text remain code-native.
- Parents select `h2` or `h3` card headings according to document context.
- Fan order is DOM order; keyboard focus does not depend on visual overlap.
- At narrow widths the fan becomes normal media rows and the topic hero actions become full-width rule-separated links.
- The homepage topic strip uses three readable columns on medium screens and six columns only when the viewport can support them; it remains a single-column list on narrow screens.
- The application-level viewport scroller keeps fragment targets 80 pixels below the top edge so the sticky public header does not cover topic and section headings reached through navigation links.
- The homepage update board keeps the same fan DOM/focus order; its rail and grid are decorative, and narrow viewports return the image-backed desktop cards to normal readable media rows while retaining the bounded title treatment.
- Reader high-contrast mode removes optional fan-card background images and restores solid theme-token text colors and
  surfaces so information and actions do not depend on overlays or image contrast.
- The Hospital lessons feature exposes one article action plus a separate Recovery Planning topic action, both with 44px minimum targets.
- Topic artwork never sits behind text and receives no color overlay.
- Layout motion is removed for `prefers-reduced-motion`.
- Light mode derives a darker readable topic accent instead of using the pale dark-mode highlight directly.

## Rollback

Rollback is code-only: restore the previous topic template and archive consumers, revert the Functions image mapping, and redeploy Hosting plus Functions. The optional Firestore fields and checked-in image assets are backward-compatible and can remain without affecting older code. No destructive Firestore migration is required.

The homepage recovery promotion is also code-only. It requires no route, post, taxonomy, or Firestore migration; restoring the previous homepage template/list selections and redeploying Hosting is sufficient to roll it back.
