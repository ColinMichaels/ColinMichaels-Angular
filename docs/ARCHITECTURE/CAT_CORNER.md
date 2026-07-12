# Cat Corner

## Purpose

Cat Corner is a discoverable editorial club operated in Gretchen's voice. Readers enter by finding a reusable Gretchen Easter egg in a selected public post, signing in, and receiving the `catCornerAddict` Firebase Auth role. That role adds a profile badge and reveals the Cat Corner hub in the site menu. Full administrators retain the same hub access without requiring the badge role.

Cat Corner is intentionally a soft discovery gate, not a confidentiality boundary. Cat Corner articles and their existing blog media remain published through the normal public `posts` and Storage systems. The hub, menu, and normal discovery surfaces are selectively hidden, but a reader who knows an article URL can still open it.

## Content And Discovery Model

Posts continue to use the shared `BlogPost` and Editor.js block model. Optional metadata identifies Cat Corner behavior without backfilling existing content:

```ts
catCorner?: {
  enabled: boolean;
  discoveryPost: boolean;
}
```

- Posts without `catCorner.enabled` retain existing behavior.
- A discovery post behaves like an ordinary public post and may appear in the Blog, homepage, site search, taxonomy pages, feeds, sitemap, social workflows, and crawler-facing HTML.
- A non-discovery Cat Corner post remains readable at its direct `/blog/{slug}` URL but is omitted from ordinary listings, site search, feeds, sitemap, public fallback lists, and publish-promotion discovery. Its article metadata is `noindex,nofollow`.
- The authenticated `/cat-corner` hub lists every published Cat Corner post, including non-discovery posts.
- Draft, scheduled, and archived posts retain their existing CMS-only behavior.

The CMS owns two coupled controls: **Cat Corner post** and **Discovery post**. Disabling Cat Corner also disables discovery. Editors may insert the custom `catCornerUnlock` Editor.js block into any appropriate public article; it renders the shared Gretchen trigger rather than accepting an arbitrary external image.

## Unlock And Role Flow

1. A reader activates the keyboard-accessible Gretchen Easter egg.
2. `/cat-corner/unlock` uses the existing login return flow when no Firebase user is signed in.
3. The authenticated page calls `claimCatCornerAccess`. The callable accepts no role input, idempotently merges `roles.catCornerAddict: true` into the caller's custom claims, synchronizes the `/users/{uid}` role projection, and records a structured server log.
4. The client force-refreshes the Firebase ID token and role-aware UI state.
5. The success surface announces **You found Gretchen.**, displays the Cat Corner Addict badge, and links to the hub or the originating article.
6. The site menu and profile respond immediately to the refreshed claim. Repeated unlocks are safe and preserve every unrelated claim.

The unlock route is intentionally discoverable to a technical reader inspecting the client. It proves account intent, not possession of a cryptographic invitation. The callable can only grant the fixed non-administrative Cat Corner role.

## UI And Asset Contract

The accepted concepts live under `docs/design/cat-corner-*-concept.png`. The implementation keeps the existing public header and uses a Cat Corner-specific editorial system:

- true-white and neutral-dark surfaces with graphite text
- Gretchen-eye sage as the primary accent and restrained clay details
- editorial serif headings with disciplined sans-serif UI text
- open ruled sections and vertical story rows instead of a card grid
- the full transparent Gretchen cutout at `src/assets/images/cat-corner/gretchen-easter-egg.png` for metadata and future presentation needs, 720×960 PNG/WebP portrait derivatives for hub/unlock imagery (57 KB WebP with PNG fallback), and a 43 KB `gretchen-easter-egg-small.png` derivative for the reusable inline trigger
- paired light/dark treatments, working Reader Assistance text/spacing/high-contrast/reduced-motion preferences, keyboard focus, and responsive desktop/mobile composition

The hub renders real repository data and supplies loading, error, empty, featured-story, and latest-story states. No sample Cat Corner documents are seeded by the client.

## Deployment, Migration, And Rollback

No Firestore or Storage migration is required. Existing posts have no Cat Corner metadata and remain public. Existing accounts have no Cat Corner claim and retain their current menus.

Deploy Functions before Hosting so the unlock client cannot reference a missing callable. Then deploy the Angular Hosting build and verify ordinary, Cat Corner Addict, and full-admin accounts in the Firebase development preview. No Security Rules deployment is required for this soft-gate model.

Rollback may remove the trigger, routes, and menu without deleting content or claims. Optional metadata remains backwards-compatible. Existing `catCornerAddict` claims can be retained for a later relaunch or revoked through admin user management when intentionally ending membership.

## Validation

- Unit coverage: metadata defaults and normalization, public/discovery filtering, role recognition, guard behavior, menu/profile visibility, Editor.js round trips, callable idempotency, and unrelated-claim preservation.
- Functional coverage: guest login return, first unlock, repeated unlock, immediate menu appearance, admin access, direct non-discovery article access, and hidden public discovery surfaces.
- Visual coverage: desktop and mobile hub, unlock success, empty state, light/dark themes, keyboard focus, reduced motion, and browser console inspection.
- Required repository checks: `npm run build` and `npm run lint`, plus `npm run build:functions` and focused Angular/Functions tests.
