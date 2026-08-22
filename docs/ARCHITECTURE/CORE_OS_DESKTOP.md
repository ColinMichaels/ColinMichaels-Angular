# Core OS Desktop And Finder

## Product boundary

Core OS remains in this repository while it shares authentication, application components, and release infrastructure with ColinMichaels.com. The desktop components are lazy-loaded on `/os` and `/os/:app`; those two routes require both device capability and authentication guards. Login, boot, sleep, external redirect, and device-support routes are intentionally public support surfaces with their own lazy components. The `.core-os-scope` style boundary and `src/app/core-os` package surface keep OS implementation separate. Public website and blog routes must not import the desktop shell, application catalog, Finder, Dock, or window runtime.

This boundary keeps extraction practical without creating a second project prematurely. Reconsider a separate application when Core OS needs an independent deployment cadence, authentication provider, application/plugin SDK, or offline storage schema. At that point the manager, filesystem, and shell should move behind adapters instead of taking public-site services with them.

## Dock and window behavior

The Dock is a view of the canonical application registry and lifecycle rather than a separate icon list:

- installed general applications appear as launchable Dock items;
- Finder and System Settings remain available as core system items;
- another system application appears while it is running;
- one click opens an installed application or focuses and restores its most recent running instance;
- running applications retain a status indicator, and newly opened applications use a short launch bounce;
- minimizing records runtime-only `minimized` state and transfers focus to the next visible window or the desktop;
- the yellow control animates a window toward its matching Dock item, while the green control zooms or restores within the configured window and viewport bounds; and
- motion is removed when `prefers-reduced-motion` is active.

The minimize effect is Genie-inspired rather than a claim of pixel-identical macOS rendering. It uses the live window and Dock-item rectangles, preserves the window component and embedded application while hidden, and reverses the geometry on restore. The `applications` localStorage payload remains a base-app ID list: minimized state is deliberately not persisted, so a restored session opens usable visible windows.

Apple's current Finder and Dock documentation informs the interaction model: one-click application activation, running indicators, configurable minimize effects, familiar window controls, sidebar navigation, multiple file views, sorting, folders, and tags. The implementation remains web-native and must preserve keyboard and reduced-motion behavior.

## Finder storage contract

Finder currently renders seeded virtual demo data. It is not a durable filesystem and must not be presented as access to the user's Mac. The production path is staged:

1. **Virtual filesystem foundation** — move the filesystem cohort into `core-os/filesystem`; add stable entry IDs, create folder, rename, move, duplicate, Trash/restore, selection, search, tags, and deterministic IndexedDB persistence. Preserve the current seeded tree through a compatibility importer.
2. **Optional local-folder adapter** — add an explicit **Connect Folder** action using the browser File System Access API where supported. The user chooses the directory. Previously retained handles may be checked silently with `queryPermission`, but `requestPermission` must run only from a visible user gesture. Unsupported browsers continue using the virtual filesystem.
3. **Application opening and organization** — route supported MIME types to registered applications, add drag/drop and keyboard organization, expose copy/move conflict handling and undo, and keep operations transactional from Finder's perspective.

Local file bytes remain on the device unless a separately labeled upload action and Firebase data contract are approved. Directory handles belong in IndexedDB, not localStorage. The adapter must never probe arbitrary host paths, infer permission, turn a local selection into a background upload, or claim access that the browser has not granted. Object URLs must be revoked, file reads bounded, names treated as untrusted display data, and permission loss surfaced with a visible reconnect action.

## Migration and rollback

This Dock/window phase adds no route, Firebase, content, or persistent-data migration. Existing open-app records remain compatible. Rollback restores the prior Dock template and window controls, removes runtime `minimized` state and manager delegation, and leaves the `applications` payload untouched.

The Finder phases require their own migration notes before implementation. In particular, the virtual schema needs a versioned importer and rollback snapshot before seeded data becomes writable; the local-folder adapter must remain optional so removing it never deletes or strands virtual files.

## Verification gates

- Focused application lifecycle, Dock, window, and Desktop tests.
- Repository lint, production build, documentation validation, and full Angular/Functions release suites.
- Rendered `/os` interaction at a supported desktop viewport with animation and reduced motion, keyboard controls, focus transfer, restore, and console inspection.
- Public homepage/blog checks proving that no Dock, window, Finder, Core OS styles, or Core OS bundles leak into their shell.
- Authenticated rendered verification remains required on the exact deployed build; local source tests do not substitute for that release gate.

## Interaction references

- [Use the Dock on Mac](https://support.apple.com/en-ie/guide/mac-help/mh35859/mac)
- [Change Desktop and Dock settings on Mac](https://support.apple.com/en-ie/guide/mac-help/mchlp1119/mac)
- [Use the Finder on Mac](https://support.apple.com/en-ie/guide/mac-help/mchlp2605/mac)
- [Organize files in folders on Mac](https://support.apple.com/guide/mac-help/organize-files-with-folders-mh26885/26/mac/26)
- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/)
