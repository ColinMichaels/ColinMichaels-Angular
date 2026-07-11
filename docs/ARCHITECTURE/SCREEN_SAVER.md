# Screen Saver Overlay

## Purpose And Boundary

The screen saver is an app-shell feature that presents the CMS-managed homepage hero media as a full-viewport viewer.
It lives under `src/app/features/screen-saver` because it is public-site media behavior, not reusable Core OS windowing
infrastructure. `AppComponent` mounts only a lightweight shortcut launcher outside the route frame. On the first
activation, that launcher imports and mounts the full viewer so the overlay can cover any current route without
changing or duplicating route components.

## Component Inventory

- `ScreenSaverLauncherComponent`: owns the initial `S` shortcut and dynamically imports the viewer on first use.
- `ScreenSaverComponent`: owns the loaded keyboard shortcut, full-viewport presentation, slide rotation, focus return,
  page scroll lock, reduced-motion handling, and hidden-tab pause behavior.
- `ScreenSaverControlsComponent`: bottom animation-studio toolbar for module selection, motion tuning, slideshow timing,
  and local image selection.
- `ScreenSaverPreferencesService`: persists the selected module, Ken Burns state/speed, and slideshow interval in the
  device-local `colinmichaels.screen-saver.preferences.v1` local-storage record.
- `ScreenSaverLocalMediaService`: stores uploaded image blobs in the device-local
  `colinmichaels-screen-saver-v1` IndexedDB database and owns their temporary object URLs.
- `HomepageHeroRepositoryService`: remains the single source for published hero images and saved slideshow timing.
- `getPublishedHomepageHeroSlides`: preserves the same published-state filtering and deterministic ordering used by the
  homepage hero.

## Runtime Contract

- Pressing unmodified `S` outside an input, textarea, select, or editable region toggles the overlay.
- Before the first `S` press, only the shortcut launcher is mounted. The renderer, toolbar, preferences, local-media
  storage, and homepage-media integration are emitted as a lazy chunk and initialized on demand. The mounted viewer
  remains warm after first use, so later toggles do not repeat the import or initialization work.
- `Escape` and the visible Exit control close an active overlay.
- Mouse movement closes the active overlay after a 1.5-second arming delay. Movement during that handoff window is
  ignored so the pointer can be released without immediately waking the screen saver.
- Opening always starts from the first slide in the selected module. Multiple slides rotate at the locally persisted
  studio interval with a minimum 1.2-second crossfade and subtle compositor-only image drift.
- The studio toolbar exposes working Hero and My Images modules. The module list is typed through
  `ScreenSaverModuleId` so future renderers can extend the registry without mixing their state into the app shell.
- Ken Burns can be disabled or tuned across five speed levels. Slideshow timing can be tuned from 4 to 20 seconds;
  both settings update the active renderer and persist locally.
- Add Images accepts multiple browser image files up to 25 MB each and stores up to 40 files locally. Uploaded files
  are never sent to Firebase or another remote service. A successful upload activates the My Images module.
- Mouse movement within the studio toolbar remains interactive after the wake delay. Movement elsewhere retains the
  existing screen-saver wake behavior.
- Images are not added to the DOM until the viewer is first opened, avoiding initial image requests from this feature.
- Draft settings, empty published slide lists, and unavailable Firestore state fall back to the branded default hero.
- Rotation pauses in hidden tabs and for `prefers-reduced-motion: reduce`; reduced-motion users receive a static image.
- The underlying page is scroll-locked only while the overlay is active, and keyboard focus returns to the prior
  element when the viewer closes.

## Migration And Rollback

This feature adds no route, Firebase schema, Storage rule, or remote content migration. Existing homepage rendering
and CMS editing remain unchanged. It adds only device-local browser data. Roll back by removing
`<app-screen-saver-launcher/>` and its import from `AppComponent`; the isolated feature files can then be removed without
affecting hero data. The unused IndexedDB database and local-storage preference record may remain harmlessly on the
device or be deleted through browser site-data controls.

## Deferred Studio Work

The current studio intentionally leaves named animation presets, per-image focal-point editing, local-image removal
UI, remote media-library selection, video/audio playback, idle-time activation, and Fullscreen API integration for
later iterations.

## Validation

- `npm run build`
- `npm run lint`
- Focused screen saver component, preference, and IndexedDB media specs
- Manual checks for module switching, speed controls, local upload, `S`, delayed mouse wake, `Escape`, Exit, timed
  rotation, focus return, desktop/mobile framing, reduced motion, and console errors
