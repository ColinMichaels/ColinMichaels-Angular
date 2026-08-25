# Core Services

## `auth.service.ts`

- Responsibility:
  Firebase sign-in/provider flows, explicit auth-readiness state, claim refresh, current-profile projection, role authorization, and the admin-only tab-scoped **View as User** effective profile.
- Dependencies:
  Firebase Auth, `UserAccountService`, Angular Router, shared local `LogService`, and session storage for the recoverable preview projection.
- Called by:
  route guards, site account controls, Profile, Cat Corner, admin navigation, the Admin Guide, and User Management.
- Identity state:
  `authState$` emits `initializing`, `authenticated`, `unauthenticated`, or `unavailable`. `user$` deliberately suppresses the initializing state so route guards and account consumers cannot mistake startup latency for a signed-out result.
- Security boundary:
  View as activation force-refreshes the real actor token and requires `admin`; the target profile changes Angular role and identity presentation only. Firebase requests retain the real actor token.
- Current risks:
  the preview cannot validate backend denials and must stay read-oriented; any new role consumer should use `getRoleAuthorization` or `getCurrentUserProfile` when it is expected to honor the effective view.
- Planned cleanup:
  add emulator-backed permission-matrix tests if diagnosis needs authoritative callable, Firestore, Storage, or Realtime Database enforcement for a target account.

## `shared/logging/log.service.ts`

- Responsibility:
  shared in-memory log buffering, level filtering, pagination, muting, and browser-console output for public authentication and Core OS consumers.
- Dependencies:
  RxJS only; the service has no Firebase, Firestore, authentication, or consent dependency.
- Compatibility:
  the legacy `components/game/services/log.service.ts` path re-exports the shared implementation so existing Core OS consumers retain one service instance and their current API.
- Privacy boundary:
  browser clients do not persist logs to Firestore. Any future remote telemetry must be introduced behind a separately authorized, consent-aware sink with retention and redaction rules.
- Memory boundary:
  a chronological 500-entry ring buffer replaces unbounded append/copy behavior. Eviction and Clear release retained entry references while pagination and filtering preserve their existing API.
- Migration:
  no stored data or Firestore Rules change is required. Existing `logs` documents are left untouched.

This section focuses on the key game/runtime services prioritized in the cleanup audit.

## `features/blog/services/blog-storage.service.ts`

- Responsibility:
  auth-aware canonical post access, compact post-index loading, bounded anonymous direct-article caching, and trusted publishing delegation.
- Public memory boundary:
  home, listing, author, category, and search consumers use backend-owned `/postSummaries` records without Editor.js blocks. Direct routes fetch one canonical published post by slug, retain at most three recent full posts, coalesce same-slug requests, refresh a stale full post when its summary revision advances, and recheck canonical publication when a summary disappears.
- Admin compatibility:
  CMS roles retain the existing complete collection stream for exports, bulk actions, media references, and legacy admin surfaces. Firestore `docChanges()` remaps only changed documents, and same-version editor streams suppress redundant hydration.
- Migration:
  `functions/scripts/backfill-post-summaries.mjs` performs an idempotent dry-run-by-default backfill, requires an explicit project in apply mode, transactionally rechecks repair candidates, and writes the schema-versioned completeness manifest only after successful application. See `PERFORMANCE_AND_CACHE_BUDGETS.md`.
- Security boundary:
  browser clients cannot write summaries. Trusted canonical mutations update them transactionally.

## `features/blog/services/blog-article-library.service.ts`

- Responsibility:
  device-local reading progress, resume headings, favorites, and read-later metadata.
- Persistence boundary:
  IndexedDB remains authoritative. Startup and visible-tab reconciliation use a full read; successful single-record writes update signal state incrementally instead of rescanning the store.
- Migration:
  no database or record-schema migration is introduced by the incremental state path.

## `shared/analytics/site-analytics.service.ts`

- Responsibility:
  emit one query-free page view per Angular route and privacy-filtered GA4 product events for meaningful public reader behavior, including article depth, saved actions, reactions, poll votes, shares, comments, search, content selection, and Daily Discovery.
- Dependencies:
  browser `document`/`window`, the public route boundary, and the production GA4 measurement destination. It has no Firebase, identity-record, or content-body dependency.
- Called by:
  `AppComponent`, public blog detail/comments/polls/related-reading, Continue Reading, search page/drawer, homepage share, share attribution, and Daily Discovery play flows.
- Privacy and environment boundary:
  local hosts, server rendering, and `/admin` routes are excluded; comment/answer text and account IDs are omitted; likely personal search terms are redacted.
- Current risks:
  GA4 remains directional and can include sophisticated automation. Useful reporting also depends on the documented GA4 custom dimensions, metrics, key events, and validated internal-traffic rule.
