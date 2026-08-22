# Tech Debt Completion Log

Reviewed August 21, 2026. Every item in this original stabilization/refactor plan is complete. This file is retained as implementation and validation history; it is not the active backlog. Use the [Roadmap](../FUTURE_FEATURES/ROADMAP.md) for current work and record new debt there or in the owning architecture document before adding another item here.

Status legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete

## Quick Wins (Do First)

- [x] Isolate public-site and Core OS global CSS ownership.
  - Impact: High
  - Effort: M
  - Progress: reduced `styles.scss` to an explicit shared/Core OS/public entry manifest; moved public theme and Reader Assistance rules into `_public-globals.scss`; split public and OS motion; moved OS gradients and macOS/game globals behind `.core-os-scope`; assigned mutually exclusive route scopes on `app-root`; and returned window-header/dock chrome to component ownership.
  - Validation: focused shell, dock, and app-window specs (`7/7`); desktop and Pixel 7 visual, search, motion, and scope-boundary Playwright coverage (`8/8`) proving Core OS controls are inert on public routes and active on OS routes; repository lint and production build; full Angular suite (`764/764`); and rendered homepage/blog/login checks.

- [x] Consolidate the public layout and surface system without changing Core OS styling.
  - Impact: High
  - Effort: M
  - Progress: added public-route-scoped width, gutter, spacing, radius, and elevation tokens; exposed matching Tailwind theme values; normalized semantic page/layout, card, field, button, media, overlay, header-search, icon-control, menu-link, and feedback primitives; adopted shared reading/wide/prose shells across blog, search, privacy, and author routes; and moved the public comments stack onto the same card/field/button/state contracts.
  - Validation: semantic layout assertions across homepage, archive, privacy, author, header, search-drawer, and comments specs (`14/14` focused for the final header/comments slice); desktop rendered checks for homepage rhythm, archive width, light/dark parity, overlays, 44px controls, focus restoration, and horizontal overflow; repository lint and production build; the full Angular suite (`765/765`); and desktop/Pixel 7 Playwright coverage for the visual system, search overlay, motion, and style ownership (`8/8`).

- [x] Harden public-shell keyboard navigation, focus visibility, and compact-layout targets.
  - Impact: High
  - Effort: M
  - Progress: added skip navigation, removed the logo's route-independent H1, exposed the featured-post title as an H2, contained and restored focus for search and membership dialogs, announced live search-result counts, replaced the global focus-outline reset, corrected muted campaign contrast, and raised header/dialog controls to 44px targets.
  - Validation: focused header, membership, and hero specs (`34/34`); desktop and 390x844 live browser checks for headings, focus, Escape restoration, touch metrics, overflow, and console health; repository lint and build; full Angular suite (`763/763`); and content-backed desktop/mobile Playwright suite (`6/6`).

- [x] Resolve the reader-membership auth race and anonymous client-log writes.
  - Impact: High
  - Effort: M
  - Progress: added explicit initializing/authenticated/unauthenticated/unavailable auth states, made membership prompting wait for resolved anonymous identity and cancel on sign-in, consolidated duplicate authentication guards, and moved the shared/Core OS logger to local buffer and console output without Firestore persistence.
  - Validation: focused auth, campaign, guard, route-inventory, and logging specs; repository lint, build, full unit suite, and rendered signed-out blog checks.

- [x] Restore lint gate wiring (the original audit found `npm run lint` non-functional).
  - Impact: High
  - Effort: S
  - Validation: lint command runs and reports real issues.

- [x] Fix the test script include pattern (the original audit discovered 0 specs).
  - Impact: High
  - Effort: S
  - Validation: test command executes existing specs.

- [x] Fix `CLIService` auth bug in `su` command path.
  - Impact: High
  - Effort: S
  - Validation: CLI command behavior tests/manual checks.

- [x] Fix notification dismiss/click behavior to use notification `id` consistently.
  - Impact: Medium
  - Effort: S
  - Validation: notification component spec/manual UX check.

- [x] Add URL validation allowlist in redirect guard.
  - Impact: High
  - Effort: S
  - Validation: guard unit tests for allowed and blocked URLs.

- [x] Stabilize baseline unit tests to full pass (`573/573` in CI-like headless run).
  - Impact: High
  - Effort: M
  - Validation: `npm run test -- --watch=false --browsers=ChromeHeadless`.

- [x] Clear the root and Functions Dependabot backlog.
  - Impact: High (security)
  - Effort: M
  - Progress: reduced the root audit from `10` vulnerable paths (`3` low, `7` high) and the Functions audit from `10` vulnerable paths (`9` moderate, `1` high) to `0` in both lockfiles. Aligned Angular runtime/tooling patches, accepted compatible transitive updates, retained Firebase Admin 13 to honor the Firebase Functions peer contract, and documented the temporary Vite/esbuild and Google-client/UUID overrides with removal conditions.
  - Validation: both npm audits report `0`; app and Functions builds pass under supported Node runtimes; lint passes with `0` findings; the full Angular suite passes (`573/573`); and all Functions tests pass (`27/27`).

