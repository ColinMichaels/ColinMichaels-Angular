# Shared Finder and Terminal filesystem

Finder and Terminal use the same root `FileSystemService`. Creating or editing a virtual text file in Finder changes what `cat`, `grep`, `find` and `ls` see. Renaming, moving, duplicating, trashing, restoring and undoing files use the existing serialized persistence transactions. Opening a folder in either app leaves the other app's navigation independent; explicit `open .` and **Open Terminal here** hand off the requested folder.

## User experience

- Finder has an editable **Folder path** field, Go and parent controls. Absolute, relative, `~`, `.` and `..` paths resolve within virtual Home. Command/Control-Shift-G focuses the path field. Invalid paths preserve the current folder.
- Dot-prefixed files and their descendants stay out of normal listings and search results. **Hidden files** or Command/Control-Shift-period toggles them in the current window. Direct navigation into a hidden folder remains possible, matching Terminal's `cd` and ordinary `ls` behavior. Hidden state resets on account suspension and is not a new saved preference.
- Search stays scoped to the current folder and its descendants. **Names and tags** retains the old behavior; **Names and contents** also searches attached plain text. Results display their actual paths and **Show in Folder** reveals their containing directory. Finder and `grep` inspect the same stored text, with literal case-insensitive matching in Finder.
- **New Text File** accepts a name and plain text. **Edit Text** or the reader's Edit button opens an explicit Save/Cancel editor. It preserves the draft on failure, rejects a stale editor after another window saves, limits text to 16,384 characters, and records actual UTF-8 bytes. File reads use Angular text interpolation. File names retain existing validation and uniqueness rules.
- Both apps follow their current folder by stable entry ID when Finder renames or moves it. Removing that folder from the live tree falls back to Home. Historic terminal output remains historic; new prompts and commands use the current path. Old back/forward entries that no longer exist retain their existing unavailable-folder feedback.
- Finder starts at 800px wide with a viewport-bounded height so its file area and reader scroll within the existing desktop window. The existing list/grid/column views, keyboard selection, window chrome, Dock, authentication and device gate remain in use.

## Ownership and component inventory

| Owner | Change |
| --- | --- |
| `core-os/filesystem/FileSystemService` | Stable-ID lookup, optional text-inclusive scoped search, text creation and atomic edits with existing revision/history/storage bounds. New text operations reject account changes before mutation; expected source text detects stale editors. |
| `core-os/filesystem/finder-app/` | Path and parent controls, hidden-file filtering, search mode/result locations, reader/editor/create dialogs, explicit cross-app folder handoff and current-folder identity refresh. |
| `core-os/filesystem/folder-terminal-opener.ts` | `FOLDER_TERMINAL_OPENER` injection port; no filesystem-to-registry import. |
| Legacy desktop composition and `core-os/terminal/TerminalComponent` | Desktop binds the port to `ApplicationManagerService.openApplication('cli', {path})`; Terminal accepts only a folder path, validates it against the virtual filesystem and focuses its command input. No command text is executed through this handoff. |
| `core-os/terminal/TerminalSession` | Stable-ID tracking for the working directory; original virtual commands and pipe/parser boundaries remain. |
| `labs/terminal-adventure/` | Preserved fictional game content. Finder editing does not add a second filesystem or rewrite the story. |

No dependencies, Firebase configuration, rules, public routes, public content or CMS workflows change. The earlier uncommitted Terminal/Lost Signal foundation is included in this coherent Finder/Terminal review batch; its original prototype remains preserved. Command-line file-writing commands and a larger Finder redesign are deferred.

## Data, migration and rollback

The dedicated branch starts at `origin/dev` revision `aa1844b7a42aaf7243ea99e3673cdd297252d0bf`. Earlier local terminal work was backed up and reapplied onto that refreshed base; only the overlapping changelog needed a union of both entries. A recovery stash is retained.

The existing per-UID, browser-local version-1 snapshot, compare-and-set revision contract and storage keys remain. Earlier metadata-only and text-bearing snapshots load without reset or automatic content replacement. New files/edits are explicitly user-triggered. Files are not uploaded or cloud synchronized by these actions. Undo/redo is session-bounded; persisted file contents survive reload. Trash remains inert until restored.

Hosting is the only eventual runtime deployment scope. No Functions/Rules deployment is required. Revert this batch's source commit to remove its UI and terminal registration. After a user has saved text, keep the content-aware filesystem loader when rolling back to a pre-text UI; the older strict loader does not accept `textContent`. A complete downgrade needs an explicit backed-up migration, not a Finder reset. No merge or production deployment is authorized by creating the review PR.

## Validation

The flow under test is: local emulator sign-in → Terminal opens the fictional filebase in Finder → Finder creates/edits/searches/renames/moves a text note → Trash and undo restore it → Terminal reads the same content → renaming the working folder updates both app paths → reload retains files.

Use Node 24.15.0. Browser plugin not available, so rendered verification uses the repository Playwright workflow against `http://127.0.0.1:4336`. Disposable local Auth/profile fixtures are cleaned up, production Auth endpoints are blocked, and App Check remains enabled. The existing desktop minimum and phone explanation are preserved. Final verification:

- Fresh `npm ci` passes against the unchanged dev lockfile. It reports the existing 16 audit findings (2 moderate, 14 high); no dependency or lockfile changes are included.
- `npm run build` and `npm run lint` pass. The restricted build process aborted initially; the production build succeeds outside the restricted sandbox with Node 24.15.0.
- The focused Angular suite passes 161/161, including Finder/Terminal, filesystem, app-registry and desktop tests. It covers Unicode byte sizes, same-file reads/searches, persistence, undo/redo, moves/renames, text size/save failures, stale-editor and account-change rejection, and unsubmitted address-draft preservation.
- The normal local Playwright invocation cannot launch the newly required bundled Chromium/ffmpeg revisions after the clean install. With a temporary configuration importing the repository configuration, using installed Chrome 155 and disabling video only, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4336 npx playwright test e2e/terminal-adventure.spec.ts --config=/tmp/finder-playwright.config.ts --workers=1` passes three checks, with three deliberate platform exclusions. No browser dependencies or source test configuration were changed to work around the local runtime mismatch.
- The desktop flows pass with light/dark site settings at 1440×1000 and 1024×640, reduced motion, and viewport-bounded 800px Finder windows. They create/edit a note, compare name/content search, reveal its folder, hand off to Terminal, rename/move/Trash/undo it, rename and undo the working folder while both apps follow its ID, reveal hidden clues, and read the saved edited note after reload. The phone project verifies the existing capability explanation.
- Browser page exceptions and unexpected warnings/errors: zero. Local provider baselines remain recorded: seven/eight App Check debug-exchange 403 resources in the light/dark flows respectively, seven associated Auth warnings each, and two refused local `bootstrapUserProfile` requests plus two matching warnings per flow. The Functions emulator is not running. App Check and cloud settings remain unchanged.
- `npm run test:docs` passes for 124 tracked Markdown files; staged whitespace validation passes. Screenshots were inspected at both desktop sizes and retained outside source. Normal browser fixture cleanup removed its disposable local Auth accounts and profile records.

The browser flow caught an address-draft refresh race; the corrected Finder only changes the address field for a real location change and has a focused regression check. The original terminal prototype and earlier local work remain recoverable. Merge, production deployment and actual cloud-account gameplay verification remain separate.
