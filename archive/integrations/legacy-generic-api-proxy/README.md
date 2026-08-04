# Legacy Generic API Proxy

Status: archived on 2026-08-04.

`index.js` is the original anonymous OpenAI chat and OpenWeather proxy prototype. It previously lived at `functions/index.js`, but the deployed Functions package has always used `functions/package.json` → `lib/index.js`, compiled from `functions/src/index.ts`. No Firebase Hosting rewrite targets the proxy's `api` export.

The proxy is preserved here because the terminal AI command and Weather window are still visible OS/lab prototypes. Those surfaces now use deterministic local responses and make no location or vendor-network request. Active CMS OpenAI callables remain in `functions/src/index.ts`; they are authenticated, role-gated, and use the Firebase-managed `OPENAI_API_KEY` secret.

Do not copy this proxy back into `functions/`. It accepts anonymous requests, lacks App Check and rate limiting, and would expose vendor quota to abuse even though the raw keys remain server-side.

## Restoration requirements

Before restoring any remote chat or weather behavior:

1. define a current product requirement and owning feature boundary;
2. implement the provider through the TypeScript Functions entry point;
3. require authentication or a documented anonymous-abuse control, input validation, bounded response size, rate limiting, caching, and App Check where appropriate;
4. bind provider credentials only through Firebase Functions secrets;
5. add emulator, client error-state, route, console-health, and deployment tests; and
6. update environment, security, deployment, rollback, and monitoring documentation in the same change.

Rollback of this archive-only change is source-level: move the file back only for historical comparison. Moving it back does not make it deployable because `functions/package.json` still points to `lib/index.js`.

