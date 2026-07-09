# Core OS

Reusable OS-style framework infrastructure belongs here.

This boundary is for shell, windowing, dock, tray, terminal, context menu, tooltip, notification, filesystem, and OS service code. Current route files may still lazy-load legacy component locations while the migration is staged.

## Device capability gate

`guards/os-device.guard.ts` protects the interactive `/os` routes before authentication or desktop assets load. The guard requires a viewport of at least 1024 × 640 plus hover and fine-pointer support. Phones, touch-only tablets, and undersized windows redirect to the public `/os-device-required` explanation page.

### Component inventory

- `osDeviceGuard`: route-level capability check for `/os` and `/os/:app`.
- `OsDeviceRequiredComponent`: lightweight public fallback with routes back to the blog and homepage.

### Migration note

The guard is additive and leaves the legacy desktop, login, boot, sleep, and external route implementations in place. If the OS shell later gains a supported mobile layout, update the capability policy instead of duplicating or deleting the existing routes.
