# Core OS

Reusable OS-style framework infrastructure belongs here.

This boundary is for shell, windowing, dock, tray, terminal, context menu, tooltip, notification, filesystem, and OS service code. Current route files may still lazy-load legacy component locations while the migration is staged.

## Current migration state

- `os.routes.ts`, the device guard, and the unsupported-device page define the current `core-os` route boundary.
- `tooltip/` is the first reusable interaction package moved out of the legacy game tree. Live consumers import its standalone directive and types through `@core-os/tooltip`; the former directive, service, and overlay paths remain compatibility re-exports while downstream imports settle.
- `storage/` owns the IndexedDB-first OS key/value abstraction. Live consumers import `StorageService` through `@core-os/storage`; the former game-service path re-exports the same class so Angular retains one root service instance.
- Most runtime implementation still lives under `src/app/components/game`; that location is legacy structure, not public-site ownership.
- Migration remains active roadmap work and must proceed in small import-only batches with route, persistence, lifecycle, keyboard, and rendered regression checks.
- Do not combine folder migration with a visual rewrite or delete compatibility paths without reference and archive review.
- The legacy OS login screen keeps Firebase authentication in place while presenting password-reset success and failure through inline accessible feedback. Success uses a polite status announcement without stealing focus; errors remain assertive, and duplicate reset requests are disabled while the current request is pending.

## Device capability gate

`guards/os-device.guard.ts` protects the interactive `/os` routes before authentication or desktop assets load. The guard requires a viewport of at least 1024 × 640 plus hover and fine-pointer support. Phones, touch-only tablets, and undersized windows redirect to the public `/os-device-required` explanation page.

### Component inventory

- `osDeviceGuard`: route-level capability check for `/os` and `/os/:app`.
- `OsDeviceRequiredComponent`: lightweight public fallback with routes back to the blog and homepage.
- `tooltip/TooltipDirective`: hover and keyboard-focus trigger that preserves existing `aria-describedby` values, assigns wrapper tooltips to the actual focused descendant, gives the nearest nested tooltip ownership while restoring a still-hovered ancestor, prioritizes a still-focused disclosure over unrelated pointer hover, persists while the trigger remains active, and supports Escape dismissal.
- `tooltip/TooltipService`: single-overlay lifecycle owner, including reentrancy-safe replacement callbacks, timer cancellation for programmatic callers, teardown, and viewport-relative positioning.
- `tooltip/TooltipOverlayComponent`: plain-text presentation boundary with tooltip semantics, size, position, arrow, fade, and class options.
- `storage/StorageService`: Observable key/value and collection API backed by the existing `AppStorage` / `keyvalue` IndexedDB contract with an availability-only localStorage fallback. IndexedDB mutations emit after transaction completion, and persistence failures remain observable to callers.
- `LoginScreenComponent` (legacy location): shared public/OS authentication entry with accessible inline password-reset status and existing provider/email flows.

### Migration note

The guard is additive and leaves the legacy desktop, login, boot, sleep, and external route implementations in place. If the OS shell later gains a supported mobile layout, update the capability policy instead of duplicating or deleting the existing routes.

The tooltip migration changes package ownership without changing selectors or template inputs. It also removes HTML interpretation from tooltip copy, makes the service own its programmatic auto-dismiss timer, makes replacement callbacks reentrancy-safe, and gives focus users the same persistent disclosure and dismissal behavior as pointer users. Directive-owned tooltips remain visible until hover/focus ends or Escape dismisses them; the legacy `tooltipAutoDismiss` input remains accepted for template compatibility. Rollback is limited to restoring consumer imports and the three legacy implementations; routes, app IDs, persisted state, and Firebase behavior are unaffected.

The storage migration preserves the database, object store, raw keys, fallback selection, and public Observable signatures while hardening the contract: an absent value normalizes to `null`, IndexedDB mutations settle on transaction completion, storage failures reach subscribers, Task mutations serialize against the last successful snapshot, Patch Editor save/delete actions cannot overlap, and the localStorage fallback refuses origin-wide `clear()` calls. IndexedDB and JSON serialization are not equivalent, and an IndexedDB runtime failure does not silently switch data stores. Rollback requires restoring the implementation at the legacy path, the five consumer imports, and the associated failure-handling changes; no data migration or Firebase change is required.
