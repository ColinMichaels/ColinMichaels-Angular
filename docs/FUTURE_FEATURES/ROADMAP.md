# Roadmap

Updated August 22, 2026. This is the canonical list of active and deliberately deferred product work. Completed refactor history belongs in the [Tech Debt Completion Log](../TODOS/TECH_DEBT.md), dated audits remain evidence snapshots, and implementation history remains in the [Changelog](../CHANGELOG.md).

Local implementation, a saved Firebase version, a preview, and production deployment are separate states. Nothing in this roadmap should be read as production-live without exact-commit deployment and public verification.

## Delivered Recently

- The Profile page has a two-column account layout and a device-local Reading library for favorites, read-later, progress, and offline articles. The library shows the 10 most recently modified records per page with explicit Previous/Next pagination.
- Public topic pages use reusable cinematic image heroes while preserving canonical topic identity and Firestore ownership boundaries.
- Post summaries can project a bounded, deduplicated set of in-body images for interaction-triggered preview galleries without changing post documents.
- The release gate, supported Node runtime, package-import hardening, analytics quality signals, creator-channel identity, and Higgsfield lab preservation are documented and implemented in source.
- `npm run test:docs` validates tracked Markdown links, architecture-index coverage, status-authority labels, and roadmap review age as part of the local release gate.
- Existing posts have a CMS-role-gated **Save evidence only** path. The `updateEditorial` trusted mutation validates only allowlisted editorial metadata, uses expected-revision and idempotent-retry protection, records an audit event, and preserves all article blocks and unrelated fields. This is implemented and tested locally; production availability still depends on exact-commit Functions and Hosting deployment plus authenticated verification.
- The legacy OS login screen reports password-reset success with accessible inline status instead of a blocking browser alert, retains assertive reset errors, and prevents duplicate requests while a reset is pending.
- Admin Console Phase 3 is source-complete across Homepage Hero, Topics, Recommended Links, Comments, Media, and Users. Comments has serialized moderation plus retained-record Delete/Restore, Media separates Archived and Deleted recovery while gating background shortcuts, and Users has keyboard-correct tabs and accessible focus-managed dialogs. Exact-commit deployment and authenticated rendered verification remain part of the release gate below.
- The first Core OS migration batch moves tooltip behavior into `core-os/tooltip` with stable template inputs and legacy import re-exports. The shared lifecycle owns reentrancy-safe replacement and timer cleanup, renders copy as text, and keeps the correct focused control described until focus/hover ends or Escape dismisses it, without changing routes, app IDs, persisted state, or Firebase behavior.
- The second Core OS migration batch moves the IndexedDB-first OS storage abstraction into `core-os/storage`. Live consumers use the package alias, the legacy path re-exports the same root service, IndexedDB writes wait for transaction completion, failed operations reach callers, Task mutations serialize against the last successful state, Patch Editor mutations cannot overlap, and unsafe origin-wide localStorage clearing is disabled. The `AppStorage` database, `keyvalue` object store, existing keys, availability-only localStorage fallback, and Observable signatures remain stable.

## Now: Safety And Release Clarity

### 1. Reconcile and validate the release branch

- Reconcile the active feature branch with current `dev` before treating it as a release candidate.
- Run `npm run test:release` under the pinned Node version, plus focused browser or emulator checks for the changed scope.
- Deploy the exact tested commit only through the approved preview/production workflow.
- Recheck initial HTML, hydrated behavior, authenticated admin workflows, mobile layout, console health, and any production fields touched by the release.

### 2. Resume selective evidence review after authenticated release verification

- Start with high-impression product coverage, comparisons, health or safety material, and posts paired with a YouTube video.
- Recheck the live queue before quoting totals; read-only audit counts are snapshots, not durable backlog numbers.
- Add only supportable article-specific evidence, source dates, relationships, AI assistance, and synthetic-media disclosures.
- Use **Save evidence only** for disclosure-only legacy work; keep **Save Post** for an intentionally reviewed complete-document change.
- Preserve honest **Not yet classified** states for legacy personal stories or project journals when classification would add false certainty.

## Next: One To Two Sprints

### Begin Admin Console Phase 4 after Phase 3 release verification

Use the proven shared contracts to split only stable page-composition, view-model, and persistence responsibilities. Remove duplicate presentation code only after reference and archive review; preserve specialized Media and Editor density, current routes, role boundaries, and Firebase behavior. Do not combine this cleanup with the paused social-delivery backend.

### Close the current SEO release loop

- Treat the [August 2026 action plan](../SEO/AUDITS/2026-08-15/ACTION-PLAN.md) as the current audit queue; the root July reports are historical snapshots.
- Obtain editorial approval before applying title, description, taxonomy, or evidence recommendations to canonical CMS records.
- Verify the exact deployed Hosting/Functions release before Search Console, PageSpeed, GA4, indexing, or ranking conclusions are recorded.
- Continue evidence-led content packages and reciprocal YouTube work only after their package-specific approval gates.

## Later: Guarded Platform Work

### Content Operations

Move the dry-run Bulk Post Editor behind an authenticated server API with immutable artifacts, durable revisions, capability authorization, optimistic concurrency, approval/audit records, and idempotent apply/rollback jobs before enabling canonical writes.

### Social Delivery

External social delivery remains paused. Calendar composition, provider connection authorization, deterministic outbox protection, and existing Web Push ownership are implemented, but no provider delivery worker should run until pending outbox records are audited and an explicit enablement cutoff is approved. YouTube Community remains manual; LinkedIn member-versus-organization posting remains a product decision.

### Core OS Migration

Continue moving reusable implementation from `src/app/components/game` into `src/app/core-os` in small import-only batches. The app-registry/manager, windowing, dock, tray, tooltip, and browser-storage packages are complete; terminal, context menu, notification, settings, filesystem, and shell ownership remain. Preserve routes, persisted local state, window lifecycle, keyboard behavior, and compatibility exports; do not combine a move with a visual rewrite. Window controller extraction remains a separate internal refactor after the ownership migrations so it cannot silently change drag or resize behavior.

### Cross-Device Reading State

The current Reading library is intentionally device-local. Account-backed synchronization remains deferred until merge rules, deletion semantics, privacy controls, conflict handling, and offline reconciliation are defined.

## De-scoped Unless Requirements Change

- Do not restore the archived anonymous OpenAI/weather proxy or add browser vendor keys. Active role-gated CMS AI callables are a separate supported boundary.
- Do not infer or bulk-generate editorial evidence from article prose or media.
- Do not silently drain historical social outbox records when a provider connector is added.
- Do not move Labs or Core OS prototypes into the public application bundle merely to simplify folders.

## Completion Standard

An item moves out of this roadmap only when behavior, tests, architecture notes, migration/rollback guidance, component or operator inventory, and changelog agree. Deployment-dependent items also require exact-commit deployment and public or authenticated verification; local validation alone is not completion.
