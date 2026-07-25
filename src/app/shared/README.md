# Shared

Reusable application primitives belong here.

Use this boundary for shared UI, directives, pipes, Firebase facades, design tokens, and utilities that are not specific to the public site, OS framework, labs, or admin tools.

Current shared primitives:

- `site-header`: compact public blog header with a homepage brand link, live-results search launcher, post-list shortcut, and a responsive menu limited to navigation, install discovery, the role-aware Cat Corner entry point, and account/admin actions. Labs implementation remains preserved, while `/labs` redirects to `/blog` during the section redesign.
- `pwa`: install, connection, version, native-control, storage, Web Push, safe notification-routing, and app-badge services plus public install and offline/update status surfaces. Personal native, notification, and storage controls live on the protected Profile page. Cache policy remains owned by the root `ngsw-config.json` file; `pwa-worker.js` imports Angular's worker before adding badge events. Explicit saved-article snapshots, IndexedDB reading progress, favorites, and read-later management remain feature-scoped under `features/blog` and are managed from Profile.
- `user-account`: shared user document types and Firestore facade plus the reusable `CommunicationPreferencesComponent`. Email and newsletter choices are account-level owner writes; browser alerts remain per-device state delegated to the `pwa` boundary.
- `reader-preferences`: public Reader Assistance controls for text scale, spacing, contrast, motion, and the persisted site light/dark theme.
- `theme`: `SiteThemeService`, which applies the document-level `light`/`dark` class and stores the preference in `localStorage`.
- `user-view`: the persistent admin preview banner that identifies the effective user and roles, explains that Firebase requests retain the actor's admin identity, and provides a route-independent exit action.
- `not-found`: shared 404 route component.
