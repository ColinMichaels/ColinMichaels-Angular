# Homepage Hero CMS

## Route And Boundary

- Public renderer: `src/app/components/main/home-article-hero.component.ts`
- Admin route: `/admin/cms/homepage`
- Admin entry: `src/app/admin/cms/pages/homepage-hero/homepage-hero-manager.component.ts`
- Feature data layer: `src/app/features/homepage`
- Firestore document: `homepageSettings/home`

The homepage hero remains part of the public website. The CMS manager is protected admin UI and must not move into
`core-os`.

## Runtime Contract

- The public hero reads `HomepageHeroRepositoryService.settings`.
- If Firestore is unavailable, the document is missing, the document is draft-only for anonymous readers, or there are
  no published slides, the renderer falls back to the previous static hero image and copy.
- Published slides are sorted by `sortOrder`, then creation date, then ID.
- The slideshow uses stacked image elements with opacity transitions. It does not use a third-party carousel package.
- Slides can individually opt into a subtle Ken Burns-style transform animation. The focal point also drives the
  transform origin so the motion keeps the intended crop area anchored.
- Rotation is decorative and automatic. The public homepage does not expose slideshow controls.
- Rotation and per-slide Ken Burns motion pause for hidden browser tabs and `prefers-reduced-motion: reduce`.
- Only the first hero slide carries `data-site-preload-image`, preserving the public preloader's one-critical-image
  contract.
- Featured article selection falls back in this order: CMS-selected post, first published post marked `featured`, newest
  published post.

## CMS Workflow

- CMS editors can update headline lines, summary copy, hero status, featured article mode, slideshow timing, and slide
  metadata.
- Each slide exposes a Ken Burns motion toggle. Newly uploaded or manually added slides default to motion enabled,
  while older saved slides without the field normalize to motion disabled.
- Multi-image uploads use the existing `BlogMediaUploadService` with slug `homepage` and role `homepage-hero`.
- Uploaded images are optimized to WebP where supported by the existing client-side media optimizer.
- Editors can also add an already-hosted image URL manually.
- Slide removal only removes the slide from homepage settings. It does not delete Firebase Storage objects.

## Security

- Firestore public reads are limited to `homepageSettings/home` when the document is missing or has `status:
  published`.
- Firestore list/create/update/delete access remains restricted to CMS content roles.
- Storage uploads reuse `cms/blog-media/{postSlug}/{assetRole}/{fileName}`, which is publicly readable and writable only
  by CMS/media roles.

## Validation

- `npm run build`
- `npm run lint`
- Verify `/` and `/admin/cms/homepage`.
- Check desktop, tablet, mobile, reduced-motion, and hidden-tab pause behavior.
- Confirm the first rendered hero image still dismisses the public preloader.