- Migration:
  the application shell now loads the single production Google tag directly and no longer loads `GTM-Q6BN`; the external container remains untouched for rollback history.

## `features/blog/services/blog-article-reaction.service.ts`

- Responsibility:
  keep one compact reader reaction per article and browser device so a response remains visibly selected when the reader returns.
- Dependencies:
  browser local storage only; the service is server-rendering safe and has no Firebase, identity, points, or moderation dependency.
- Called by:
  the end-of-article `ArticleReactionComponent` on published online articles.
- Privacy and authority boundary:
  only the public article slug and one of four fixed reaction codes are stored. Reactions are content-direction signals, not authenticated votes, backend totals, or rewards.
- Migration:
  no data backfill is required. Removing the component leaves a small inert local-storage map that can be discarded naturally.

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
  `sitemapXml` includes static public pages such as `/privacy`, topic hubs, published posts, and taxonomy URLs that meet thresholds. Categories/subcategories require at least `3` published posts. Tags require at least `5` published posts. Lower-count taxonomy pages remain accessible but use `noindex,follow` metadata and are omitted from the sitemap. Before threshold counting, legacy Cat Corner/health/recovery labels collapse to their canonical category and overlapping Recovery/Personal Growth tags contribute to the category that owns the same public intent; a post is counted once per canonical archive.
- Crawler fallback content:
  `/blog` receives crawlable article links and summaries. `/blog/:slug` receives semantic article fallback with author, date, categories, tags, cover image, and sanitized body blocks. The primary article image carries its known Open Graph dimensions, asynchronous decoding, eager loading, and high fetch priority so the no-JavaScript shell reserves the same media space instead of creating avoidable layout shift. Category, tag, and topic routes render actual matching article links with `CollectionPage`/`ItemList` data; `/privacy`, `/contact`, `/write-for-us`, and `/background` render route-specific `WebPage` fallbacks. `seo-fallback-pages.ts` owns escaping, shared collection/static shells, graph creation, and safe replacement of the physical homepage fallback.
- Current risks:
  social crawlers do not execute the Angular runtime consistently, so deployed clean URLs depend on the Firebase `renderSeoHtml` Function and its packaged `seo-index.html` shell staying aligned with Angular hosting assets.
- Planned cleanup:
  continue extracting route classification, status/robots policy, and sitemap filtering from `functions/src/index.ts`; fallback rendering already has direct pure-module coverage.

## `youtube-feed.service.ts`

- Responsibility:
  public homepage access to latest YouTube uploads through a Firebase callable Function.
- Dependencies:
  `FIREBASE_FUNCTIONS`, `getLatestYouTubeVideos` callable.
- Called by:
  `YouTubeLatestVideosComponent` on the public homepage.
- Audience and measurement boundary:
  general homepage and blog surfaces present the Colin Michaels creator channel with separate channel/subscription actions. Explicit drone and FPV journeys opt into Captain Colin. Public video and channel selections reuse the privacy-aware `select_content` event; no YouTube account access, title/description copy, or viewer identity is sent to GA4.
- Identity boundary:
  `COLIN_MICHAELS_YOUTUBE_CHANNEL_ID` must match the canonical Colin Michaels channel for general creator surfaces. `YOUTUBE_CHANNEL_ID` remains the Captain Colin parameter for explicit drone/FPV surfaces. The Function validates the selected configuration and YouTube's channel response; the Angular service validates the callable payload and replaces any returned channel URL with the selected canonical channel URL before components render links or record channel analytics.
- Current risks:
  the callable is public for anonymous homepage visitors, so quota protection depends on short response size, server-side API-key storage, and backend caching. Any future channel-identity change still requires a coordinated code, runtime-parameter, schema, content-package, and rollback review because Angular and Functions compile separately.
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

## `ai-chat.service.ts`

- Responsibility:
  preserve the Core OS terminal's `aichat` command contract with an explicit local archived-relay response.
- Dependencies:
  RxJS only; it has no Angular HTTP, environment URL, vendor SDK, credential, or Firebase dependency.
- Called by:
  `CliGameComponent` after the existing command parser recognizes `aichat`.
- Security boundary:
  the service never sends the prompt, command list, or user input off-device. Active CMS OpenAI callables are a separate authenticated server-side feature.
- Planned cleanup:
  keep the local response until a separately approved terminal product requirement justifies a new abuse-resistant backend boundary.

## `weather.service.ts`

- Responsibility:
  provide deterministic local sample data, unit conversion, icon selection, and five-day grouping for the preserved Weather OS/lab prototype.
- Dependencies:
  RxJS and local Font Awesome icons only; it has no geolocation, HTTP, environment URL, provider SDK, credential, or Firebase dependency.
- Called by:
  the Weather app registered in the Core OS catalog and retained in the Labs component inventory.
