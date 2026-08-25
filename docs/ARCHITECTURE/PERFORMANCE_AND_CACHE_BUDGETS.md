# Performance And Cache Budgets

## Purpose

This document defines the production boundaries introduced by the August 2026 memory, caching, and CMS-save hardening pass. The work preserves explicit canonical publishing, existing Editor.js compatibility, public routes, Core OS concepts, and device-local reader data while reducing repeated whole-document work and unbounded runtime retention.

The browser must not solve performance problems by silently persisting authenticated Firestore data. Firestore continues to use its default memory-backed web cache. Explicit offline articles, reader-library metadata, CMS Recovery, and local screen-saver media remain separate user-visible systems with separate ownership.

## Runtime Budgets

| Surface                             | Budget or invariant                                                                                                                                                                              |
|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Shared browser log                  | At most 500 chronological entries and 4,096 characters per retained message; caller-owned object graphs are not retained.                                                                        |
| Anonymous full-post cache           | At most the three most recently opened canonical posts.                                                                                                                                          |
| Public listing/search cache         | Compact `postSummaries` only; Editor.js `blocks` are forbidden.                                                                                                                                  |
| Per-post retained search projection | At most 16,000 normalized characters.                                                                                                                                                            |
| Active search item                  | One body projection plus field-specific title, excerpt, and taxonomy text; no duplicate concatenated all-fields string.                                                                          |
| Screen-saver decoded window         | Previous, current, and next local image only; object URLs are revoked outside the window and on close.                                                                                           |
| Screen-saver DOM                    | At most three rendered slides while active; no stage after close.                                                                                                                                |
| CMS Recovery                        | At most one active Firestore write and one coalesced latest request; exact structural equality performs no write. A fingerprint is metadata only and never the authority for suppressing a save. |
| Reader-library writes               | One IndexedDB write plus one in-memory upsert/remove; `getAll()` is reserved for startup and visible-tab reconciliation.                                                                         |
| Service-worker install              | Critical entry shell only. Lazy route chunks and fonts use on-demand caching. `npm run test:service-worker-cache` enforces the boundary.                                                         |
| Media Functions startup             | The root Functions entry point must not load Sharp before an authorized media handler invokes it.                                                                                                |
| Initial public bundle               | Realtime Database and Firebase Storage SDKs initialize only from the lazy feature that uses them; Angular budgets warn above 1.65 MB initial or 1.35 MB main.                                    |

## Compact Blog Index

Canonical posts remain in `/posts/{postId}`. The trusted publishing transaction also owns `/postSummaries/{postId}`. Summary documents contain public/admin list metadata, bounded preview-image metadata, precomputed reading statistics, and normalized searchable body text. They do not contain Editor.js blocks, Recovery data, previews, social-delivery state, or full editorial working state. Search projection is accumulated only until its 16,000-character budget is full, while the full word count is scanned without building a second article-sized string or token array.

The following trusted operations update the canonical post and summary atomically:

- full save;
- evidence-only editorial update;
- preview issue/revoke when the canonical revision changes;
- scheduled publication;
- canonical deletion.

Browser writes to `postSummaries` are denied. Public reads require `status == published`; CMS roles may read other statuses. Direct public article routes still query one published canonical post by slug. Anonymous sessions retain at most three such full posts, coalesce concurrent requests for the same slug, refresh a cached article when its compact index revision advances, and recheck canonical state when an indexed post disappears so unpublished content cannot survive in the anonymous cache.

### Compatibility Gate

The public client trusts the compact collection only when `/postSummaries/__manifest` declares `kind: post-summary-index`, `schemaVersion: 1`, and `complete: true`, and every returned summary passes the schema parser. The migration gives this sentinel `status: published` so the same filtered public query returns both the manifest and published summaries in one request; the summary parser rejects the sentinel as a post. Before that manifest exists, or when any summary is malformed or from another schema, the client queries legacy published posts, projects compact summaries, and immediately releases the full query result instead of installing it in the root full-post cache.

This gate prevents a partially backfilled collection from hiding articles during deployment. It is a rollout bridge, not the steady-state path.

## CMS Save And Recovery Pipeline

Canonical **Save Post** remains explicit and server-authoritative. Background Recovery remains private and cannot publish content.

