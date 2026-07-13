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

## 3) Secrets in Client (Browser Exposure Resolved; Backend Delivery Open)

- Angular environment generation exposes only `APP_API_URL`; OpenAI and weather vendor keys are no longer browser build inputs or preview-workflow requirements.
- CMS OpenAI helpers use a Firebase Functions secret.
- The legacy generic OpenAI/weather proxy in `functions/index.js` is not the TypeScript Functions deploy entry and must not be treated as the production boundary. A deployable, authenticated, validated, rate-limited weather/chat boundary or an explicitly documented external API remains required before the proxy TODO can close.

Risk:
an incorrectly deployed public proxy could protect vendor keys while still allowing anonymous quota abuse or caller-controlled upstream requests.

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

## 5) Storage Trust

- App/session state read from local storage without robust schema validation.

Risk:
tampered storage payloads can produce runtime errors or unintended behavior.

## Mitigation Status

1. Open: replace unsafe HTML sinks with safe rendering primitives and explicit formatting tokens.
2. Complete: validate external URLs with strict scheme/domain checks before `window.open`.
3. In progress: browser vendor keys are removed; complete and verify the deployable backend proxy boundary before closing the item.
4. Complete for connection-only scope: protect social OAuth state and encrypt provider tokens; delivery-worker authorization and retry hardening remain open.
5. In progress: retain schema guards and fail-safe defaults across storage rehydration paths.
6. Open: reduce `bypassSecurityTrust*` usage to controlled, immutable asset paths only.

## Operational Notes

- Firebase database rules are present; keep auth checks strict and avoid widening `.read` scopes.
- Admin user management is restricted to Firebase Auth users with `admin: true` or `roles.admin: true`; `cmsAdmin` does not grant access to `/admin/users` or the user-management callable functions.
- The admin overview can be entered by limited roles such as `contentEditor`, `mediaManager`, and `viewer`, but protected child routes still require their own route role data and matching backend/security-rule enforcement before exposing data.
- Role updates are made through Firebase callable functions using the Admin SDK. The client must never write role or permission claims directly.
- `claimCatCornerAccess` is a narrow self-service exception implemented with the Admin SDK: it accepts no caller-selected role and can only add `roles.catCornerAddict` to the authenticated caller while preserving unrelated claims. The Cat Corner role grants no CMS or administrative permission.
- Cat Corner is a documented soft discovery gate. Menu/route hiding and `noindex` metadata do not make its public Blog documents or media confidential; any future confidentiality requirement must add backend data and media authorization rather than relying on this UI role.
- Use supported Node LTS for reproducible builds and security patch coverage.