- [x] Resolve the OS/game template-accessibility lint backlog.
  - Impact: High
  - Effort: M
  - Progress: reduced accessibility errors from `82` to `0` by replacing custom click targets with native controls, associating labels, adding accessible names and state, and completing system tray, desktop, Finder, notification, and SpaceX semantics.
  - Validation: touched-file ESLint pass, focused interaction tests, full headless suite (`517/517`), and application build.

- [x] Resolve the remaining Firebase explicit-typing lint backlog.
  - Impact: Medium
  - Effort: M
  - Progress: replaced Firebase production and test `any` usage with explicit document, filter, upload, batch, log, snapshot, and test-harness types. Typed the two dormant weather findings without adding or activating an external API integration.
  - Validation: repository lint passes with `0` errors and `0` warnings; focused Firebase/weather specs, the full headless suite, and the application build pass.

- [x] Migrate off the deprecated Angular Webpack build package.
  - Impact: Medium
  - Effort: S
  - Progress: moved build, serve, extraction, and Karma targets to `@angular/build`, removed 354 obsolete Webpack-era packages from the lockfile without changing retained package versions, and switched Day.js to its ESM distribution.
  - Validation: focused and full Karma execution no longer report the deprecated-builder warning; repository lint and build pass, and CommonJS warnings are reduced from `7` to `5` audio-only findings.

- [x] Replace the legacy SoundFont CommonJS loader with browser-native audio.
  - Impact: Medium
  - Effort: M
  - Progress: preserved the SoundFont driver and preset catalog while replacing whole-instrument CommonJS loading with cached per-note `fetch`, `decodeAudioData`, gain envelopes, retry eviction, and deterministic teardown. Removed `soundfont-player` and six transitive packages.
  - Validation: native SoundFont and PatchService specs pass (`11/11`), repository lint and build pass, and CommonJS warnings are reduced from `5` to `2`.

- [x] Replace the CommonJS custom-oscillator wrapper.
  - Impact: High
  - Effort: M
  - Progress: preserved all 25 oscillator names with a typed local factory, imported only the 15 required external wave tables, cached generated waves per audio context, corrected multi-note gain/pan routing, and removed `web-audio-oscillators` while retaining its MIT wave-table source as a direct dependency.
  - Validation: oscillator and PatchService specs pass (`9/9`), the full headless suite passes (`525/525`), repository lint and build pass, the waveform-heavy lazy chunk drops from about `979 kB` to `284 kB`, and CommonJS warnings are reduced from `2` to `1`.

- [x] Replace the Tone.js sampled-preset runtime with native Web Audio.
  - Impact: High
  - Effort: M
  - Progress: retained the compatibility `tone-sampler` settings ID and all 26 preset mappings while replacing eager Tone.js sampler loading with cached nearest-sample fetch/decode, pitch shifting, gain release envelopes, failed-request eviction, and deterministic source/context teardown. Removed Tone.js and three transitive packages.
  - Validation: native sampler, SoundFont, and PatchService specs pass (`16/16`), the full headless suite passes (`530/530`), dependency audit reports `0` vulnerabilities, lint passes with `0` findings, and the production build passes with `0` optimization warnings while removing the roughly `348 kB` Tone lazy chunk.

- [x] Replace the final allowlisted CommonJS Editor.js tool.
  - Impact: Medium
  - Effort: S
  - Progress: replaced `editorjs-youtube-embed` with a typed local YouTube block while preserving the saved `youtubeEmbed` and `{url}` contract, expanded URL validation and accessible previews, and removed the package plus the final `allowedCommonJsDependencies` configuration.
  - Validation: YouTube tool, Editor.js integration, and adapter specs pass (`17/17`), the full headless suite passes (`533/533`), dependency audit reports `0` vulnerabilities, and the production build passes with `0` warnings and no CommonJS exemptions.

## Medium Refactors

- [x] Refactor `SettingsService` for typed models and safe subscription lifecycle.
  - Impact: High
  - Effort: M
  - Validation: typed internal stores, guarded keyed-setting operations, explicit persistence subscriptions, `tsc --noEmit`, focused eslint pass.

- [x] Optimize `ScrollClassToggleDirective` scroll handling by batching with `requestAnimationFrame` and caching class lists.
  - Impact: Medium
  - Effort: S
  - Validation: manual scroll regression across main page header transitions.

