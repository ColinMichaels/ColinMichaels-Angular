# Security Notes

## Threat Model (Relevant to This App)

- XSS via dynamic HTML rendering (`innerHTML`, dynamic tooltip/notification content, terminal output).
- Open redirect or unsafe external navigation from route-driven URL values.
- Client-side secret exposure (API keys in browser bundle/environment files).
- Unsafe parsing and persistence of local storage data.
- Supply-chain risk from dependency drift and failing quality gates.
- OAuth state replay, callback substitution, provider-token disclosure, or accidental authorization of the wrong managed social account.

## Audit Findings

## 1) XSS Surface

Current sinks include:

- CLI output rendering with `[innerHTML]`
- notification message rendering with `[innerHTML]`
- tooltip text rendering with `[innerHTML]`
- raw `innerHTML` writes in settings subpanel fallback
- SVG trust bypass via `bypassSecurityTrustHtml`

Risk:
user-controlled or remotely controlled strings could execute markup/script payloads if not constrained.

The CMS custom HTML block deliberately excludes `iframe` and `script` markup at both Editor.js save time and public Angular rendering. Interactive article apps use a separate typed embed boundary instead. The Hear the Hook soundboard is pinned to its exact HTTPS origin and approved root, `/soundboard`, and `/soundboard.html` paths; each normalizes to the canonical `/soundboard` page. It is rendered with a static iframe sandbox and denied camera, microphone, geolocation, payment, clipboard, and fullscreen capabilities. Its optional height message is accepted only when the origin, frame window, message type, and finite bounded height all match. Other app URLs render as outbound links rather than frames.

## 2) External URL Handling (Resolved)

- The redirect guard validates decoded destinations against an explicit scheme/domain allowlist before opening a new tab.

Residual risk:
new external destinations must be added deliberately and covered by allowed/blocked URL tests rather than weakening the guard.

## 3) Secrets in Client (Resolved)

- Angular environment generation no longer accepts a generic API base URL or OpenAI/weather vendor keys.
- The terminal AI and Weather OS/lab prototypes preserve their visible contracts through deterministic local responses; they make no location request and no vendor-network request.
- The undeployed anonymous proxy is preserved outside the Functions build at `archive/integrations/legacy-generic-api-proxy/` with explicit restoration requirements.
- Active CMS OpenAI helpers remain authenticated, role-gated Firebase callable Functions with `OPENAI_API_KEY` bound through Secret Manager.

Residual risk:
ignored developer environment files from older checkouts may still contain obsolete vendor credentials. Those values are no longer read by the application and should be removed and rotated. Any future remote terminal or weather provider requires a new reviewed TypeScript Functions boundary with abuse controls; the archived proxy must not be copied back into the deploy tree.

## 4) Social Provider Credentials and OAuth

- Social authorization starts are Firebase callable Functions restricted to `admin`, `cmsAdmin`, or `contentEditor` claims.
- Callback endpoints are public because providers must reach them, but each callback requires GET, a signed single-use state record with a ten-minute expiry and exact provider match, and a fresh check that the initiating account still has a CMS role.
- Provider access tokens are encrypted with AES-256-GCM and provider-specific additional authenticated data before storage in backend-only `/socialConnectionSecrets` documents.
- `/socialConnections` exposes only non-secret provider, account, scope, expiry, and validation metadata to CMS roles.
- `/socialOAuthStates` and `/socialConnectionSecrets` deny all client access and are explicitly excluded from the repository's legacy recursive super-admin override. Angular receives authorization URLs and sanitized connection status, never provider tokens or app secrets.
- Multiple managed Facebook Pages require an explicit post-callback Page selection; the backend does not silently choose the first Page.
- Disconnect removes encrypted provider tokens but does not mutate Calendar plans or outbox records.

Residual risk:
provider review, account-role drift, token revocation, and refresh failure must be monitored before delivery workers are enabled. Keep delivery disabled until pending outbox records have an approved cutoff so authorization cannot trigger historical posts.

## 5) Blog Poll Votes

