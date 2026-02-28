# State and Event Flow

## State Management Model

This codebase uses service-local reactive state (mostly `BehaviorSubject`) instead of a central state library.

- Long-lived state:
  app registry/open apps/focus, user profile, settings, file system, notifications.
- Component-local state:
  UI toggles, view pagination, current selected items.
- Persistence:
  settings/user/tasks/patches via `StorageService`.

## Core Event Flows

## App and Window Lifecycle

1. Desktop requests open app via `ApplicationManagerService.openApplication(id)`.
2. Manager validates registry, memory, and instance limits.
3. `ApplicationFactory` creates window instance metadata.
4. `AppWindowComponent` dynamically creates embedded component.
5. Focus updates reorder open apps list and tray state.
6. Open app list is persisted to local storage key `applications`.

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
- App persistence uses raw object snapshots and should be narrowed to safe fields.

