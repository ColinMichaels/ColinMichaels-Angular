# Terminal and Lost Signal

The existing `/os` desktop and `cli` application identity now present a small Mac-inspired terminal. Type `adventure` to add or resume **Lost Signal**, then `cat README.txt`. `open .` opens the current folder in the existing Finder. The first note points to searchable system/access logs; those reveal `station-7/route.txt`, whose clue explains dot-prefixed folders and `ls -a`. Reading `.relay/message.txt` completes the short story. Players can read the same files in either app; the story is not gated by which app they use.

## Scope and component inventory

| Owner | Responsibility |
| --- | --- |
| `core-os/terminal/terminal.component.*` | Mac-style neutral dark shell in the existing traffic-light window, readable 13px Menlo-family text, plain-text scrollback, 150 retained command blocks, 50 history entries with draft restoration, Command-K/Control-L clear, Control-C input discard, no typing effects or audio. |
| `core-os/terminal/terminal-session.ts` | Per-window virtual working directory; `help`, `pwd`, `ls [-alh]`, `cd`/`cd -`, `cat`, `head`, `tail`, literal `grep [-rinF]`, scoped `find` with `-name`/`-iname`/`-type`, `tree [-a]`, `wc`, `echo`, `open`, `whoami`, `clear`, `exit`. The component also exposes session `history`. Tab completes commands and escaped/quoted paths. Quoted/escaped paths preserve case. `~` maps to the virtual Home `/`; parent traversal stays within that root. This is a bounded simulation, not a complete zsh implementation. |
| `core-os/terminal/terminal-adventure.ts` | Optional adventure-start injection port. Core OS does not import Labs story content. |
| `labs/terminal-adventure/lost-signal.ts` | Fictional clue content and desktop-provided installation adapter. Five text files, a logs folder, a station folder and a hidden relay folder, beneath `/Documents/Lost Signal`. |
| `core-os/filesystem/file-system.service.ts` | Read-only entry lookup and atomic bundled-folder installation using existing identity isolation, serialized writes, revision conflict detection, undo/redo, validation and persistence. Optional text content is limited to 16,384 characters per file and included in the existing 5 MB UTF-8 snapshot budget. Folders cannot hold text content. |
| `core-os/filesystem/finder-app/` | Double-click or Enter opens bundled text in an inline reader using text interpolation. Close/Escape returns focus to its item. Navigation, removed files and identity suspension clear the preview. Other file types retain their existing metadata-only application dispatch. |
| Legacy desktop and catalog | `APP_ID.cli` remains stable; catalog label is Terminal. Launch during `ngOnInit` makes the first desktop render include the window. The `TERMINAL_ADVENTURE` provider belongs to the desktop. |

Read-only pipelines pass text between supported inspection commands (up to eight stages); each stage output is capped at 64,000 characters. The parser preserves quoted pipes and rejects unsupported operators. `grep` uses literal matching, including `-i`/`-n`/`-r`; `find` name patterns support `*`/`?`. Long listings show fictional read-only permissions/persona, stored dates, and UTF-8 text sizes; unattached sizes display `-`. These displayed permissions are simulation metadata, not an authorization model.

No dependencies, routes, Firebase configuration, cloud authorization, account permissions, or public-site pages change. Existing desktop/Finder/window/Dock systems are reused. Actual shell execution, network tools, decryption, AI requests and real local-file access are outside this slice. `whoami` returns the fictional local persona `colin`, not a Firebase identity or privilege claim. Completion is the recovered text itself; no score, grant, badge or separate persisted reward is introduced.

## Preservation and migration

The original `components/game/apps/cli-game`, CLI service, level loader, JSON/command prototypes, design docs, typewriter and original intro remain preserved. `onBeginLegacyInvestigation()` retains the old intro; it is no longer the desktop startup. The old loader is not mounted during normal desktop use. The public homepage's separate typewriter is unchanged.

Existing metadata-only version-1 snapshots load as before. `adventure` explicitly installs the new text-bearing subtree in one transaction; simply opening Terminal does not install it. Stable IDs make a repeated start resume the existing folder after moves or renames. Resuming an earlier trail adds the new logs folder separately without replacing its existing clues, with identity suspension checked between installations. A name collision fails without overwrite; a trashed bundle must be restored using Finder. Missing individual clues are not silently repaired: Finder undo/Trash recovery remains available. A failed save, account switch or stale revision does not publish the attempted subtree in memory. These are browser-local files per signed-in UID, not cloud-synchronized account saves.

