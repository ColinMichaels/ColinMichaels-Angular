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
- The default app catalog still imports concrete legacy game components; feature-owned manifests remain a later migration cohort.
