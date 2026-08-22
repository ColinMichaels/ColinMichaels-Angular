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

Finder now owns a writable device-local virtual filesystem under `core-os/filesystem`. It remains a browser filesystem and must not be presented as access to the user's Mac. The first-use importer reads the retained `/assets/files.json` tree, assigns deterministic IDs to seeded entries, adds the established favorite folders, and writes a version-1 snapshot to the existing `AppStorage` / `keyvalue` IndexedDB abstraction under `core-os.virtual-file-system.user.<encoded Firebase UID>`. A valid stored snapshot wins on later loads; an unknown or malformed version is left untouched and surfaced as an error instead of being overwritten.

Each entry has a stable ID, parent ID, normalized virtual path, timestamps, kind, tags, and optional children. The snapshot also carries an opaque safe-integer revision token. Normal mutations increment it; a confirmed recovery rotates an invalid or exhausted token to a fresh safe value. Mutations clone the last successful snapshot, validate names, metadata, sibling conflicts, UTF-8 serialized bytes, entry count, and tree depth, serialize against preceding work, compare the persisted token inside the storage transaction, and only then update the rendered tree. First-use seeding is presence-aware, and recovery values with a usable revision retain the same compare-and-set boundary, so a delayed or stale tab cannot replace a newer revisioned snapshot. A failed write therefore does not leave the Finder UI claiming that an unsaved change succeeded, and a stale tab reloads the newer revisioned snapshot instead of silently overwriting it.

Authentication is an isolation boundary: changing or clearing the Firebase user resets selection, navigation, open dialogs, and session undo before another account's key is loaded. The former origin-wide `core-os.virtual-file-system` value is deliberately not migrated into an account because its owner cannot be proven; it remains inert for rollback. Before cloning a version-1 value, Finder requires exact plain-object keys, dense bounded arrays, bounded scalar fields, and JSON-compatible data while counting serialized bytes incrementally. If account-scoped data is malformed, Finder offers a bounded diagnostic JSON export and a confirmed reset-to-seed action while preserving the unreadable value until the user chooses reset. Revision-bearing recovery values compare their stored token; revisionless corrupt values use the storage layer's presence-aware revision-zero compare, so confirmation may replace another revisionless corrupt value but cannot overwrite a newer valid nonzero revision. The warning tells the user to close other Finder tabs because revisionless values have no unique conflict token. The export represents ordinary JSON values completely; binary, cyclic, or oversized structured-clone values are explicitly described or truncated and marked incomplete rather than causing backup UI failure.

The delivered Finder supports selection, folder creation, rename, move, duplicate, case-insensitive search across names and tags, list/grid/column views, sorting, Trash/Put Back, confirmed permanent deletion, confirmed Empty Trash, and a bounded session undo stack. Each Finder window owns its path history, selection, search, sort, and captured dialog target while filesystem commits provide a shared refresh signal, so multiple windows stay current without changing one another's navigation. Stable IDs survive rename, move, Trash, and restore. A folder cannot move into itself, sibling conflicts fail explicitly, restore falls back to Home if the original parent no longer exists, and derived copy/restore names remain within the validated name bound. Finder activation parameters also reach an already running window, so the Dock Trash action opens the real virtual Trash instead of only focusing Finder.

## File association and preview contract

Application catalog entries may declare extensions, MIME types, and legacy virtual-file kinds. `ApplicationRegistryService` considers installed applications only and resolves ties in catalog registration order. A specific MIME value is authoritative: exact matches outrank MIME-family wildcards, and a specific mismatch does not fall back to a misleading filename. Extensions and legacy kinds are used only when MIME metadata is absent or generic (`application/octet-stream` or `binary/octet-stream`). Matching is case-insensitive, ignores MIME parameters, and does not treat a dotfile name as an extension.

Finder owns only the `FINDER_FILE_OPENER` injection port. Desktop supplies `ApplicationManagerService` as that adapter, which prevents the filesystem package from importing the application registry and creating a runtime dependency cycle. Double-click and Enter call the same port with a stable ID, display name, virtual path, type, optional MIME/size metadata, and the explicit `metadata-only` content state. The manager opens, focuses, or restores the resolved application through the existing lifecycle. Parameter-aware embedded apps receive later activation data through Angular's input contract so OnPush previews rerender without instance recreation, and programmatic lifecycle focus moves DOM focus to the resolved window. Unsupported and failed launches remain visible to the user. Folders navigate normally; folders in Trash stay inert until they are put back.

The current Music and Markdown Reader handlers are metadata previews, not content readers. They display the virtual item's metadata without loading or matching the Finder-selected item as audio, changing the active track, deriving an asset URL from a Finder filename, or claiming access to file bytes. Music still initializes its existing bundled default track when the app first opens. Direct bundled Markdown documents remain a separate allowlisted application-parameter path. Future content adapters must return a distinct `content-opened` result only after an explicit trusted byte or handle reference is available.

The remaining product path stays staged:

1. **Optional local-folder adapter** — add an explicit **Connect Folder** action using the browser File System Access API where supported. The user chooses the directory. Previously retained handles may be checked silently with `queryPermission`, but `requestPermission` must run only from a visible user gesture. Unsupported browsers continue using the virtual filesystem.
2. **Actual content opening and richer organization** — add bounded trusted content references to the dispatch contract, then add drag/drop and keyboard organization, expose copy/move conflict choices and redo, and keep operations transactional from Finder's perspective.

Local file bytes remain on the device unless a separately labeled upload action and Firebase data contract are approved. Directory handles belong in IndexedDB, not localStorage. The adapter must never probe arbitrary host paths, infer permission, turn a local selection into a background upload, or claim access that the browser has not granted. Object URLs must be revoked, file reads bounded, names treated as untrusted display data, and permission loss surfaced with a visible reconnect action.

## Migration and rollback

The Dock/window phase adds no route, Firebase, content, or persistent-data migration. Existing open-app records remain compatible. Rollback restores the prior Dock template and window controls, removes runtime `minimized` state and manager delegation, and leaves the `applications` payload untouched.

The Finder foundation introduces one device-local value per authenticated account, `core-os.virtual-file-system.user.<encoded Firebase UID>`, inside the existing `AppStorage` database and `keyvalue` object store. It does not write Finder data to Firebase or migrate the former unscoped browser value. There is no route, content, or host-filesystem migration. Rolling back the Finder implementation leaves account keys inert and preserved; reapplying the phase resumes from them. Do not delete a value during rollback unless that account explicitly chooses the recovery reset. Future schema versions must import or preserve version 1 before writing, and the optional local-folder adapter must remain removable without deleting or stranding virtual files.

The metadata-preview phase adds catalog associations and a Desktop-provided dispatch adapter but changes no virtual-filesystem schema, storage key, Firebase contract, route, or persisted `applications` payload. Preview parameters are runtime-only. Rolling back this phase removes the associations, dispatch port, and metadata-preview rendering while leaving version-1 Finder snapshots and previously open base application IDs compatible.

IndexedDB supplies the normal atomic revision transaction. The availability-only localStorage fallback may perform Finder compare-and-set only when the browser provides Web Locks; without that serialization primitive, writes fail visibly instead of attempting a race-prone overwrite.

## Verification gates

- Focused application lifecycle, Dock, window, and Desktop tests.
- Focused filesystem import, account isolation, candidate/stored validation, conflict detection, persistence-failure, serialized-mutation, organization, Trash/restore, undo, recovery, Finder keyboard/dialog UI, activation-parameter, OnPush rerender, lifecycle-to-DOM focus, association-precedence, metadata-preview, dispatch-adapter, and compatibility tests.
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
