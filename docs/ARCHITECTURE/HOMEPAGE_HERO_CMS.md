# Homepage Hero CMS

## Route And Boundary

- Public renderer: `src/app/components/main/home-article-hero.component.ts`
- Admin route: `/admin/cms/homepage`
- Admin entry: `src/app/admin/cms/pages/homepage-hero/homepage-hero-manager.component.ts`
- Feature data layer: `src/app/features/homepage`
- Shared post selector: `src/app/features/homepage/utils/homepage-post-selection.util.ts`
- Firestore document: `homepageSettings/home`

The homepage hero remains part of the public website. The CMS manager is protected admin UI and must not move into
`core-os`.

## Runtime Contract

- The public hero reads `HomepageHeroRepositoryService.settings`.
- If Firestore is unavailable, the document is missing, the document is draft-only for anonymous readers, or there are
  no published slides, the renderer falls back to the previous static hero image and copy.
- Published slides are sorted by `sortOrder`, then creation date, then ID.
- The renderer resolves an ordered post gallery. Its lead is a valid CMS-selected post override, then the newest
  published post marked `featured`, then the newest published post when no feature flags exist. The remaining unique
  published posts follow in reverse chronological order. Multiple posts can remain featured; the resolver sorts by
  `publishedAt`, falls back to `updatedAt`, and never clears historical flags.
- The public hero renders exactly one gallery post at a time. Non-wrapping previous and next controls sit beneath the
  card, and each arrow is rendered only when a post exists in that direction. A polite position status announces the
  active title and exposes its one-based position without turning the gallery into an automatic carousel. When an
  endpoint removes the focused arrow, focus moves to the surviving control.
- When `useFeaturedPostBackground` is enabled and the gallery lead has `backgroundImage`, that image becomes the
  sole homepage hero background. It is centered, decorative, high-priority, and static; it suppresses slideshow
  rotation and Ken Burns motion while active. Navigating article cards does not replace this canonical background.
- The slideshow uses stacked image elements with opacity transitions. It does not use a third-party carousel package,
  and its published slides become fallbacks whenever the hero post has a custom background.
- Slides can individually opt into a subtle Ken Burns-style transform animation. The animation runs independently from
  the active slide class so crossfades do not restart transform keyframes, and the focal point drives the transform
  origin so the motion keeps the intended crop area anchored.
- When any published slide has Ken Burns motion enabled, the public renderer uses an effective crossfade of at least
  `1400ms` even if the saved fade setting is lower.
- Background rotation is decorative and automatic. The public homepage does not expose controls for the background
  slideshow; the visible controls navigate article cards only.
- Rotation and per-slide Ken Burns motion pause for hidden browser tabs and `prefers-reduced-motion: reduce`.
- Only the first effective hero image carries `data-site-preload-image`, preserving the public preloader's
  one-critical-image contract. An enabled post background owns this marker while it overrides the slideshow.
- If the post-background option is disabled, the post has no background, or the image fails to load, the renderer uses
  the published CMS slides, or the branded static image when no published slides are available. Changing the resolved
  post or background URL resets the failed candidate so it can be retried later.
- The gallery lead is excluded by ID from More writing instead of assuming it is the first repository row. Other recent
  gallery entries can still appear in that section.

## CMS Workflow

- CMS editors can update headline lines, summary copy, hero status, the optional selected-post override, slideshow
  timing, and slide metadata. Automatic mode always uses the newest featured post; older posts can remain marked.
- `Use featured post background` is an explicit, persisted opt-in. It is off by default; turning it off always restores
  the slideshow even when the resolved post has a background attached.
- The post editor's Full-screen Post Background control owns both article-route backgrounds and the optional homepage
  override. The homepage toggle must also be enabled. Removing that field, disabling the toggle, or unfeaturing the
  post restores the configured slideshow.
- Each slide exposes a Ken Burns motion toggle. Newly uploaded or manually added slides default to motion enabled,
  while older saved slides without the field normalize to motion disabled.
- Multi-image uploads use the existing `BlogMediaUploadService` with slug `homepage` and role `homepage-hero`.
- Uploaded images are optimized to WebP where supported by the existing client-side media optimizer.
- Editors can also add an already-hosted image URL manually.
- Slide removal only removes the slide from homepage settings. It does not delete Firebase Storage objects.

## Migration And Deployment

- Legacy `featuredPostMode: latest` settings normalize in memory to `featured`; no Firestore rewrite or post backfill
  is required. The `selected` mode remains a deliberate manual override.
- Existing homepage settings without `useFeaturedPostBackground` normalize to `false`, preserving their slideshow
  behavior without a Firestore rewrite.
- Existing post feature flags remain unchanged and can continue contributing to future search ranking and weighting.
- Existing posts without `backgroundImage` retain the CMS slideshow and branded fallback behavior.
- Deploy Angular Hosting and Firebase Functions together so the visible hero and crawler-facing homepage social image
  resolve the same post. No Firestore or Storage Rules change is required.
- Rollback is code-only: redeploy the previous Hosting and Functions versions together. Older builds safely ignore the
  additive `useFeaturedPostBackground` field, and saved `featured` or `selected` modes remain valid without data repair.
- As an immediate operational fallback before a rollback, disable `Use featured post background`; the published CMS
  slideshow or branded static image resumes without changing any post media.

## Security

- Firestore public reads are limited to `homepageSettings/home` when the document is missing or has `status:
  published`.
- Firestore list/create/update/delete access remains restricted to CMS content roles.
- Storage uploads reuse `cms/blog-media/{postSlug}/{assetRole}/{fileName}`, which is publicly readable and writable only
  by CMS/media roles.

## Validation

- `npm run build`
- `npm --prefix functions run build`
- `npm run lint`
- Run focused hero, selection, social-preview, validation, and Main integration tests.
- Verify `/` and `/admin/cms/homepage`.
- Check the post-background toggle off and on, a valid post background, failed-image fallback, first/middle/last article
  navigation states, single-post arrow suppression, desktop, tablet, mobile, reduced-motion, and hidden-tab pause
  behavior.
- Confirm the first rendered hero image still dismisses the public preloader.
