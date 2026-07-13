# Core Services

This section focuses on the key game/runtime services prioritized in the cleanup audit.

## `author-repository.service.ts`

- Responsibility:
  canonical author normalization, default Colin fallback, published/admin projections, ID/slug lookup, and safe
  profile resolution for CMS and public author pages.
- Dependencies:
  `AuthorStorageService`, author validation utilities, and the shared Colin author profile used to seed/fallback.
- Called by:
  CMS post editor and author manager, public author pages, blog bylines, author statistics, and site search.
- Persistence:
  canonical profiles live at `/authors/{authorId}`. Posts separately retain `authorId` and a compact byline snapshot,
  so rendering, feeds, previews, exports, and offline copies do not depend on an author join.
- Current risks:
  profile edits intentionally do not rewrite historical snapshots automatically. Deleting or unpublishing a referenced
  author must be blocked or handled through a future explicit reassignment workflow.
- Planned cleanup:
  add server-side bulk reassignment and snapshot-refresh operations only when they can provide authorization,
  concurrency protection, audit history, and idempotent retries.

## `seo.service.ts`

- Responsibility:
  route-level canonical, Open Graph, Twitter Card, robots, and JSON-LD metadata for the Angular app.
- Dependencies:
  Angular `Router`, `Meta`, `Title`, and route `data.seo` objects.
- Called by:
  `AppComponent`, blog OpenGraph service, public/blog/lab/media routes.
- Server rendering:
  Firebase `renderSeoHtml` classifies incoming clean URLs before Angular loads. Known public routes receive indexable metadata, unknown routes return `404` with `noindex,follow`, missing published blog posts return `404` missing-post metadata, OS/admin routes stay valid but `noindex,nofollow`, and blog/topic pages can receive visible fallback HTML inside `<app-root>`.
- Sitemap policy:
  `sitemapXml` includes static public pages, topic hubs, published posts, and taxonomy URLs that meet thresholds. Categories/subcategories require at least `2` published posts. Tags require at least `3` published posts. Lower-count taxonomy pages remain accessible but use `noindex,follow` metadata and are omitted from the sitemap.
- Crawler fallback content:
  `/blog` receives crawlable article links and summaries. `/blog/:slug` receives semantic article fallback with author, date, categories, tags, cover image, and sanitized body blocks. `/topics/:slug` receives a lightweight visible topic fallback.
- Current risks:
  social crawlers do not execute the Angular runtime consistently, so deployed clean URLs depend on the Firebase `renderSeoHtml` Function and its packaged `seo-index.html` shell staying aligned with Angular hosting assets.
- Planned cleanup:
  extract pure Functions SEO policy helpers from `functions/src/index.ts` into a smaller testable module for direct unit coverage of status codes, robots directives, sitemap filtering, canonical URLs, and fallback HTML snippets.

## `youtube-feed.service.ts`

- Responsibility:
  public homepage access to latest YouTube uploads through a Firebase callable Function.
- Dependencies:
  `FIREBASE_FUNCTIONS`, `getLatestYouTubeVideos` callable.
- Called by:
  `YouTubeLatestVideosComponent` on the public homepage.
- Current risks:
  the callable is public for anonymous homepage visitors, so quota protection depends on short response size, server-side API-key storage, and backend caching.
- Planned cleanup:
  add Firebase App Check enforcement when App Check is configured for the public site.

## `site-preloader.service.ts`

- Responsibility:
  dismiss the static public-site startup overlay after initial route settling, Angular stability, font readiness, animation-frame paint, and one marked above-the-fold image decode.
- Dependencies:
  Angular `ApplicationRef`, `Router`, browser document APIs, and the inline `window.__cmDismissInitialSiteLoader` hook.
- Called by:
  `AppComponent` during browser startup.
- Current risks:
  the service intentionally waits for only one `[data-site-preload-image]`; routes that mark multiple images still dismiss after the first marker, so route authors should keep the marker scoped to the primary above-the-fold visual.
- Planned cleanup:
  keep timing values centralized in the service and add route-level visual regression coverage if startup loader behavior changes again.

## `sound.service.ts`

- Responsibility:
  effect audio preload/playback/mute and variant pools.
- Dependencies:
  `SettingsService`, `PatchService`, `LogService`, sound config token.
- Called by:
  desktop flow, CLI/typewriter, login, intro overlays.
- Current risks:
  service `OnInit` lifecycle not invoked by Angular DI, weak filename sanitization, cache key inconsistency.