- Poll definitions live in published post blocks, but aggregate and per-user vote documents under `/postPolls` deny all browser reads and writes, including the recursive administrator fallback.
- Callable Functions reload the current published post, validate the post/slug/poll/option relationship, and transact one vote document per authenticated UID.
- `afterVote`, `always`, and `hidden` result policies are enforced when the backend response is built. A stale vote for a removed option cannot unlock aggregate results.
- Public result responses contain labels, counts, percentages, and the caller's selected option only; they never contain voter identities.

Residual risk:
polls are lightweight authenticated editorial interactions, not anonymous or high-assurance ballots. Review App Check, account-abuse controls, rate limits, monitoring, and deletion/export requirements before sensitive or high-volume use.

## 6) Suno Song Embeds

- Suno songs use a dedicated typed Editor.js block rather than raw iframe HTML or the generic interactive-app boundary.
- Authoring and public rendering both require an exact HTTPS `suno.com` song/embed path with a UUID and reject credentials, ports, queries, fragments, alternate paths, and lookalike hosts.
- The iframe is sandboxed, receives only media/fullscreen permissions, uses a fixed responsive height, and retains a normal external fallback.
- Hosting CSP adds only `https://suno.com` to `frame-src`; Suno is not added to `script-src`, `connect-src`, or the generic YouTube/Vimeo host set.

Residual risk:
the embedded third-party player remains subject to Suno's availability, privacy/cookie behavior, URL contracts, and content rights. Editors must treat Link Only songs as disclosed when placed in a public post.

## 7) Storage Trust

- App/session state read from local storage without robust schema validation.
- CMS recovery documents use a schema-versioned runtime validator, exact owner/post identity checks, deterministic `/postDrafts/{ownerUid}/recoveries/{encodedPostId}` paths, and a 30-day expiry. Firestore Rules require both a CMS content role and path-owner equality for create/get/update/delete; collection listing is denied.
- The only local-storage value used by recovery is an opaque generated new-post ID. It grants no data access; Firestore owner checks remain authoritative.
- New blog image uploads use an actor-owned create-only staging path. Storage Rules enforce role, owner UID, declared image type, and size before upload. The trusted finalizer then compares stored metadata with the byte signature, bounds decoded pixels, generates immutable AVIF/WebP/JPEG variants, records checksums and object identity, and removes staging/partial outputs on failure.
- Final blog variants are public-read because published posts are public, but browser writes are denied. Existing legacy blog-media paths remain public-read/backend-write to avoid breaking stored posts. The recursive Storage fallback explicitly excludes the complete `cms` subtree, so overlapping matches cannot grant private staging reads or browser mutation of final and legacy blog media.
- `storage.cors.json` permits browser `GET` and `HEAD` requests from any origin so the public custom domain, Firebase preview channels, and local development can fetch published media through the Firebase Storage download endpoint. The wildcard is limited to read-only methods: it does not grant object access, bypass Storage Rules, expose create-only staging objects, or permit browser writes. The production workflow applies this bucket-level configuration only when the policy or its deployment tooling changes, or when an operator explicitly selects the Storage CORS manual-deploy input.
- Physical canonical deletion is restricted to `admin`, `cmsAdmin`, and `mediaManager`; `contentEditor` can upload/finalize actor-owned staging objects but cannot destroy canonical media. Deletion requires a reference-report dry run and explicit confirmation. The reference scan and transition to a ten-minute `deleting` lease occur in one transaction; referenced assets and partial deletion failures retain their durable records.

Risk:
other local/session storage rehydration paths still need schema guards. Public blog media is not confidential and must not contain private information. CORS must never be treated as an authorization boundary; Storage Rules and trusted backend ownership remain authoritative.

## 8) CMS Canonical Write Concurrency

