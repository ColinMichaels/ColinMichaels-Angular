# Topic Pages and Reusable Post Listing

## Purpose

Topic pages are editorial entry points into published writing. They should identify the subject quickly, promote the most useful posts, and then provide deeper guide material without repeating the same stack of checklist cards on every route.

The post presentation system is shared across topic hubs, blog archives, taxonomy pages, and homepage writing sections so readers learn one card anatomy while each page can choose an appropriate layout rhythm.

The accepted visual references are:

- `docs/design/topic-page-desktop-concept.png`
- `docs/design/topic-page-mobile-concept.png`

## Component Inventory

### `BlogPostListingComponent`

Location: `src/app/features/blog/components/post-listing/blog-post-listing.component.ts`

This is a presentational, repository-free component. Its parent supplies already-filtered `BlogPostSummary` values and chooses one of four layouts:

- `list`: media-led editorial rows for the blog index, topic archives, and recovery sections;
- `grid`: image-led cards for category and homepage discovery;
- `fan`: three overlapping feature cards on desktop that become readable media rows on mobile;
- `compact`: dense archive rows for tag results and other high-volume indexes.

The component owns consistent post/category/tag links, image resolution, date metadata, heading level, excerpt/tag visibility, topic appearance variables, and loading/error/empty states. `appearanceByPostId` supports mixed-topic feeds without moving topic lookup into the component.

The original single-layout `BlogPostCardComponent` remains preserved for compatibility, but current public archive and homepage consumers use `BlogPostListingComponent`.

### `TopicHubComponent`

Location: `src/app/features/topics/topic-hub.component.ts`

The route component now composes the page in this order:

1. topic breadcrumb, title, concise summary, actions, and topic artwork;
2. up to three prioritized posts in the `fan` layout;
3. remaining matching posts in the `list` layout;
4. the supporting topic guide;
5. image-led related-topic navigation.

Featured CMS posts sort ahead of the otherwise newest-first repository order. Topic membership still uses legacy normalized term matching through `topic-post-matching.util.ts`; explicit post-to-topic IDs remain a future data-model improvement.

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

The images are text-free 16:9 WebP assets. Alt text and intrinsic dimensions remain data, while UI labels stay code-native.

## Firestore Migration

The presentation fields are intentionally optional. Existing Firestore topic documents remain valid and are not rejected by `isTopicHub`.

For the five bootstrap topics, `resolveTopicHubHeroImage` and `resolveTopicHubPageCopy` fall back to checked-in defaults by stable topic ID and then slug. Stable-ID matching protects renamed CMS slugs. Unknown topics receive generic post-section copy and no forced image.

When Firestore already contains some bootstrap topics, the repository merges only code defaults whose stable ID and slug are both absent. This lets a newly shipped topic appear immediately without replacing CMS-authored copies of existing topics. A matching archived document remains authoritative and keeps that topic out of public results. The Topic Manager's **Seed Missing Defaults** action refreshes the Firestore collection first and writes only the absent documents, so it can persist a new code default without resetting customized topics or renamed slugs.

The same stable-ID resolver keeps an old bootstrap slug valid after a CMS rename and replaces it with the topic's current canonical slug once published topic data has loaded. This preserves inbound links instead of turning a content rename into a 404.

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
- Topic artwork never sits behind text and receives no color overlay.
- Layout motion is removed for `prefers-reduced-motion`.
- Light mode derives a darker readable topic accent instead of using the pale dark-mode highlight directly.

## Rollback

Rollback is code-only: restore the previous topic template and archive consumers, revert the Functions image mapping, and redeploy Hosting plus Functions. The optional Firestore fields and checked-in image assets are backward-compatible and can remain without affecting older code. No destructive Firestore migration is required.
