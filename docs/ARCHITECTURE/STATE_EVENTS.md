# State and Event Flow

## State Management Model

This codebase uses service-local reactive state (mostly `BehaviorSubject`) instead of a central state library.

- Long-lived state:
  app registry/open apps/focus through `core-os/app-registry`, plus user profile, settings, file system, and notifications.
- Component-local state:
  UI toggles, view pagination, current selected items.
- Persistence:
  settings/user/tasks/patches via `StorageService`; open app base IDs via the narrow `ApplicationStatePersistenceService` localStorage adapter.

## Core Event Flows

## App and Window Lifecycle

1. Desktop requests open app via `ApplicationManagerService.openApplication(id)`.
2. Manager resolves the canonical registry entry and delegates to `ApplicationLifecycleService`.
3. Lifecycle validates memory and instance limits, then `ApplicationFactory` creates window instance metadata.
4. Canonical `core-os/windowing/AppWindowComponent` dynamically creates the embedded component, forwards its optional parameters, and owns bounded drag/resize/zoom plus Dock-animation teardown.
5. Focus updates immutably reorder open apps and clear background focus flags; minimizing retains the instance and embedded component, marks it hidden, and focuses the next visible window or desktop. Normal activation restores it.
6. Open base app IDs are persisted to the exact localStorage key `applications`; restoration also accepts historical `{id}` records and numbered instance IDs.

## Dock and System Tray Flow

1. Canonical `core-os/dock/DockComponent` derives items from installed general apps, Finder/Settings, and other running system apps. One click delegates normal activation through `ApplicationManagerService`, which opens, focuses, or restores the most recent instance.
2. Role-gated dock destinations read current authentication and authorization state from `AuthService`; sign-out delegates redirect and failure logging to that service.
3. Canonical `core-os/tray/SystemTrayComponent` uses the same manager facade for launch, close, and close-all actions while rendering memory from the lifecycle state.
4. Tray view-mode controls mirror canonical `core-os/filesystem/FileSystemService.viewMode$` and write changes back through `setViewMode`. Finder imports the retained seed once per authenticated account, then uses the version-1 `core-os.virtual-file-system.user.<encoded Firebase UID>` value in `AppStorage`; it remains a browser-native virtual tree rather than local-Mac access.
5. Auth changes reset Finder's in-memory tree, navigation, selection, and undo before loading the next account namespace. Finder never guesses ownership of or migrates the former origin-wide key.
6. Finder first-use, recovery, undo, and normal mutations clone or import a candidate, validate metadata/conflicts/structural and UTF-8 byte bounds, serialize behind prior work, perform a presence-aware revision compare, persist through transaction completion, and only then emit a shared refresh signal. Revision-bearing recovery compares its token; the confirmed revisionless path compares as revision zero, which protects a newer valid nonzero snapshot while allowing the user to replace another revisionless corrupt value. Each Finder window refreshes its own path while retaining independent history, selection, search, sort, and dialog targets. Storage failure leaves the prior rendered tree intact; a stale revisioned tab reloads the saved winner and asks the user to retry. IndexedDB provides the normal transaction; the localStorage fallback requires Web Locks or fails closed.
7. Launch parameters are updated on an existing application instance and forwarded by `AppWindowComponent` through the embedded component's Angular input without recreating it, so OnPush apps rerender. Programmatic lifecycle focus moves DOM focus to the resolved window, while pointer/keyboard descendant focus restoration remains authoritative. Dock Trash can therefore focus Finder and navigate to its virtual Trash in one action.
8. File activation calls the filesystem-owned `FINDER_FILE_OPENER` port with stable virtual metadata and the explicit `metadata-only` state. Desktop supplies `ApplicationManagerService` as the adapter, so Finder does not import the app registry.
9. The registry considers installed handlers in catalog order. Exact MIME outranks a family wildcard; missing or generic MIME may fall back to extension and legacy kind, while a mismatched specific MIME fails closed. The manager launches, focuses, or restores the resolved app and returns an explicit metadata-preview, content-opened, unsupported, or failed result. Current Music and Markdown handlers render metadata only and never infer bytes from the name or path.
10. Tray logout calls `AuthService.logout()` so Firebase sign-out completes before that service redirects to login; on failure the tray remains open and exposes an alert without claiming the session ended.

## Context Menu Flow

1. A background-only desktop right click focuses the desktop and opens the canonical Open/Settings menu at the pointer. Bubbled events from windows and icons are ignored; the former no-op Open With test submenu is no longer presented.
2. The focused desktop also opens the same menu through the Context Menu key or Shift+F10 at a stable near-origin position.
3. `ContextMenuService` replaces any prior menu, captures the invoker, creates a pushed four-way CDK root overlay with an eight-pixel viewport margin, injects the configuration, and focuses the first enabled item.
4. `ContextMenuComponent` owns named `menu`, `menuitem`, and `separator` semantics; roving Arrow/Home/End focus skips disabled and structural rows, ArrowRight/ArrowLeft stay within their owning level, and recursive submenus flip left or right and vertically fit when opened or resized near an edge.
5. Action completion, Escape, Tab, the transparent backdrop, page scrolling, navigation, or desktop teardown dismiss the transient overlay. Independent menu-list scrolling, pointer exit, or a sibling branch replacement closes the open submenu tree, clears descendant state, and returns keyboard focus to the visible owning trigger when needed. Service-owned overlay dismissal restores the connected invoker; replacement does not restore focus between overlays.
6. No menu state is persisted. Open and Settings continue through `ApplicationManagerService`; the builder recursively filters roles and assigns complete parent/path metadata, but that presentation filter remains distinct from authorization inside an action.

## CLI Command Flow

1. User enters command in CLI app.
2. `CliGameComponent` normalizes input and invokes `CLIService.executeInput`.
3. Command output is routed to `TypewriterService`.
4. Follow-up actions can mutate user/level state through `UserService` and `GameConfigService`.

## User and Settings Persistence Flow

1. `UserService` registers/reads `user` setting set.
2. Updates flow through `SettingsService.updateSettingSet`.
3. `SettingsService` persists through `StorageService` strategy.

## Overlay and Notification Flow

1. Any producer calls `OverlayService` or `NotificationService`.
2. Overlay and notification renderer components subscribe and update UI.
3. Notifications auto-dismiss on timeout unless duration is zero.

## Hotspots for Cleanup

- Unbounded subscriptions in services/components that do not use `takeUntilDestroyed`.
- Dynamic window/component lifecycle depends on mutable shared objects.
- Dock/tray feature dependencies still cross into the legacy game tree until notification, filesystem, user, sound, and clock ownership move independently.
- The default app catalog still imports concrete legacy game components; feature-owned manifests remain a later migration cohort.
