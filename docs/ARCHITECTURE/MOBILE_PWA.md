# Mobile PWA Foundation

## Purpose

The Progressive Web App foundation makes the public ColinMichaels.com shell installable, version-aware, and resilient to a lost connection without mixing PWA lifecycle logic into public feature components or the reusable Core OS framework.

The foundation does not introduce offline CMS editing, general background sync, remote-media downloads, or a mobile Core OS shell. Those capabilities require separate data, permission, and platform work.

## Architecture

Shared browser and service-worker lifecycle code lives under `src/app/shared/pwa`:

- `PwaInstallService` captures Chromium's install prompt, detects installed display mode, and provides platform-neutral manual instructions when no programmatic prompt exists.
- `PwaNetworkService` exposes browser online/offline state as Angular signals.
- `PwaUpdateService` translates Angular service-worker version and unrecoverable-state events into explicit reload controls.
- `PwaNativeControlsService` adapts Web Share, Fullscreen, and Screen Wake Lock behind capability signals and safe user-gesture methods.
- `PwaStorageService` reports origin storage estimates and allows a user to request persistent storage protection where the browser supports it.
- `PwaPushService` owns explicit notification opt-in/out, Angular service-worker message/click streams, allowlisted public deep links, foreground badge state, and permission-safe feedback.
- `PwaPushRegistrationService` keeps Firebase callable details out of the browser-capability adapter.
- `PwaInstallControlComponent` adds a compact install action to the existing public utility menu.
- `PwaNativeControlsComponent` adds only the operating-system controls supported by the current device to the protected Profile page.
- `PwaStatusComponent` surfaces offline, update-ready, and refresh-required states without changing individual page components.

Feature-specific offline article behavior remains under `src/app/features/blog`:

- `OfflineBlogPostService` stores explicitly selected published-post snapshots in a dedicated Cache Storage namespace, validates every restored record, warms same-origin article images through the Angular worker, and never stores previews or social-promotion planning data.
- `BlogArticleLibraryService` stores structured device-local reading state in IndexedDB: a public article summary, high-water progress, the most recent section anchor, read completion, favorites, and read-later membership. It never stores article bodies, previews, comments, or authentication data.
- `BlogStickyPostToolbarComponent` keeps favorites, read later, and offline download as separate actions without expanding the sticky stack vertically.
- `ArticleLibraryControlComponent` shows recent reading state and allows favorites/read-later management from the protected Profile page.
- `ContinueReadingShelfComponent` exposes up to three unfinished articles on the homepage and blog archive, stays absent when there is nothing to resume, and links to the last saved section without requiring authentication.
- `OfflineArticlesControlComponent` lists saved articles on the Profile page and supports individual removal or clearing every saved article.
- `BlogDetailComponent` uses a saved snapshot only when the browser is offline or the public Firestore load fails. An online missing/deleted post never silently falls back to stale content.

`app.config.ts` registers `pwa-worker.js` only outside development mode. That wrapper imports Angular's generated `ngsw-worker.js` first, leaving Angular authoritative for caching, updates, notification display, and notification-click operations; the wrapper adds only background App Badging calls. Production builds process the root `ngsw-config.json` file.

## Cache Policy

The worker and offline-reading layer use three cache boundaries:

1. `app-shell` prefetches versioned JavaScript/CSS, the HTML entry point, local fonts, and install icons. The JavaScript set includes lazy route bundles because a cold offline Angular navigation cannot identify and fetch a missing route bundle.
2. `public-images-and-documents` lazily caches ordinary local images and public static documents after they are requested.
3. `colinmichaels-offline-blog-posts-v1` is a user-controlled Cache Storage namespace containing versioned JSON snapshots for posts the reader explicitly saves. It is not an Angular worker asset group, so Angular version cleanup cannot mistake user-selected articles for an obsolete application version.

Audio and video extensions are intentionally absent. The repository contains large media files that require user-visible, quota-aware download controls before they should be retained for offline use.

No Firebase API response is configured as a service-worker data group. Firestore remains memory-backed, so the worker cannot persist authenticated CMS documents by accident. Offline snapshots are created only from already-rendered public posts after a user action.

IndexedDB is deliberately separate from these cache boundaries. Cache Storage and the Angular worker own request/response resources; IndexedDB owns queryable reader metadata. Moving images, bundles, or arbitrary HTTP responses into IndexedDB would duplicate browser cache behavior and make service-worker maintenance harder.

## Saved Article Behavior

