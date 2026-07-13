# Roadmap

Updated July 13, 2026. Completed foundation work is recorded here so it is not repeatedly scheduled as future scope.

## Delivered Foundations

- Quality gates are wired, Node is pinned, real specs are discovered, and CLI/auth, application lifecycle, storage, typewriter, and deterministic file-system behavior have focused coverage.
- `ApplicationManagerService` responsibilities and `SettingsService` internals were decomposed without changing public APIs.
- Editor.js post authoring persists through the Firebase-backed CMS, with a public read-only block renderer and Media Library-backed assets.
- The frontend no longer receives OpenAI or weather vendor keys; it calls the configured `APP_API_URL` boundary.
- The Media Library supports browsing and managed CMS asset selection. Further generated-media lifecycle work remains product scope.

## Short-Term (1-2 Sprints)

- Define and deploy the real protected OpenAI/weather API boundary. The legacy `functions/index.js` prototype is not the TypeScript Functions deploy entry and must not be promoted without authentication/App Check decisions, payload validation, quotas, and rate controls.
- Start the rendering-safety program with an inventory that separates plain-text terminal/tooltip/notification sinks from the blog's intentionally sanitized rich-content renderer; add XSS regressions before changing visual behavior.
- Deploy and validate the completed SEO route/fallback work, then run Search Console/PageSpeed checks and begin qualified outreach.

Dependencies:

- A backend ownership decision for `APP_API_URL` and its authentication/rate-limit policy.
- Deployed URLs and account access for SEO measurement.

## Paused / Resume Later

- External social auto-posting is pinned after completing Calendar timing/media composition, Editor deep linking, deterministic queue protection, and existing Web Push ownership. Resume with provider registration and LinkedIn OAuth/worker integration after the higher-priority feature; audit pending outbox records and approve an explicit enablement cutoff before any historical delivery can run.
- Resumption depends on provider credentials, account approvals, and an explicit member-versus-organization posting decision.
- The next active feature is intentionally tracked in its own task rather than inferred here.

## Medium-Term (2-4 Sprints)

- Content operations:
  move the dry-run Bulk Post Editor behind an authenticated server API with immutable artifacts, durable revisions, capability authorization, optimistic concurrency, approval/audit records, and idempotent apply/rollback jobs before enabling canonical writes.
- Blog AI authoring:
  refine the Firebase Functions metadata prompt, add admin-only quotas, and persist suggestion history.
- Social delivery:
  add isolated provider adapters, OAuth connection health, idempotent retries, manual retry/cancel controls, and delivery receipts without coupling article publication to provider uptime.
- Strong typing pass:
  remove high-impact `any` usage in service contracts and dynamic payloads.
- Core OS migration:
  move reusable implementation out of `components/game` in small import-only batches with compatibility review and route/lifecycle verification.

Dependencies:

- Baseline tests in key services/components.

Risks:

- Refactor can affect runtime sequencing in desktop/window lifecycle if done too broadly.

## Long-Term (4+ Sprints)

- Product evolution:
  richer app ecosystem, saved desktop sessions, advanced window tiling/layout presets.
- AI media lifecycle:
  extend the CMS Media Library with intentional replacement/deletion rules for generated thumbnails.
- Offline content operations:
  add resumable local operation queues only after the online artifact, revision, and apply contract is stable.

Risks:

- OS moves can affect runtime sequencing if done in broad rewrites.
- Renderer hardening can change terminal and overlay presentation without focused behavior and visual tests.
- Bulk apply and provider delivery can create irreversible external state unless authorization, idempotency, audit, retry, and rollback contracts are designed first.