- Planned cleanup:
  move init to explicit constructor/init method, harden filename allowlist, normalize cache keys.

## `user.service.ts`

- Responsibility:
  user profile state and persistence bridge.
- Dependencies:
  `SettingsService`, `LogService`.
- Called by:
  login, desktop, CLI, settings, game config, tray.
- Current risks:
  `previousUserSubject` not updated, unnecessary async wrapper around sync settings call.
- Planned cleanup:
  simplify update path, ensure previous/current snapshots are coherent.

## `overlay.service.ts`

- Responsibility:
  global overlay image visibility/state.
- Dependencies:
  none.
- Called by:
  desktop and overlay component.
- Current risks:
  temporary overlay timeout races and no timeout tracking.
- Planned cleanup:
  track/cancel previous timers and provide deterministic hide behavior.

## `cli.service.ts`

- Responsibility:
  command registry and command execution.
- Dependencies:
  `GameConfigService`, `UserService`.
- Called by:
  CLI game component.
- Current risks:
  the `su` authorization branch is fixed and covered; direct `localStorage` reads and weak validation remain in legacy command paths.
- Planned cleanup:
  route remaining identity reads through `UserService` and validate command parameters consistently.

## `typewriter.service.ts`

- Responsibility:
  queued typed output with mode-dependent sound behavior.
- Dependencies:
  `SoundService`, `UserService`.
- Called by:
  CLI, desktop intro, home terminal.
- Current risks:
  timer teardown, queue behavior, and callback semantics are stabilized; some legacy callers still use loose payload types.
- Planned cleanup:
  finish strict event payload types without changing the verified line/queue callback behavior.

## `settings.service.ts`

- Responsibility:
  register/get/update single settings and setting sets, form sync.
- Dependencies:
  `StorageService`, `NotificationService`.
- Called by:
  user, weather, sound player, appearance panel, patch/music features.
- Current risks:
  typed internal models, guarded keyed operations, and explicit persistence subscriptions are in place; dynamic callers can still weaken contracts at the boundary.
- Planned cleanup:
  remove remaining boundary-level `any` usage and keep persistence flows observable and testable.

## `application-manager.service.ts`

- Responsibility:
  facade for app registry, launch/close/focus, memory checks, and persistence of open apps.
- Dependencies:
  `ApplicationFactory`, `NotificationService`, `LogService`.
- Called by:
  desktop, dock, tray, app window template, activity monitor, CLI.
- Current risks:
  registry, catalog, persistence, and lifecycle responsibilities are extracted, with deterministic restoration and instance handling; the facade still coordinates several legacy consumers.
- Planned cleanup:
  continue tightening facade types and consumer coupling without recombining the extracted services.

## `media.service.ts`

- Responsibility:
  media item helpers and basic preload behavior.
- Dependencies:
  none.
- Called by:
  notification/media rendering pathways.
- Current risks:
  weak typing around icon/svg data and inconsistent factory outputs.
- Planned cleanup:
  normalize `MediaItem` factory return types and tighten icon interfaces.

## `storage.service.ts`

- Responsibility:
  persistence abstraction (`IndexedDB` first, localStorage fallback).
- Dependencies:
  browser storage APIs.
- Called by:
  settings, tasks, patch editor.
- Current risks:
  strategy-level `getAllKeys()` behavior is aligned and covered; broad generic value types remain in legacy callers.
- Planned cleanup:
  tighten caller value types while preserving IndexedDB/localStorage strategy parity.

## `file-system.service.ts`

- Responsibility:
  virtual file tree, path navigation, finder data/view modes.
- Dependencies:
  `HttpClient` and deterministic seeded mock content.
- Called by:
  finder UI and tray view mode controls.
- Current risks:
  startup content is deterministic and lightweight; the virtual file tree remains development/demo data rather than a durable filesystem contract.
- Planned cleanup:
  keep demo-data generation isolated and add a lazy/static mock gate only if startup profiling shows a regression.

## `game-config.service.ts`

- Responsibility:
  level loading, current level state, unlocked commands, log file content lookup.
- Dependencies:
  `HttpClient`, `UserService`.
- Called by:
  CLI service, level loader, CLI component.
- Current risks:
  awkward `Promise<Observable<...>>` API, unused parameters, fragile level load expectations.
- Planned cleanup:
  return clean observables/promises (one async model), remove unused args, tighten level indexing.