Saving an article writes its public text, metadata, and Editor.js block structure to the dedicated cache. Same-origin `/assets/` cover and image-block URLs are fetched so the Angular service worker can retain them under the existing public-image policy. Cross-origin images, video, embeds, comments, engagement writes, and suggested-post data are not promised offline.

Each record keeps `savedAt` and `sourceUpdatedAt`. When the live post changes, the sticky action becomes **Update offline copy** instead of forcing the reader to remove and save again. Removing the current article or clearing the Profile list deletes the user-controlled cache record immediately.

Draft previews are rejected by the storage service. Cached records are runtime-validated and must still represent a published `BlogPost`; malformed, draft, preview, or wrong-slug records are ignored.

## Personal Reading Library

The `colinmichaels-reader-library` IndexedDB database stores one versioned record per public post slug. Reading progress is recorded only after the reader enters the article-body container, uses the greatest percentage reached, and never decreases when the reader scrolls backward. The separate resume location follows the reader's most recently active generated heading even when they revisit an earlier section. Reaching 95% marks the article as read.

The homepage and blog archive render a Continue Reading shelf only when unfinished records exist. Each card reports its saved percentage and, when available, its last section label. Navigation carries the stable generated heading id as a URL fragment. `BlogDetailComponent` retries the fragment after asynchronous post rendering, scrolls it below the existing sticky offsets, and focuses the heading's own anchor so keyboard and assistive-technology users receive the same resume context.

Signed-in read points use the same 95% completion boundary. The public client no longer calls `recordPostRead` when a route resolves; it calls only after local completion or when a previously completed local record is reopened online. The callable requires a bounded `progressPercent` from 95 through 100 before its existing idempotent per-user/per-post point event can be created. This is an integrity boundary for the supported client flow, not proof against a fully modified client, and no reading telemetry is written for anonymous readers.

Favorites and read later are independent booleans. Neither choice downloads the article; the separate offline action remains the only control that stores a complete article snapshot. This distinction keeps list organization lightweight and prevents readers from unintentionally consuming offline-storage quota.

The first release is device-local for both anonymous and signed-in readers. Account-backed Firestore synchronization is deferred until conflict handling, deletion semantics, privacy controls, and cross-device merge behavior are defined. Draft previews never create reading-library records.

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

The protected Profile page progressively exposes these controls:

- **Share page** opens the operating system share sheet with the current document title, canonical URL, and description. Closing the sheet is treated as a normal cancellation rather than an error.
- **Full screen** enters or exits browser fullscreen where the Fullscreen API is allowed. Installed iOS apps rely on their standalone display mode because iOS does not expose the same API.
- **Keep awake** requests a screen wake lock for long-form reading. The lock is released when the user turns it off or leaves the page, and it is reacquired after a temporary visibility-driven release only while the user preference remains active.
- **Protect storage** requests a persistent origin storage bucket and reports the browser's actual usage/quota estimate. Persistence makes cached assets less likely to be evicted; it does not download uncached Firestore posts or media.

Unsupported controls are omitted instead of replaced by non-functional imitations. The Profile page uses compact two-column touch targets and keeps personal device settings out of the global navigation menu.

## Push Notifications, Deep Links, And Badges

Push notifications are an explicit, signed-in, per-device opt-in. The app checks `SwPush.isEnabled`, browser notification support, and a configured VAPID public key before exposing the control. It never requests notification permission on page load. If permission is denied, the UI directs the reader to browser or operating-system settings instead of repeatedly prompting.

`registerPushSubscription` and `unregisterPushSubscription` are authenticated callable Functions. They validate the endpoint and key material, hash the endpoint into a non-reversible Firestore document id, and store the raw subscription only in the server-managed `pushSubscriptions` collection. Registering the same endpoint under another signed-in account replaces the owner rather than creating duplicate delivery records.

`notifyPublishedPost` listens for the transition from a non-published post state into `published`. It sends only the public title, excerpt, post id, slug, icon, and `/blog/:slug?source=push` destination. Edits to an already-published post do not generate another alert. Invalid subscriptions are deleted, and Web Push responses with 404 or 410 remove expired endpoints.

Notification payloads use Angular's `navigateLastFocusedOrOpen` click operation. The foreground fallback accepts only same-origin `/`, `/blog`, `/topics`, and `/search` destinations; admin, preview, authentication, OS, and external routes are rejected. Notification actions therefore cannot turn a stored payload into an arbitrary redirect.

