# Mobile PWA Foundation

## Purpose

The Progressive Web App foundation makes the public ColinMichaels.com shell installable, version-aware, and resilient to a lost connection without mixing PWA lifecycle logic into public feature components or the reusable Core OS framework.

The foundation does not introduce offline CMS editing, push notifications, saved-article downloads, background sync, or a mobile Core OS shell. Those capabilities require separate data, permission, and platform work.

## Architecture

Shared browser and service-worker lifecycle code lives under `src/app/shared/pwa`:

- `PwaInstallService` captures Chromium's install prompt, detects installed display mode, and provides platform-neutral manual instructions when no programmatic prompt exists.
- `PwaNetworkService` exposes browser online/offline state as Angular signals.
- `PwaUpdateService` translates Angular service-worker version and unrecoverable-state events into explicit reload controls.
- `PwaNativeControlsService` adapts Web Share, Fullscreen, and Screen Wake Lock behind capability signals and safe user-gesture methods.
- `PwaStorageService` reports origin storage estimates and allows a user to request persistent storage protection where the browser supports it.
- `PwaInstallControlComponent` adds a compact install action to the existing public utility menu.
- `PwaNativeControlsComponent` adds only the operating-system controls supported by the current device to the same utility menu.
- `PwaStatusComponent` surfaces offline, update-ready, and refresh-required states without changing individual page components.

`app.config.ts` registers Angular's generated `ngsw-worker.js` only outside development mode. Production builds process the root `ngsw-config.json` file.

## Cache Policy

The initial worker uses two asset groups:

1. `app-shell` prefetches versioned JavaScript/CSS, the HTML entry point, local fonts, and install icons. The JavaScript set includes lazy route bundles because a cold offline Angular navigation cannot identify and fetch a missing route bundle.
2. `public-images-and-documents` lazily caches ordinary local images and public static documents after they are requested.

Audio and video extensions are intentionally absent. The repository contains large media files that require user-visible, quota-aware download controls before they should be retained for offline use.

No Firebase API response is configured as a service-worker data group. Firestore remains memory-backed, so the worker cannot persist authenticated CMS documents by accident.

## Navigation Boundaries

Online public navigations use the `freshness` strategy so Firebase's `renderSeoHtml` function remains the preferred response. The cached Angular entry point is the network-failure fallback.

The following navigation families are excluded from the cached application-shell fallback:

- `/admin` and descendants
- `/blog/preview/*`
- authentication/profile routes
- protected Core OS routes
- external redirect routes

Excluding navigation fallback does not make public JavaScript source private; it prevents the worker from presenting a cached application shell as if protected, tokenized, or external content were available offline.

## Install and Mobile Behavior

The linked web manifest defines a stable root identity, standalone display, launch colors, public shortcuts, and the existing application icons. iOS installation continues through Share > Add to Home Screen. Browsers that expose `beforeinstallprompt` receive a direct install action.

`viewport-fit=cover`, safe-area padding on the sticky public header, a dynamic viewport-height route frame, and bottom safe-area body padding provide the initial edge-to-edge layout contract. The shared fullscreen control is progressive; individual immersive surfaces still need separate orientation policies.

## Native Controls and Storage

The public utility menu progressively exposes these controls:

- **Share page** opens the operating system share sheet with the current document title, canonical URL, and description. Closing the sheet is treated as a normal cancellation rather than an error.
- **Full screen** enters or exits browser fullscreen where the Fullscreen API is allowed. Installed iOS apps rely on their standalone display mode because iOS does not expose the same API.
- **Keep awake** requests a screen wake lock for long-form reading. The lock is released when the user turns it off or leaves the page, and it is reacquired after a temporary visibility-driven release only while the user preference remains active.
- **Protect storage** requests a persistent origin storage bucket and reports the browser's actual usage/quota estimate. Persistence makes cached assets less likely to be evicted; it does not download uncached Firestore posts or media.

Unsupported controls are omitted instead of replaced by non-functional imitations. The utility menu uses compact two-column touch targets and becomes internally scrollable when its contents exceed the mobile viewport.

## Hosting and Updates

Firebase Hosting keeps hashed Angular bundles immutable. The generated service-worker scripts, `ngsw.json`, and web manifest use `no-cache, no-store, must-revalidate` so an old worker script or manifest cannot be pinned by the generic asset policy.

When Angular reports `VERSION_READY`, the app offers an explicit Update action. Activation is immediately followed by a full reload so old and new lazy chunks are never mixed in one running application. An unrecoverable worker state displays a stronger Refresh action.

## Validation

Every PWA change should validate:

- `npm run build`
- `npm run lint`
- focused PWA unit tests
- `ngsw.json`, `ngsw-worker.js`, and the linked manifest in production output
- public desktop and mobile rendering
- an offline production reload after the worker controls the page
- no cached navigation fallback for admin, preview, auth, or protected OS routes

Real iOS Home Screen installation and Android install prompting remain required release checks because desktop emulation cannot reproduce their complete operating-system behavior.

Web Share, fullscreen, wake-lock release/reacquisition, and persistent-storage decisions also require physical-device checks. Browsers may deny individual capabilities based on installation mode, secure-context state, permissions, battery policy, or engagement heuristics.

## Rollback

If worker behavior causes a production regression, deploy Angular's safety worker at the same worker URL or temporarily disable the production `serviceWorker` build option, preserve no-cache headers, and verify that existing registrations unregister on the next controlled visit. Do not delete cached application versions without a documented migration because future offline content will depend on user-managed storage.

## Deferred Work

- Explicit saved-article and media downloads
- Standards-based Web Push, notification routing, and badges
- Android share-target and background-sync handling
- Media Session playback adapters
- Orientation controls for explicitly immersive surfaces
- User-managed cache deletion and per-article offline download state
- A touch-specific Core OS shell under `src/app/core-os`
