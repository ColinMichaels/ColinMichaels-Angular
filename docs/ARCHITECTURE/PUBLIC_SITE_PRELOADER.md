# Public Site Preloader

## Route And Boundary

- Public shell bootstrap: `src/index.html`
- Angular coordinator: `src/app/shared/site-loader/site-preloader.service.ts`
- App entry wiring: `src/app/app.component.ts`
- Marker attribute: `[data-site-preload-image]`
- Browser hook: `window.__cmDismissInitialSiteLoader(reason?: string)`

The preloader belongs to the public website shell and shared startup layer. It does not replace the reusable `core-os` boot screen and should not be moved into `src/app/core-os`.

## Runtime Contract

The initial loader is rendered as static HTML and inline CSS before Angular and Tailwind are available. This masks the brief unstyled page render while the app, route, critical fonts, and one above-the-fold image settle.

Dismissal is coordinated by `SitePreloaderService` after:

- the initial route starts settling,
- Angular reports the app as stable,
- two animation frames have elapsed,
- `document.fonts.ready` resolves or times out,
- the first `[data-site-preload-image]` decodes or times out.

The inline document keeps an absolute failsafe so the overlay cannot trap visitors if Angular fails to boot.

## Component Inventory

- `#cm-initial-loader`: static overlay in `index.html` with near-black background, brand lockup, status labels, progress rail, postcard cards, and signal sweep.
- `SitePreloaderService`: browser-only startup coordinator that waits for app stability, route readiness, font readiness, critical image decode, and minimum visible timing before dismissing the overlay.
- `AppComponent`: starts the preloader service from the shared site shell entry.
- Homepage hero image: first public landing image marked as the route's critical preload image. An enabled resolved
  featured-post background owns the marker while it overrides the slideshow; otherwise the first rendered CMS/default
  slide owns it.
- Blog detail cover image: article cover marked as the route's critical preload image.
- Tailwind preview utility styles: converted away from broad generated-class safelisting so production CSS remains bounded.

## Timing Defaults

- Minimum visible time: `650ms`
- Normal maximum wait: `2500ms`
- Inline absolute failsafe: `4500ms`
- Font readiness cap: `1200ms`
- Critical image marker wait: `350ms`
- Critical image decode cap: `900ms`

These values are intentionally short. Existing blog skeletons, deferred homepage placeholders, and lazy image loading remain responsible for below-the-fold or late content.

## Migration Notes

- Add `[data-site-preload-image]`, explicit dimensions, and `decoding="async"` only to one above-the-fold image per public route when that route should participate in startup masking.
- Keep lower-priority post grids, related posts, and below-the-fold media lazy-loaded.
- Do not add animation libraries, Lottie payloads, generated image assets, or Core OS boot dependencies to this loader.
- If a future route should not show the public loader, add it to the inline excluded-route list in `index.html`.
- If generated Tailwind preview classes are needed for debugging, use `TAILWIND_INCLUDE_GENERATED_PREVIEW_CLASSES=true`; production builds should leave the broad safelist disabled.

## Validation

- `npm run build`
- `npm run lint`
- Verify `/`, `/blog`, one `/blog/:slug`, `/admin`, and `/boot`.
- Check desktop, tablet, mobile, reduced-motion, and slow-network behavior.
- Confirm `#cm-initial-loader` is removed from the DOM after dismissal.
