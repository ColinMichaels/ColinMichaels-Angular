# Homepage Editorial Feature CMS

## Route And Boundary

- Public renderer: `src/app/components/main/home-article-hero.component.ts`
- Admin route: `/admin/cms/homepage`
- Admin entry: `src/app/admin/cms/pages/homepage-hero/homepage-hero-manager.component.ts`
- Feature data layer: `src/app/features/homepage`
- Shared post selector: `src/app/features/homepage/utils/homepage-post-selection.util.ts`
- Firestore document: `homepageSettings/home`

The publication-first feature remains part of the public website. The CMS manager is protected admin UI and remains
outside `core-os`.

## Public Runtime Contract

- The stable creator promise is the homepage `h1`; the active article title is a visible `h2`.
- A valid CMS-selected post remains an explicit editorial override. Automatic mode otherwise limits the lead and
  rotation to published stories whose title, excerpt, slug, or taxonomy matches the gadget, useful-tech, creator,
  software, camera, project, robotics, or FPV promise. The newest matching featured post leads, then the newest
  matching post when no matching feature flag exists. If the corpus has no promise-matched post, the selector falls
  back to the existing published-post order instead of leaving the hero empty.
- The rotation contains at most six unique promise-matched stories. The complete corpus remains available through
  More to read and the blog archive; unrelated recovery posts do not automatically replace the first-screen promise.
- The first-screen exploration row links to the two core topic journeys, the canonical Captain Colin subscription
  confirmation flow, and Colin's profile. Subscription selection records only the fixed channel ID, bounded
  `subscribe` method, and `homepage_youtube` source; it sends no visitor identity or article copy.
- The public feature renders one post at a time with its excerpt, date, calculated reading time, and article link.
  Non-wrapping previous and next controls preserve the existing post gallery and focus handoff. The redundant curator
  row is omitted because authorship remains available on the article and its other listing surfaces.
- When at least two posts are available, the active story advances every 30 seconds and wraps from the final story to
  the lead. Manual navigation restarts the 30-second interval. Rotation pauses while the page is hidden, while the hero
  contains keyboard focus, when the reader presses the visible pause control, and initially for readers who
  prefer reduced motion; the same control can explicitly resume it.
- The feature has two simultaneous image roles. `backgroundImage` fills a decorative, full-bleed backdrop under a dark
  readability scrim, while the normal post image remains sharp in the large linked media panel beside the semantic
  title and metadata.
- When `backgroundImage` is absent, the normal post image is reused as the backdrop with heavy blur, darkening, and
  overscan so baked-in cover text cannot compete with the hero copy. The linked panel remains unblurred.
- The published legacy slide pool supplies the final backdrop and panel placeholder only when neither the dedicated
  background nor the normal post image works. If no published CMS slide exists, the bundled default slide supplies
  that final placeholder.
- The legacy slide pool starts at a deterministic hash of the post ID or slug. A post therefore keeps the same
  apparently random fallback between visits, while different posts can begin with different images. Slides advance
  only when an image fails; they never rotate while a story is displayed.
- A failed image advances to the next source. Changing the active post clears the failure set so an updated source can
  be retried.
- The first working backdrop is eager, high priority, decorative, and owns `data-site-preload-image`. The linked panel
  is also eager and retains a stable aspect ratio to avoid layout shift.
- Legacy slides no longer rotate inside the homepage feature. The independent, opt-in Screen Saver launcher remains
  in the application shell and can still present those same published slides in its full-viewport viewer.
- The active post remains excluded by ID from More to read. Other posts in the focused feature gallery may still appear there.
- Daily Discovery remains immediately below the feature and continues to transfer active play into the persistent
  public-shell overlay.

## Editorial Image Contract

The optional `BlogPost.backgroundImage` is now labelled **Editorial Feature / Post Background** in the post editor.
It remains the same additive field used by blog-detail backgrounds; no second homepage image field is introduced.

For a strong homepage crop, attach a clean landscape source at least 1920 pixels wide, without a baked-in title,
button, date, or other essential text. Keep important subjects away from the extreme edges. The normal post image
remains required by the existing workflow, stays visible in the linked panel, and becomes the blurred backdrop only
when the dedicated editorial background is absent.

## CMS Workflow

- CMS roles can choose automatic featured-post selection or an explicit published post at `/admin/cms/homepage`.
- The current public media roles are informational in Featured Article. The existing `useFeaturedPostBackground` field
  remains editable as **Legacy client: prefer post background** under Legacy Hero Settings for older clients and code
  rollback; it does not alter the current renderer.
- The post editor owns cover and editorial media selection, upload, preview, and detach actions. Detaching does not
  delete the reusable media asset.
- Legacy headline, summary, timing, focal-point, and motion fields remain editable and stored for older clients and
  rollback. Published slide images continue to supply the optional Screen Saver and the current homepage's stable
  post-specific fallback pool.
- The existing save validator still requires at least one published legacy slide before the settings document can be
  published. Slide removal only changes homepage settings and never deletes Firebase Storage objects.

## Homepage Composition

The public route now reads as an editorial publication rather than a personal splash page:

1. featured article and image;
2. compact Daily Discovery prompt;
3. More to read article listing with the existing Continue Reading state;
4. compact topic directory;
5. latest Captain Colin videos with channel and subscription actions;
6. existing recovery collections;
7. recommendations, concise Colin Michaels profile, social sharing, and footer surfaces.

The `HomeEditorialAboutComponent` is homepage-specific UI. Shared post cards remain in
`BlogPostListingComponent`, whose additive `editorial` layout changes presentation without changing repositories,
routes, or stored post data.

## Migration, Deployment, And Rollback

- No Firestore, Storage, Function, Security Rule, or post migration is required.
- Existing settings and post feature flags remain valid. Legacy `featuredPostMode: latest` still normalizes in memory
  to `featured`.
- Existing settings without `useFeaturedPostBackground` continue to normalize to `false` for older-client and
  rollback compatibility; the current renderer does not read the field when ordering media.
- Existing `backgroundImage`, slide, copy, timing, and motion values are preserved unchanged. The optional Screen
  Saver therefore needs no migration.
- Deployment is Angular Hosting only for this presentation change.
- Code rollback restores the previous full-screen slideshow renderer from the same saved data. Because no field is
  removed or repurposed, rollback requires no content repair.
- For an immediate image-source adjustment without rollback, update the post's editorial asset or normal post image.
  Published fallback slides matter only when both are unavailable; reordering or changing that pool can change the
  deterministic per-post placeholder.

## Security

- Firestore public reads remain limited to the published `homepageSettings/home` document.
- Firestore list/create/update/delete access remains restricted to `CMS_ACCESS_ROLES`.
- Media upload and finalization retain their existing authenticated CMS/media boundaries.

## Validation

- Run focused homepage, listing, Continue Reading, header, Admin Guide, manager, and Main integration tests.
- Run `npm run build` and `npm run lint`.
- Verify `/` at desktop and mobile widths, including article navigation, failure fallback, Daily Discovery, Continue
  Reading, topic links, About links, dark/light theme behavior, reduced motion, and browser console status.
- Verify `/admin/cms/homepage` and `/admin/guide#update-the-homepage-hero` with an allowed CMS role; confirm a viewer
  cannot receive the guide entry.
