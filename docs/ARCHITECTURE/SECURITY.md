# Security Notes

## Threat Model (Relevant to This App)

- XSS via dynamic HTML rendering (`innerHTML`, dynamic tooltip/notification content, terminal output).
- Open redirect or unsafe external navigation from route-driven URL values.
- Client-side secret exposure (API keys in browser bundle/environment files).
- Unsafe parsing and persistence of local storage data.
- Supply-chain risk from dependency drift and failing quality gates.

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

## 2) External URL Handling

- Redirect guard opens decoded route param in a new tab with no allowlist.

Risk:
malicious URLs or script schemes can be triggered by crafted routes.

## 3) Secrets in Client

- OpenAI and weather API keys are configured for client-side use.

Risk:
keys are recoverable from browser context and can be abused.

## 4) Storage Trust

- App/session state read from local storage without robust schema validation.

Risk:
tampered storage payloads can produce runtime errors or unintended behavior.

## Recommended Mitigations (Planned)

1. Replace unsafe HTML sinks with safe rendering primitives and explicit formatting tokens.
2. Validate external URLs with strict scheme/domain checks before `window.open`.
3. Move third-party API calls requiring secrets behind a backend proxy/function.
4. Add schema guards for storage rehydration and fail-safe defaults.
5. Reduce `bypassSecurityTrust*` usage to controlled, immutable asset paths only.

## Operational Notes

- Firebase database rules are present; keep auth checks strict and avoid widening `.read` scopes.
- Admin user management is restricted to Firebase Auth users with `admin: true` or `roles.admin: true`; `cmsAdmin` does not grant access to `/admin/users` or the user-management callable functions.
- The admin overview can be entered by limited roles such as `contentEditor`, `mediaManager`, and `viewer`, but protected child routes still require their own route role data and matching backend/security-rule enforcement before exposing data.
- Role updates are made through Firebase callable functions using the Admin SDK. The client must never write role or permission claims directly.
- Use supported Node LTS for reproducible builds and security patch coverage.
