# Roadmap

## Short-Term (1-2 Sprints)

- Re-enable trustworthy quality gates (lint, real test execution, stable build environment).
- Fix high-risk correctness and security bugs identified in audit.
- Add targeted tests around CLI parsing/auth, app manager lifecycle, and storage rehydration.
- Connect the publishing Calendar outbox to the first supported provider, starting with Notify/FCM or LinkedIn after credentials and account approvals are available.

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
- Content operations:
  move the dry-run Bulk Post Editor behind an authenticated server API with immutable artifacts, durable revisions, capability authorization, optimistic concurrency, approval/audit records, and idempotent apply/rollback jobs before enabling canonical writes.
- Blog AI authoring:
  refine the Firebase Functions metadata prompt, add admin-only quotas, and persist suggestion history.
- Social delivery:
  add isolated provider adapters, OAuth connection health, idempotent retries, manual retry/cancel controls, and delivery receipts without coupling article publication to provider uptime.
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
- Offline content operations:
  add resumable local operation queues only after the online artifact, revision, and apply contract is stable.

Dependencies:

- Backend support for proxy endpoints and auth/rate-limiting.

Risks:

- UI behavior drift during renderer hardening unless covered by tests and visual checks.