`pwa-worker.js` sets an application badge when a push arrives and clears it on a notification click. The foreground app also clears badges when it becomes visible. Badging remains progressive: installed iOS, Android, Windows, macOS, and individual browsers expose different icon-badge behavior, and Android may represent unread notifications as a dot rather than the numeric value supplied by the app.

## Hosting and Updates

Firebase Hosting keeps hashed Angular bundles immutable. The generated service-worker scripts, `ngsw.json`, and web manifest use `no-cache, no-store, must-revalidate` so an old worker script or manifest cannot be pinned by the generic asset policy.

When Angular reports `VERSION_READY`, the app offers an explicit Update action. Activation is immediately followed by a full reload so old and new lazy chunks are never mixed in one running application. An unrecoverable worker state displays a stronger Refresh action.

## Validation

Every PWA change should validate:

- `npm run build`
- `npm run lint`
- focused PWA unit tests
- `ngsw.json`, `ngsw-worker.js`, and the linked manifest in production output
- `pwa-worker.js` imports Angular's worker before registering badge listeners
- public desktop and mobile rendering
- an offline production reload after the worker controls the page
- save, update, remove, clear-all, and direct offline article reload behavior
- IndexedDB version-1 to version-2 migration, progress persistence, high-water behavior, latest-section resume, 95% completion, favorites, and read-later independence
- homepage/blog Continue Reading visibility, responsive cards, fragment resume after cold article loading, keyboard focus, and an empty state that adds no page surface
- Functions rejection below 95% and idempotent read-point award at or above the completion threshold
- explicit notification permission, authenticated subscribe/unsubscribe, public deep links, badge set/clear, stale-endpoint removal, and publish-transition-only delivery
- no cached navigation fallback for admin, preview, auth, or protected OS routes

Real iOS Home Screen installation and Android install prompting remain required release checks because desktop emulation cannot reproduce their complete operating-system behavior.

Web Share, fullscreen, wake-lock release/reacquisition, and persistent-storage decisions also require physical-device checks. Browsers may deny individual capabilities based on installation mode, secure-context state, permissions, battery policy, or engagement heuristics.

## Rollback

If worker behavior causes a production regression, deploy Angular's safety worker at the same worker URL or temporarily disable the production `serviceWorker` build option, preserve no-cache headers, and verify that existing registrations unregister on the next controlled visit. Do not delete cached application versions without a documented migration because future offline content will depend on user-managed storage.

The reader library opens database version 2. Its `onupgradeneeded` migration preserves valid version-1 records while adding nullable `lastHeadingId` and `lastHeadingText` fields; the object-store key and the separate offline Cache Storage namespace do not change. Rolling back the shelf is non-destructive, but a client that only opens database version 1 cannot open an already-upgraded version-2 database. Prefer reverting the shelf and resume behavior while leaving the version-2 library reader in place. Never delete personal reading state as part of rollback.

Deploy the updated `recordPostRead` Function before Hosting. During that safe transition, the old client omits `progressPercent` and receives a caught no-award response instead of issuing premature points. The new client remains compatible with the older callable because its additional field is ignored, but strict server-side completion enforcement begins only after the Function deploy. Rolling back Hosting while retaining the updated Function safely pauses awards from an old route-load client.

Push deployment requires a matching VAPID key pair. Supply `WEB_PUSH_PUBLIC_KEY` to the Angular environment generator and Firebase string parameter, set `WEB_PUSH_PRIVATE_KEY` with Firebase Secret Manager, and optionally set `WEB_PUSH_SUBJECT` to a valid `mailto:` or HTTPS contact. Deploy Hosting, Functions, and Firestore rules together. VAPID private keys never belong in Angular environment files, Hosting assets, source control, or notification payloads.

Rotating the VAPID key pair invalidates existing subscriptions. A planned rotation should stop delivery, replace both keys, remove incompatible `pushSubscriptions` documents, deploy, and let readers explicitly subscribe again. A rollback may hide the control by omitting the public key and disable the publish trigger while preserving subscription records for a short recovery window; delete stored endpoints if the notification feature is permanently removed.

## Deferred Work

- Explicit remote-media downloads and per-download quota estimates
- Android share-target and background-sync handling
- Media Session playback adapters
- Orientation controls for explicitly immersive surfaces
- Background refresh notifications for saved articles whose source changes
- Signed-in cross-device reading-library synchronization and conflict resolution
- A full reading-library route with filtering, bulk management, import, and export
- Per-topic notification preferences, delivery analytics, rate controls, and an accessible in-app notification inbox
- A touch-specific Core OS shell under `src/app/core-os`
