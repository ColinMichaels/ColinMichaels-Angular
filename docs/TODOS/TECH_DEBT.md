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

- [x] Stabilize baseline unit tests to full pass (`517/517` in CI-like headless run).
  - Impact: High
  - Effort: M
  - Validation: `npm run test -- --watch=false --browsers=ChromeHeadless`.

- [x] Resolve the OS/game template-accessibility lint backlog.
  - Impact: High
  - Effort: M
  - Progress: reduced accessibility errors from `82` to `0` by replacing custom click targets with native controls, associating labels, adding accessible names and state, and completing system tray, desktop, Finder, notification, and SpaceX semantics.
  - Validation: touched-file ESLint pass, focused interaction tests, full headless suite (`517/517`), and application build.

- [~] Resolve the remaining Firebase explicit-typing lint backlog.
  - Impact: Medium
  - Effort: M
  - Remaining: `98` Firebase production/test errors; the separate `2` weather errors are intentionally deferred with the unused weather integration.
  - Validation: preserve the Firestore emulator/mock contracts, run focused Firebase specs, then repeat the repository lint, test, and build gates.

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

- [ ] Replace `innerHTML` rendering paths with safe renderers.
  - Impact: High (security)
  - Effort: L
  - Validation: XSS regression tests + UI snapshot/manual checks.

- [x] Enforce supported Node LTS through `.nvmrc`/`engines` and CI checks.
  - Impact: Medium
  - Effort: S
  - Validation: consistent local/CI build success, `.nvmrc` present, and workflow Node setup parity.

## Suggested Execution Order

1. Restore quality gates (lint/test/build reliability).
2. Patch clear correctness/security bugs.
3. Refactor high-impact services incrementally.
4. Address secret-handling and HTML-rendering hardening.
