# Firebase Preview Routing and Access

## Scope and baseline

This repair starts from `5963d57271a9ebd83c5c3ff9b4e541a8a7f24773` on `dev`. The maintenance preview for PR #408 returned live `renderSeoHtml` output for deep links, referencing a JavaScript hash absent from the preview channel. Twenty-four of 28 direct desktop/mobile route samples requested that missing entry; login, search and protected-route shells were blank. Ten interactive browser tests failed on that deployed preview.

The preview also could not read public Firestore content. The same failure reproduced on older PR #387. Anonymous production worked in the visible browser. Read-only cloud inspection confirmed that production and preview used matching public Firebase/App Check settings, but the score-based reCAPTCHA key allowed only the three production Hosting/custom domains. Temporary PR hostnames were absent. Firebase Auth had the existing preview URLs registered already; no API-key referrer restriction explained the public-content failure.

## Automation inventory

| Boundary | Responsibility |
| --- | --- |
| `.github/scripts/create-firebase-preview-config.mjs` | Stage a Hosting-only preview, validate index entry files, replace only the catch-all rewrite with `/index.html`, preserve explicit API/feed rewrites, add noindex and source identity headers |
| `public/__preview__/build.json` in the staged artifact | Record the head SHA and entry asset paths; generated only inside the temporary deployment directory |
| `scripts/verify-firebase-preview.mjs` | Check seven deployed direct routes against the recorded head/assets and require valid JavaScript/CSS responses |
| `scripts/preview-firebase-domain.mjs` | Maintainer-only exact-hostname plan/check/add/remove operation against the existing App Check reCAPTCHA key, with a minimal domain rollback receipt |
| Preview workflow | Build/deploy the staged config and verify the deployed shell; keep human-only preview access and credential-free Dependabot validation |
| Shared deploy-scope detector | Report preview-pipeline-only changes separately so they trigger a preview without changing production deploy scope |

The checked-in `firebase.json`, production SEO Function rewrite, application components, roles, account/data models and persistent content are unchanged. Preview app routes use the Angular router, including its authentication/device guards. Preview HTML is noindex; it is not a test of server-rendered production SEO. Explicit feed/API rewrites still use the already deployed backend. Building candidate Functions does not deploy them or create isolated preview Functions.

## Exact-hostname Firebase setup

Hosting preview channels share the project's backend. Registering an Auth preview domain does not also authorize it for the App Check reCAPTCHA key. The current Hosting deployer has no reCAPTCHA key mutation permission; this change does not add IAM permissions or expose another credential to CI.

After the first deployment creates its exact URL, a maintainer with existing Cloud access runs the helper. `SITE_KEY` is the existing public `FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY`, not an App Check debug token or a secret. `PREVIEW_URL` must be the full `https://colinmichaels--pr-N-HASH.web.app/` origin. The helper rejects live production, other sites, paths, wildcards and disabled domain verification.

```bash
gcloud auth login
node scripts/preview-firebase-domain.mjs plan colinmichaels "$SITE_KEY" "$PREVIEW_URL"
node scripts/preview-firebase-domain.mjs add colinmichaels "$SITE_KEY" "$PREVIEW_URL" /tmp/preview-domain-receipt.json
node scripts/preview-firebase-domain.mjs check colinmichaels "$SITE_KEY" "$PREVIEW_URL"
```

The helper reads the latest key, preserves all existing domains, patches only `webSettings.allowedDomains`, confirms the result and stores a private-permission receipt. It never prints or stores the access token, changes App Check enforcement, enables all domains, installs a debug token, alters API keys or changes production Auth settings. Keep registrations scoped to reviewed PR previews; retire the exact hostname when its channel is no longer needed. The key supports at most 250 domains, and Google documents propagation delays up to 30 minutes. A successful configuration check alone is not browser access proof; reload a fresh visible browser and verify real content.

Future previews require this explicit per-host registration until a separately reviewed identity/permission design automates it. Do not work around the prerequisite by allowing all `web.app` tenants or disabling enforcement.

## Validation

Run `npm run build`, `npm run lint`, `npm run test:preview-config`, `npm run test:deploy-scope`, `npm run test:docs` and actionlint for the changed workflows. Regression cases cover retaining production/API rewrites, rejecting missing assets, stale deep-link bundles and wrong MIME types, preserving source identity, scope separation and exact-domain add/rollback behavior.

The deployed HTTP check covers `/`, `/blog`, `/login`, `/os/weather-app`, `/admin/cms`, `/schedule` and `/archive/seasons`. It establishes matching HTML/assets and source identity, not successful Firebase data access or authenticated workflows. Browser QA must separately cover public content/search, direct-link and client navigation, login/registration controls, archives/seasonal guides, contact controls, responsive layouts and console errors. Use disposable local emulator fixtures for write paths. Provider sign-in, real-account CMS and candidate deployed Functions remain separate evidence requirements.

## Migration and rollback

No data migration or application release is needed. This PR may deploy only its temporary Hosting channel; merging to `master`, live Hosting/Functions/rules deployments and production release approval remain separate actions.

1. Create a fresh `codex/` branch from refreshed `origin/dev` and revert this repair through a PR. Restore the preview workflow, generator/verifier, scope detection and matching docs together; retain the prior maintenance dependency versions.
2. Rebuild/redeploy only the affected PR channel to restore its former Hosting configuration. Production `firebase.json` and deployed Functions do not need rollback. The predecessor preview will again have the known deep-link mismatch.
3. Remove only this preview's hostname if retiring its access. Read the current key and use the helper's `remove` operation with a new receipt; do not restore an entire old domain list over newer registrations.

```bash
node scripts/preview-firebase-domain.mjs remove colinmichaels "$SITE_KEY" "$PREVIEW_URL" /tmp/preview-domain-removal.json
```

4. Confirm the three existing production domains and any other active preview registrations remain intact, domain verification remains enabled, and App Check enforcement is unchanged. Never revert by disabling security controls.

## Primary references

- [Firebase preview channels and shared backend behavior](https://firebase.google.com/docs/hosting/test-preview-deploy)
- [reCAPTCHA domain restrictions and propagation](https://docs.cloud.google.com/recaptcha/docs/create-key-website)