- Missing legacy post revisions normalize to 0. Angular sends canonical post save/delete and Draft Preview issue/revoke operations through one CMS-role-gated callable; direct browser writes to canonical post/preview documents are denied.
- The Function validates the complete post/block schema and safe URL policy, compares the expected revision, reserves the slug, advances one revision, and writes an audit record inside one transaction. Actor/request receipts make retries idempotent for seven days.
- Recovery writes are isolated under `/postDrafts` and cannot publish or mutate `/posts`.
- Scheduled publishing reuses the same post validator, revision behavior, slug reservation, and audit contract so manual and timed releases cannot drift. Backend Cat Corner announcement reconciliation continues to advance revisions so open editors detect those changes.
- Draft Preview tokens are backend-generated and issue/revoke is atomic with the canonical post revision and preview snapshot.
- Canonical post writes inspect every trusted Phase 7 media identity inside the post transaction and accept only existing `ready` records. Deletion writes the same record to `deleting` inside its reference-scan transaction, closing the attach/delete time-of-check/time-of-use window.
- The recursive Firestore administrator fallback explicitly excludes every backend-owned post, recovery, preview, poll, comment, slug, receipt, audit, media, social-delivery, connection, share, push-subscription, and point-event top-level collection. Specific collection matches therefore remain authoritative under Firestore Rules' overlapping-match semantics, including owner-only recovery access and records that deny all browser reads.

Residual risk:
coordinated deployment must install Functions and the new Hosting client before restrictive Rules. Authenticated deployed-environment create/edit/conflict/preview/schedule/publish tests, callable monitoring, TTL enablement, and operator sign-off remain required before release approval.

## Mitigation Status

1. Open: replace unsafe HTML sinks with safe rendering primitives and explicit formatting tokens.
2. Complete: validate external URLs with strict scheme/domain checks before `window.open`.
3. In progress: browser vendor keys are removed; complete and verify the deployable backend proxy boundary before closing the item.
4. Complete for connection-only scope: protect social OAuth state and encrypt provider tokens; delivery-worker authorization and retry hardening remain open.
5. Complete for the initial poll scope: keep votes backend-only and result visibility server-enforced; high-assurance abuse/privacy controls remain deferred.
6. Complete for the initial Suno scope: validate one exact provider contract and retain a link fallback; broader music providers remain untrusted.
7. Complete for trusted blog-image ingestion and destruction; retain schema guards and fail-safe defaults across unrelated local/session storage rehydration paths.
8. Complete in code and emulator for trusted canonical blog publishing; coordinated deployment, authenticated environment proof, monitoring, and the final production audit remain open release gates.
9. Open: reduce `bypassSecurityTrust*` usage to controlled, immutable asset paths only.

The bounded Phase 7 security regression set passes dependency audits, 6/6 Firestore/Storage Rules cases, and the publishing/media emulator race and readiness cases. The separately started exhaustive Codex Security diff scan was paused during discovery at the user's direction and must not be represented as complete; a fresh snapshot is required if that scan resumes after these remediations.

## Operational Notes

- Firebase database rules are present; keep auth checks strict and avoid widening `.read` scopes.
- Admin user management is restricted to Firebase Auth users with `admin: true` or `roles.admin: true`; `cmsAdmin` does not grant access to `/admin/users` or the user-management callable functions.
- Admin **View as User** is a client-side effective-profile and role preview, not Firebase impersonation. Activation force-refreshes and verifies the actor's real `admin` claim, tab-scoped state is bound to that actor UID, and a persistent banner provides an exit path. Firebase callables and Security Rules still receive the actor's admin token, so the mode must not be used as proof of backend denial and mutations remain attributable to the administrator.
- The admin overview can be entered by limited roles such as `contentEditor`, `mediaManager`, and `viewer`, but protected child routes still require their own route role data and matching backend/security-rule enforcement before exposing data.
- Role updates are made through Firebase callable functions using the Admin SDK. The client must never write role or permission claims directly.
- `claimCatCornerAccess` is a narrow self-service exception implemented with the Admin SDK: it accepts no caller-selected role and can only add `roles.catCornerAddict` to the authenticated caller while preserving unrelated claims. The Cat Corner role grants no CMS or administrative permission.
- Cat Corner is a documented soft discovery gate. Menu/route hiding and `noindex` metadata do not make its public Blog documents or media confidential; any future confidentiality requirement must add backend data and media authorization rather than relying on this UI role.
- Use supported Node LTS for reproducible builds and security patch coverage.
