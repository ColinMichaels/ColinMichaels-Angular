# Core Services

This section focuses on the key game/runtime services prioritized in the cleanup audit.

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
  auth bug in `su` command (`isAuthorized` not invoked), direct `localStorage` reads, weak input validation.
- Planned cleanup:
  fix auth branch, route identity through `UserService`, validate command parameters.

## `typewriter.service.ts`

- Responsibility:
  queued typed output with mode-dependent sound behavior.
- Dependencies:
  `SoundService`, `UserService`.
- Called by:
  CLI, desktop intro, home terminal.
- Current risks:
  loose typings (`any`), timer lifecycle concerns, `onBegin` called per char instead of per line.
- Planned cleanup:
  strict event payload types, line-level hook semantics, safer timer teardown.

## `settings.service.ts`

- Responsibility:
  register/get/update single settings and setting sets, form sync.
- Dependencies:
  `StorageService`, `NotificationService`.
- Called by:
  user, weather, sound player, appearance panel, patch/music features.
- Current risks:
  broad `any` typing, untracked subscriptions, nested persistence flows.
- Planned cleanup:
  type-safe setting models, explicit subscription lifecycle, flatten async logic.

## `application-manager.service.ts`

- Responsibility:
  app registry, launch/close/focus, memory checks, persistence of open apps.
- Dependencies:
  `ApplicationFactory`, `NotificationService`, `LogService`.
- Called by:
  desktop, dock, tray, app window template, activity monitor, CLI.
- Current risks:
  very large mixed-responsibility service, unsafe `localStorage` JSON parse, fragile instance counting.
- Planned cleanup:
  extract persistence/registry helpers, guard JSON parse, fix instance limit accounting.

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
  `getAllKeys()` bypasses strategy and always reads localStorage.
- Planned cleanup:
  add strategy-level key enumeration and align behavior across storage backends.

## `file-system.service.ts`

- Responsibility:
  virtual file tree, path navigation, finder data/view modes.
- Dependencies:
  `HttpClient`, faker.
- Called by:
  finder UI and tray view mode controls.
- Current risks:
  startup faker generation cost, nondeterministic tree shape, duplicate favorites.
- Planned cleanup:
  deterministic seed or static mock loading in prod, dedupe favorites, lazy/mock gate.

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
