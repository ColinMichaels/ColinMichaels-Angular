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
4. Canonical `core-os/windowing/AppWindowComponent` dynamically creates the embedded component, forwards its optional parameters, and owns bounded drag/resize listener teardown.
5. Focus updates reorder open apps list and tray state; the window subscribes to the same case-insensitive focus stream.
6. Open base app IDs are persisted to the exact localStorage key `applications`; restoration also accepts historical `{id}` records and numbered instance IDs.

## Dock and System Tray Flow

1. Canonical `core-os/dock/DockComponent` reads registered/running apps from `ApplicationManagerService`; single click requests focus and double click requests launch through the same manager facade.
2. Role-gated dock destinations read current authentication and authorization state from `AuthService`; sign-out delegates redirect and failure logging to that service.
3. Canonical `core-os/tray/SystemTrayComponent` uses the same manager facade for launch, close, and close-all actions while rendering memory from the lifecycle state.
4. Tray view-mode controls mirror `FileSystemService.viewMode$` and write changes back through `setViewMode`; filesystem persistence and Finder rendering remain owned by their existing cohort.
5. Tray logout calls `AuthService.logout()` so Firebase sign-out completes before that service redirects to login; on failure the tray remains open and exposes an alert without claiming the session ended.

## Context Menu Flow

1. Desktop right-click handling builds the Open, Open With, and Settings menu configuration through canonical `core-os/context-menu/ContextMenuBuilder`.
2. `ContextMenuService` replaces any prior menu, positions one CDK overlay from the pointer's client coordinates, and injects the configuration into `ContextMenuComponent`.
3. The transparent backdrop owns the existing outside-click dismissal behavior; no menu state is persisted and Open/Settings continue through `ApplicationManagerService` callbacks.
4. The ownership move preserves those contracts. Keyboard entry/focus, functional submenu traversal, action-close/focus restoration, and viewport-edge placement remain a separately tracked hardening pass.

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
