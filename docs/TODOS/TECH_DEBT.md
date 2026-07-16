# Tech Debt TODOs

Status legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete

## Quick Wins (Do First)

- [x] Fix lint gate wiring (`npm run lint` currently non-functional).
  - Impact: High
  - Effort: S
  - Validation: lint command runs and reports real issues.

- [x] Fix test script include pattern so specs are discovered (currently 0 tests executed).
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

- [ ] Review the inactive OpenAI and weather integrations for archival or removal.
  - Impact: Medium
  - Effort: M
  - Decision: Do not build or deploy a new OpenAI/weather API boundary. These integrations are not active product requirements.
  - Safety: Preserve the existing prototypes until a focused reference, configuration, secret, and migration review confirms they can be removed without affecting CMS, OS, or deployment workflows.
  - Validation: no frontend vendor keys, no active route regression, no orphaned Functions secrets/configuration, and documented rollback/removal notes.

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

## Suggested Execution Order

1. Restore quality gates (lint/test/build reliability).
2. Patch clear correctness/security bugs.
3. Refactor high-impact services incrementally.
4. Address secret-handling and HTML-rendering hardening.