- Recovery requests use a single-flight/latest-wins scheduler.
- An active request may finish, but intermediate queued versions are discarded in favor of the latest generation.
- The service caches the latest owner/post recovery, uses exact structural equality to skip an identical `setDoc`, and computes the bounded-memory fingerprint only for a changed write. Fingerprint collisions therefore cannot suppress an autosave.
- Canonical cleanup drains active Recovery work, drops stale queued work, deletes the recovery document, and reschedules only if new unsaved changes appeared.
- Same-revision/same-`updatedAt` snapshots update acknowledgement state without rebuilding Editor.js.
- Preview/SEO mounts only after the Preview workspace is first opened.
- SEO analysis, converted block projections, pretty source JSON, and last-saved backup JSON are memoized or materialized only when requested.

Validation and unsupported-block compatibility remain mandatory. Optimization must reuse validated results; it must not remove the client or trusted-server validation boundary.

## Service Worker And Build Cache

`app-shell-critical` prefetches the HTML entry point, main/polyfills/styles, the PWA wrapper, favicon, manifest, and install icons. The subsequent `lazy-code-and-fonts` group uses both lazy install and lazy update modes for broad JavaScript and WOFF2 patterns. Group order is significant because Angular applies the first matching asset group. The generated-manifest validator also caps the complete critical install set at 1.5 MiB so a routing change cannot silently restore an oversized first install.

Angular CLI disk caching is enabled for local and CI environments. It is a developer/build artifact and must never be treated as source or deployed content.

## Local Media And IndexedDB

Screen-saver IndexedDB schema version 1 remains compatible. Startup retains metadata only. Opening My Images materializes object URLs for the active three-image circular window. Moving the window revokes URLs that leave it; closing, clearing, or destroying the viewer revokes all URLs.

Reader-library IndexedDB remains authoritative for device-local reading metadata. Successful single-record writes update the in-memory signal directly. Startup and return-to-visible reconciliation still perform a full read so cross-tab or external changes are observed.

## Deployment And Migration

Use a coordinated release in this order:

1. Deploy the compatible Functions so every new mutation maintains `postSummaries`.
2. Build Functions and dry-run the summary migration against the explicitly confirmed project:

   ```bash
   npm --prefix functions run migrate:post-summaries -- --project <firebase-project-id>
   ```

3. Review the post/upsert/orphan/manifest counts, then explicitly apply:

   ```bash
   npm --prefix functions run migrate:post-summaries -- --apply --project <firebase-project-id>
   ```

4. Deploy Firestore Rules and Hosting from the exact tested commit.
5. Verify public home, blog, author, search, and direct-article routes in a fresh browser profile. Confirm `postSummaries` serves listings and one `/posts` document serves a direct article.

The migration is idempotent. Apply mode refuses to run without an explicit target project, opens the manifest gate with `complete: false`, and re-reads every repair candidate transactionally before it writes. That prevents concurrent publishing from being overwritten by an older scan and prevents a concurrently created canonical post from losing its summary. Canonical posts and summaries are scanned in 250-document pages and reconciled with at most 20 concurrent transactions, keeping migration memory independent of collection size. It removes confirmed orphans and closes the schema-versioned completeness manifest only after every reconciliation succeeds; an interrupted run therefore leaves clients on the safe legacy path.

## Rollback

Rolling Hosting back restores the legacy full-post list path; canonical `/posts` data is unchanged. Summary documents may remain inert. Retaining the new Functions during a Hosting rollback is safe and keeps the index current. If Functions are also rolled back, do so only after Hosting no longer depends on summaries.

Do not delete `postSummaries` as part of an urgent rollback. Delete it only through a separately reviewed cleanup after all clients and Functions have stopped using it.

The screen-saver and reader-library changes require no browser-data migration. Rollback may leave existing IndexedDB records intact. The bounded log is session-only.

## Validation Gates

- `npm run lint`
- `npm run build`
- `npm run test:service-worker-cache`
- complete Angular tests
- `npm --prefix functions run test:all`
- Firestore/Storage Rules emulator tests
- publishing emulator coverage for save, editorial update, scheduled publication, preview, replay, and deletion
- production-build desktop and mobile browser checks with clean console output
- fresh-profile service-worker install/update/offline checks
- authenticated CMS edit, Recovery, no-op Recovery, Save Post, reopen, and conflict checks against a controlled environment
- `git diff --check`

Production deployment, backfill application, and authenticated live verification remain separate explicit actions from code completion.