- Presentation contract:
  the component identifies the source as sample data, exposes Demo mode in its status bar, and refreshes locally when units change.
- Planned cleanup:
  move the component/service pair into a lab-owned feature boundary when the broader feature/lab file migration resumes; do not reactivate OpenWeather without a reviewed provider requirement and backend design.

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

## `core-os/terminal/typewriter.service.ts`

- Responsibility:
  queued typed output with mode-dependent sound behavior.
- Dependencies:
  staged legacy `SoundService` and `OsUserService`; the OS-user mode relationship uses the canonical type-only models boundary instead of a runtime cycle.
- Called by:
  CLI, desktop intro, and the retained home-terminal component. Live consumers use the canonical leaf path; the former game-service path identity-re-exports the same mutable root queue.
- Current risks:
  timer teardown, queue behavior, and callback semantics are stabilized; the CLI renderer and commands remain outside this ownership batch, and some legacy callers still use loose payload types.
- Planned cleanup:
  move the terminal renderer/command cohort separately, finish strict event payload types, and preserve the verified line/queue, prompt, mode, sound, and callback behavior.

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

## `core-os/app-registry/application-manager.service.ts`

- Responsibility:
  facade for app registry, launch/close/focus, memory checks, and persistence of open apps.
- Dependencies:
  `ApplicationRegistryService`, `ApplicationLifecycleService`.
- Called by:
  desktop, dock, tray, app window template, activity monitor, CLI.
- Current risks:
  the full runtime cohort now has canonical `core-os/app-registry` ownership and identity-preserving legacy exports; the catalog still references concrete legacy app components, and lifecycle still reaches legacy notification/media/log services until those independent migrations occur.
- Planned cleanup:
  move catalog entries into feature-owned manifests and migrate notification/media/log boundaries without changing IDs, restoration, focus, or instance behavior.

## `core-os/app-registry/application-state-persistence.service.ts`

- Responsibility:
  synchronous compatibility persistence for the open-window `applications` payload.
- Dependencies:
  `LogService`.
- Called by:
  `ApplicationLifecycleService`.
- Current risks:
  browser-local state is intentionally unversioned, but reads accept both current string arrays and historical `{id}` records; malformed data and write failures are logged without blocking OS startup.
- Planned cleanup:
  keep this adapter narrow until a separately designed, versioned app-session migration can define reconciliation and rollback semantics.

## `core-os/windowing/app-window/app-window.component.ts`

- Responsibility:
  generic Core OS window host, dynamic child creation and parameter handoff, focus/close/minimize/zoom interaction, Dock-targeted animation, pointer drag/resize bounds, and global-listener cleanup.
- Dependencies:
  `ApplicationManagerService`, the app-registry window constraints, FontAwesome chrome, and the legacy CLI component as the preserved default embedded type.
- Called by:
  the desktop shell through the explicit `@core-os/windowing/app-window/*` package path.
- Current risks:
  drag, resize, zoom, and animation orchestration remain component-local and rely on document/browser APIs; focused browser tests protect viewport clamping, dimension limits, focus, dynamic parameters, minimize fallback/targeting, pointer completion, and instance-owned listener/selection-lock/animation teardown. The former app-window path is an identity-preserving compatibility export.
- Planned cleanup:
  extract drag/resize mechanics into a window controller in a separate behavior-locked refactor, then replace the legacy default embedded type only when application manifests own an explicit component.

## `core-os/dock/dock.component.ts`

- Responsibility:
  registry-driven desktop application launcher, installed/running selection, running-state indicators, one-click app open/focus/restore delegation, launch bounce, role-aware account destinations, notification testing, sign-out, and Trash entry points.
- Dependencies:
  `ApplicationManagerService` provides the installed/running/focused/minimized application contract; `AuthService`, `NotificationService`, router navigation, tooltip chrome, and Font Awesome provide the explicit shell utilities and presentation edge.
- Called by:
  the desktop shell through the explicit `@core-os/dock/dock.component` path.
- Current risks:
  the notification trigger remains an explicit test/demo control; role visibility remains sourced from `AuthService`, and logout delegates redirect/error logging there without duplicate console output. Installed general apps can overflow into horizontal Dock scrolling at narrow supported widths. The former system path is an identity-preserving compatibility export.
- Planned cleanup:
  move account utilities into a dedicated Core OS shell adapter and keep future Finder file operations behind the filesystem boundary in `CORE_OS_DESKTOP.md`; replace test-only launcher actions only through an explicitly designed product change.

## `core-os/tray/system-tray.component.ts`

- Responsibility:
  desktop menu bar, app lifecycle menus, Finder view-mode bridge, memory display, OS route links, authenticated logout, sound/battery/clock controls, and current OS user label.