A prior build's strict snapshot loader will reject the new optional `textContent` field. For a UI rollback after someone starts the puzzle, retain the content-aware filesystem loader while reverting the catalog/desktop/Terminal UI. Do not reset Finder data. A complete downgrade needs an explicit backed-up data migration for text-bearing snapshots. This is a Hosting-only source change; no Functions or Rules deployment is needed.

## Verification

The flow under test is: local emulator sign-in → `/os` → `adventure` → Terminal reads the first note → Finder reads the route clue → Terminal reveals the hidden folder and recovers the message → Finder reads the same message → reload preserves the files.

Browser plugin not available; use the repository Playwright workflow. Browser tests create/delete only disposable local Auth emulator accounts and their local profile records, block production Auth endpoints, and preserve existing App Check behavior. Desktop checks cover light/dark site settings at 1440×1000 and 1024×640 with reduced motion. Phone checks retain the existing capability explanation rather than attempting a touch-only OS.

Initial terminal-slice verification used Node 24.15.0:

- `npm run build` and `npm run lint` pass. The first sandboxed build aborted; running the same build outside the restricted sandbox succeeded. No build warnings were emitted.
- `npm test -- --watch=false --browsers=ChromeHeadless` with includes for `src/app/core-os/filesystem/**/*.spec.ts`, `src/app/components/game/desktop/*.spec.ts`, `src/app/core-os/app-registry/*.spec.ts`, and `src/app/core-os/terminal/*.spec.ts`: 151/151 pass. Covers the shared clue trail, quoted paths, hidden files, independent sessions, repeated-command/draft history, escaped text, actual window exit, pending identity changes, saved text/reload, installation collisions, moves, Trash, storage failure and text bounds, plus retained framework checks. Added shell checks cover scoped filename searches, recursive literal-content search, read pipelines, quoted operator handling, line/word counts, Tab completion, `cd -`, and non-destructive log additions to an earlier save.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4336 npx playwright test e2e/terminal-adventure.spec.ts --workers=1`: three pass, with three deliberate platform exclusions (the desktop puzzle does not run on the phone project; the phone guard check does not run on desktop). Both desktop sizes complete the real emulator sign-in, exercise `ls -la`, `tree -a`, `find . -name "*.log" -type f`, recursive `grep`, a `cat | grep | tail` pipeline, and actual Tab path completion, then the full shared-file story, verify fixed 420px window height before/after clear, preserve files across reload, and exercise keyboard reading/history and preview focus restoration. The phone project verifies the existing redirect.
- Browser page exceptions: zero. Unexpected console warnings/errors: zero. Each desktop flow records six existing local App Check debug-exchange HTTP 403 resources plus seven associated Auth warnings, and two refused local `bootstrapUserProfile` requests plus two matching warnings because the Functions emulator is not running. The test attaches these provider baselines and rejects other console issues; it does not disable App Check or change any cloud setting.
- `npm run test:docs` passes for 121 tracked Markdown files; the new architecture note is untracked until a separately authorized commit. `git diff --check` passes.

Screenshots were inspected at both desktop sizes. The initial browser failure exposed a desktop first-render issue after removal of the old level loader; launching the shell in `ngOnInit` and explicitly marking asynchronous terminal results for change detection fixed it. Visual review also corrected the content-growing default height and public focus-ring leakage within the terminal input. Test accounts and local profile fixtures were removed. At that initial checkpoint no commit, push, PR, deployment, production gameplay test, or physical-device acceptance was claimed; the Finder follow-up below records the later review batch.

## Deferred work

Finder visual polish, richer text editing, hidden-file toggling in Finder, multi-stage stories, actual progress/reward models, full shell grammar, redirection, virtual file creation/editing commands, SSH/network simulations, decryption, AI hints and additional OS puzzle applications remain future work. This slice establishes a shared file trail rather than expanding those systems.

## Finder integration follow-up

Finder now adds path navigation, hidden-file controls, content searching, text creation/editing and Open Terminal Here over the same files. Both apps track their current folder by stable ID. See [Shared Finder and Terminal filesystem](./FINDER_TERMINAL_FILESYSTEM.md) for current validation and rollback; the checks above describe the earlier terminal slice.