- [x] Move `PatchEditorComponent` inline template styles into component stylesheet.
  - Impact: Low
  - Effort: S
  - Validation: visual regression check for patch envelope controls.

- [x] Align `StorageService` strategy behavior, including `getAllKeys`.
  - Impact: Medium
  - Effort: M
  - Validation: storage-focused unit tests across strategy paths.

- [x] Break `ApplicationManagerService` into smaller responsibilities (registry, persistence, lifecycle).
  - Impact: High
  - Effort: M
  - Validation: app launch/focus/close regression tests, `application-lifecycle.service.spec.ts`, `application-manager.service.spec.ts`, `tsc --noEmit`.
  - Progress: extracted localStorage open-app persistence into `ApplicationStatePersistenceService`.
  - Progress: extracted shared app IDs/types/window constraints into `application-manager.models.ts` and updated consumers.
  - Progress: extracted static app registration definitions into `application-catalog.ts`.
  - Progress: extracted registry storage and app lookup/query behavior into `ApplicationRegistryService`.
  - Progress: extracted open/close/focus/memory/persistence lifecycle state into `ApplicationLifecycleService`.
  - Progress: normalized saved instance IDs during restore and forced deterministic re-open for repeated entries.
  - Progress: switched persisted open-app payloads to base app IDs for safer multi-instance restoration.
  - Progress: added focused unit specs for lifecycle restore/instance behavior (`application-lifecycle.service.spec.ts`, `application-manager.service.spec.ts`).
  - Progress: removed runtime `running/instanceIndex` mutation from registry app entries; manager now derives these values from live open instances.

- [x] Stabilize `TypewriterService` timer and callback semantics.
  - Impact: Medium
  - Effort: M
  - Validation: CLI typing flow checks, queue behavior unit tests (`typewriter.service.spec.ts`), `tsc --noEmit`.

- [x] Reduce startup randomness/cost in `FileSystemService`.
  - Impact: Medium
  - Effort: M
  - Validation: finder behavior and startup responsiveness, deterministic startup unit tests (`file-system.service.spec.ts`), `tsc --noEmit`.
  - Progress: replaced random deep favorite-folder generation at startup with deterministic lightweight seeded folder content.

## De-scoped / Removal Review

- [x] Review the inactive OpenAI and weather integrations for archival or removal.
  - Impact: Medium
  - Effort: M
  - Decision: Do not build or deploy a new OpenAI/weather API boundary. These integrations are not active product requirements.
  - Progress: preserved active role-gated CMS OpenAI callables; moved the undeployed anonymous generic proxy to `archive/integrations/legacy-generic-api-proxy`; converted the referenced terminal AI and Weather prototypes to deterministic local behavior; removed browser `APP_API_URL` generation, examples, and workflow requirements; and documented restoration and credential-rotation requirements without changing Firebase configuration.
  - Validation: no Angular HTTP, location, generic API URL, or vendor-key dependency remains in the two prototypes; focused terminal/Weather/CLI coverage (`8/8`), the full Angular suite (`771/771`), repository lint, app and Functions builds, environment generation without `APP_API_URL`, public visual regression on desktop/mobile (`2/2`), retired-endpoint and OS-guard coverage on desktop/mobile (`2/2`), and rendered route/console inspection.

## Larger Changes (Riskier, Stage Later)

- [x] Replace public blog and main-site `innerHTML` rendering paths with safe renderers.
  - Impact: High (security)
  - Effort: L
  - Progress: centralized sanitized Editor.js rich-text rendering, removed public blog/main `[innerHTML]` bindings and trusted-HTML bypasses, converted metadata/share extraction to inert DOM parsing, and rendered terminal/contact strings as text. Remaining direct HTML manipulation is isolated to reusable OS/game framework paths and is outside the current public-site scope.
  - Validation: repository scan finds no public blog/main/CMS implementation matches for `innerHTML`, `bypassSecurityTrustHtml`, `insertAdjacentHTML`, or `outerHTML`; focused XSS/rendering tests pass (`39/39`); the full headless suite passes (`541/541`); and live homepage, blog archive, and article rendering checks preserve headings, lists, links, images, and contents navigation without active-content nodes.

- [x] Enforce supported Node LTS through `.nvmrc`/`engines` and CI checks.
  - Impact: Medium
  - Effort: S
  - Validation: consistent local/CI build success, `.nvmrc` present, and workflow Node setup parity.

## Historical Execution Order

The plan below is preserved to explain the sequence used to close this backlog. All listed stages are complete; it is not a current recommendation queue.

1. Restore quality gates (lint/test/build reliability).
2. Patch clear correctness/security bugs.
3. Refactor high-impact services incrementally.
4. Address secret-handling and HTML-rendering hardening.