- Dependencies:
  `ApplicationManagerService`, `AuthService`, `FileSystemService`, `OsUserService`, router links, Clock, Sound Player, and FontAwesome chrome.
- Called by:
  the desktop shell through the explicit `@core-os/tray/system-tray.component` path.
- Current risks:
  sound, clock, and user services remain in the legacy game tree until their independent cohorts move; the filesystem bridge is canonical under `core-os/filesystem`. Focused tests protect menu semantics, single-menu state, view-mode synchronization, app actions, memory formatting, authenticated logout success/failure, and compatibility identity.
- Planned cleanup:
  migrate each feature service independently without folding product behavior or visual redesign into the tray ownership move.

## `core-os/context-menu/context-menu.service.ts`

- Responsibility:
  build role-filtered menu configuration and own the single CDK overlay used by the reusable Core OS context-menu renderer.
- Dependencies:
  Angular CDK overlay/portal, the canonical context-menu component, and the two retained registry prototypes.
- Called by:
  desktop right-click handling; former game service/component/menu paths re-export the canonical identities for compatibility.
- Current risks:
  role filtering controls presentation only and must never replace authorization inside an action; registry prototypes remain retained but unused by the live generic renderer.
- Planned cleanup:
  keep actions synchronous and locally authorized while future consumers adopt the tested Context Menu/Shift+F10, focus, submenu, closure, and restoration contracts.

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

## `core-os/storage/storage.service.ts`

- Responsibility:
  persistence abstraction (`IndexedDB` first, localStorage fallback).
- Dependencies:
  browser storage APIs.
- Called by:
  settings, tasks, OS user migration, patch editor.
- Current risks:
  strategy-level keys are aligned and covered, writes resolve only after IndexedDB transaction completion, and failures remain observable to callers. Broad generic value types remain in legacy callers. The localStorage strategy is availability-only—not a runtime failover—requires Web Locks for atomic compare-and-set, and deliberately disables broad `clear()` to protect unrelated origin data. The former `components/game/services/storage.service.ts` path is a compatibility re-export so both paths resolve to one root service token.
- Planned cleanup:
  tighten caller value types and define an explicit fallback-key namespace before enabling localStorage bulk clearing, while preserving the `AppStorage` database, `keyvalue` object store, and existing raw keys.

## `core-os/filesystem/file-system.service.ts`

- Responsibility:
  versioned virtual filesystem, path navigation, serialized Finder mutations, selection, search, tags, Trash, bounded session undo/redo, and view modes.
- Dependencies:
  `HttpClient` for the one-time compatibility seed, `AuthService` for UID isolation, and `core-os/storage/StorageService` for device-local persistence and revision compare-and-set.
- Called by:
  canonical Finder UI and tray view-mode controls; the former game-service path is a compatibility export.
- Current risks:
  the browser-native tree stores metadata only, session undo/redo is intentionally not persisted, and unknown schema versions stop normal Finder work rather than risking overwrite. Undo and redo replay complete validated snapshots through the same serialized compare-and-set boundary; a failed replay retains the prior rendered tree and history labels, a new saved mutation clears redo, and identity/conflict reloads clear both stacks. First-use and reset writes use a presence-aware revision compare: revision-bearing values retain their token, while confirmed revisionless recovery uses revision zero and therefore may replace another revisionless corrupt value but cannot replace a newer valid nonzero revision. Exact JSON-compatible shape, dense arrays, field bounds, and UTF-8 bytes are checked before cloning; malformed localStorage text and stored `null` remain distinguishable from absence through a recovery-only record read; account changes invalidate pending reloads; and each Finder window owns its navigation/selection/dialog state. The UI can export a bounded diagnostic representation and explicitly reset it. Unsupported binary, cyclic, or oversized values are marked incomplete rather than claimed as a lossless JSON backup. Finder dispatches metadata-only requests through its injection port; it does not open file bytes or represent access to the user's Mac.
- Planned cleanup:
  add bounded actual-content references plus drag/drop and conflict-choice organization as separate phases. Add real-folder access only behind an explicit user gesture, retained permission state, visible reconnect handling, and no-background-upload boundary.

## `core-os/app-registry/application-registry.service.ts`

- Responsibility:
  canonical installed-app lookup plus deterministic file-handler resolution from catalog associations.
- Dependencies:
  ordered application catalog and shared application/file descriptor models.
- Called by:
  `ApplicationManagerService` for lifecycle launch/focus/restore and Finder metadata-preview dispatch.
- Current risks:
  concrete application components remain catalog imports from the legacy game tree. Specific MIME values are authoritative; extension and legacy-kind fallback is restricted to missing/generic MIME metadata, and equal scores preserve registration order.
- Planned cleanup:
  move concrete feature manifests with their application cohorts and add trusted content capabilities without weakening the metadata-only Finder contract.

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
