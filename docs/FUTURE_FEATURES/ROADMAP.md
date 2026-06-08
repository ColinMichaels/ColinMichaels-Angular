# Roadmap

## Short-Term (1-2 Sprints)

- Re-enable trustworthy quality gates (lint, real test execution, stable build environment).
- Fix high-risk correctness and security bugs identified in audit.
- Add targeted tests around CLI parsing/auth, app manager lifecycle, and storage rehydration.

Dependencies:

- Supported Node runtime for reproducible builds.
- Stable lint config path.

Risks:

- Existing script/config drift may hide real code issues until gates are repaired.

## Medium-Term (2-4 Sprints)

- Service decomposition:
  split `ApplicationManagerService` and simplify `SettingsService`.
- Blog/CMS foundation:
  connect the Editor.js draft save flow to Firebase and add media upload rules.
- Blog AI authoring:
  refine the Firebase Functions metadata prompt, add admin-only quotas, and persist suggestion history.
- Strong typing pass:
  remove high-impact `any` usage in service contracts and dynamic payloads.
- Performance cleanup:
  reduce startup random generation and avoid avoidable subscription churn.

Dependencies:

- Baseline tests in key services/components.

Risks:

- Refactor can affect runtime sequencing in desktop/window lifecycle if done too broadly.

## Long-Term (4+ Sprints)

- Security hardening:
  migrate secret-bearing API calls to backend proxy.
- Rendering safety:
  remove risky `innerHTML` patterns in terminal/tooltip/notification systems.
- Product evolution:
  richer app ecosystem, saved desktop sessions, advanced window tiling/layout presets.
- AI media generation:
  add a richer CMS media library for browsing, replacing, and deleting generated thumbnails.

Dependencies:

- Backend support for proxy endpoints and auth/rate-limiting.

Risks:

- UI behavior drift during renderer hardening unless covered by tests and visual checks.
