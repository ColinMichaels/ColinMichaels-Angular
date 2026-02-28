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

- [x] Stabilize baseline unit tests to full pass (`88/88` in CI-like headless run).
  - Impact: High
  - Effort: M
  - Validation: `npm run test -- --watch=false --browsers=ChromeHeadless`.

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

- [~] Break `ApplicationManagerService` into smaller responsibilities (registry, persistence, lifecycle).
  - Impact: High
  - Effort: M
  - Validation: app launch/focus/close regression tests.
  - Progress: extracted localStorage open-app persistence into `ApplicationStatePersistenceService`.
  - Progress: extracted shared app IDs/types/window constraints into `application-manager.models.ts` and updated consumers.
  - Progress: extracted static app registration definitions into `application-catalog.ts`.

- [~] Stabilize `TypewriterService` timer and callback semantics.
  - Impact: Medium
  - Effort: M
  - Validation: CLI typing flow checks and queue behavior tests.

- [~] Reduce startup randomness/cost in `FileSystemService`.
  - Impact: Medium
  - Effort: M
  - Validation: finder behavior and startup responsiveness.

## Larger Changes (Riskier, Stage Later)

- [ ] Move OpenAI and weather calls behind backend proxy/functions.
  - Impact: High (security)
  - Effort: L
  - Validation: integration tests and production key removal.

- [ ] Replace `innerHTML` rendering paths with safe renderers.
  - Impact: High (security)
  - Effort: L
  - Validation: XSS regression tests + UI snapshot/manual checks.

- [~] Enforce supported Node LTS through `.nvmrc`/`engines` and CI checks.
  - Impact: Medium
  - Effort: S
  - Validation: consistent local/CI build success.

## Suggested Execution Order

1. Restore quality gates (lint/test/build reliability).
2. Patch clear correctness/security bugs.
3. Refactor high-impact services incrementally.
4. Address secret-handling and HTML-rendering hardening.
