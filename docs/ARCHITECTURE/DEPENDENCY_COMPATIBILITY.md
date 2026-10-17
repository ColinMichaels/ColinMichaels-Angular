# Dependency Compatibility and Major Upgrade Recovery

## Scope and base

This batch starts from `69abfb1082c6864e9aef5574d54b7fcd392918da`, after the authorized routine PRs #388, #390, #394, #396, #397, #402, #403, #404, and #407 were merged into `dev`. Those nine updates are the rollback baseline, not part of this repair's revert scope. PR #397 also includes a deterministic sticky-heading scroll test: it fixes the browser scroll offset at 120px and asserts a 600px document destination instead of assuming other tests left the window at zero.

The repair addresses failed PRs #389, #391, #395, #398, #400, #401, #405, and #406. It incorporates the compatible Functions SDK 7 update proposed by #393 because Admin 14 cannot install alongside SDK 6. It does not adopt the Node 26 types from #392 or the Remotion/React runtime update from #399. Reconcile the superseded bot PRs after this repair is merged; merging their original manifest-only updates afterward would replace the compatibility decisions below.

## Supported matrix

| Boundary | Version | Contract |
| --- | --- | --- |
| Angular runtime/compiler/build | 22.2.3 | Existing coordinated pins remain intact |
| Frontend install/build/test Node | 24.15.0 | `.nvmrc`, root engines and Angular CI agree; Firebase Rules Testing 6 requires Node 24.12+ |
| Firebase Web / Rules Testing | 13.0.0 / 6.0.0 | Update together; Rules Testing 6 requires Firebase 13 |
| Functions runtime and Node types | Node 22 / types 22 | Deployment engine and runtime tests remain on 22.22.3 |
| Firebase Admin / Functions SDK | 14.5.0 / 7.4.0 | SDK 7 accepts Admin 14; SDK 6's peer range excludes it |
| Functions and labs compiler | native TypeScript 7.0.2 | `typescript-native` is an npm alias; scripts explicitly invoke its compiler |
| Compiler API used by tests/lint | TypeScript 6.0.3 | The `typescript` package retains `transpileModule`, `ModuleKind`, and APIs consumed by lint tooling |
| Labs lint | ESLint 10.12.0 | Remotion's existing rules use `@eslint/compat` 2.1.1 and scoped typescript-eslint 8.71.2 |
| Remotion/React runtime | 4.0.499 / 19.2.3 | Existing runtime/media versions remain unchanged |
| Tailwind | 4.3.3 | Matching PostCSS and CLI packages; retained v3 theme values preserve existing presentation |

TypeScript 7's default package export is not the old synchronous compiler API. Replacing `typescript` directly broke the seasonal catalog drift test and the labs' lint parser. The native compiler alias supplies version 7 compilation while the API package supplies version 6 tooling. This is an intentional separation, not a peer override. Do not replace the API package with 7 until its consumers support the new API. Native compilation and the catalog drift test both run in validation.

Remotion's flat config pins an old typescript-eslint implementation internally. A scoped override updates that implementation to 8.71.2, whose supported peer range includes ESLint 10 and TypeScript 6. `fixupConfigRules` adapts the bundled legacy React/Remotion plugin APIs while retaining their rules. The application does not disable lint rules or use `--force` / `--legacy-peer-deps`.

## Stylesheet and component inventory

| File or boundary | Responsibility |
| --- | --- |
| `.postcssrc.json` | Angular's supported PostCSS configuration loads `@tailwindcss/postcss`; replaces the former JS config |
| `src/styles/tailwind.css` | Canonical Tailwind CSS entry, class-based dark variant, source scanning and legacy utility compatibility |
| `src/styles/tailwind-v3-theme.json` | Snapshot of the prior 3.4.19 palette, fonts, spacing, shadows, radii and related defaults |
| `src/styles/tailwind-v3-theme.LICENSE` | Preserved MIT license for the prior Tailwind theme data |
| `scripts/generate-tailwind-entry.mjs` | Generates the ignored CSS build input and preserves the opt-in preview safelist |
| `src/styles/tailwind.generated.css` | Disposable Angular/CLI entry generated before build/start/test/watch; never committed |
| `src/styles.scss` and retained Sass partials | Existing public/Core OS styling, compiled by Angular before PostCSS; reference the canonical Tailwind definitions |
| Component styles with `@apply` | Explicit `@reference` makes theme and utility definitions available without emitting a second global Tailwind bundle |
| `PatchEditorComponent` | A shared `.patch-control` selector avoids repeated base-button output; original transition properties are retained within the existing CSS budget |

No component, route, OS application, experimental application, supplied asset, or persistent data model is removed. Existing Core OS scope ownership remains intact. Removed Tailwind utility spellings become their supported equivalents, such as `shrink-0` and color opacity modifiers. Compatibility utilities preserve gradient direction names, inner shadows, outline behavior, base borders/placeholders and class-based dark mode.

The checked-in theme data is a deliberate presentation baseline. Do not refresh it as part of a routine Tailwind dependency update. Review a new palette or geometry as a separate visible design change.

Canonical npm scripts generate styles before invoking Angular. When invoking `ng` directly on a clean checkout, run `npm run generate:styles` first. `TAILWIND_INCLUDE_GENERATED_PREVIEW_CLASSES=true npm start` still opts into the generated preview palette; the default entry does not add that safelist. The generator writes only when content changes to avoid watch loops.

## CI and deployment scope

Angular jobs install and build on Node 24.15.0. Functions jobs install, compile and test on Node 22.22.3. The Functions-only preview path temporarily selects Node 24 to rebuild the matching Angular SEO shell, then restores Node 22. Production build configuration uses the same split. The declared Firebase Functions runtime remains Node 22; no Firebase configuration or account settings are changed.

Both the new PostCSS config and style generator select Hosting plus the matching Functions SEO shell in the shared deploy-scope detector. Seven isolated Git-fixture tests cover these inputs, source CSS, ordinary dependency locks and documentation-only changes. Production planning reuses that detector.

Dependabot groups Firebase Web/Rules Testing, Admin/Functions, and Tailwind packages. Major updates to the API-facing `typescript` package are excluded; the native compiler alias remains independently updateable. Functions Node types remain on the runtime's major. These version boundaries prevent recurrence of the incompatible standalone updates.

## Validation and limits

Local verification includes clean installs in all four npm roots; the production build and lint; 1,465 Angular tests; 243 Functions test executions under Node 22; both labs' ESLint/native TypeScript checks; nine Rules Testing 6 tests against local Firestore/Storage emulators; four Admin 14 publishing, summary migration and media emulator tests; seven deployment-scope checks; and desktop/mobile browser validation.

The browser sample covers the public shell, blog archive geometry, class-based light/dark themes, site menu interaction, public/Core OS scope isolation, and all six login/registration autofill fields. Before/after captures cover 1440×900 and 390×844 at `/`, `/login`, and `/archive/seasons`. The local CMS feed lacks a running seeded backend, so homepage captures establish shell/loading-state parity, not populated production-feed acceptance. Static archive and login rendering do not depend on that feed. Local Firestore connection errors existed before the migration; captured pages have no JavaScript page errors.

Fresh GitHub Linux validation for commit `e7b61ba` passed all four dependency jobs, including all 1,465 Angular tests, plus CodeQL and the existing Hosting/Functions preview build checks. The Hosting preview deployed successfully. A direct desktop archive request returned HTTP 200 with no overflow or JavaScript page errors.

Preview limitation: direct `/login` requests use the existing shared `renderSeoHtml` Function and therefore receive the production shell, not the newly built preview shell. Verified asset references differ: preview `/index.html` uses `styles-X26QFKF2.css` / `main-72JQ5V7Q.js`, while both preview `/login` and production `/login` use `styles-PFEUFMSP.css` / `main-YRF5DP2K.js`. The older files are absent from the new preview channel, so a direct preview login is blank. The workflow builds Functions but does not deploy a preview-isolated Function. This is a preview routing limitation, not a passing route check; use the local route tests for login acceptance until an isolated preview shell is designed. Do not deploy production Functions merely to repair a PR preview.

This is source/local/emulator validation. GitHub checks and the PR preview provide separate fresh-run evidence. Actual SMTP/provider delivery, production CMS/content, real account sessions, physical devices, and production deployment are not claimed. Current npm audit findings are recorded in the PR; successful tests do not imply every advisory is resolved.

## Migration and rollback

There is no Firestore, Storage, Auth, route, content, saved OS state, or browser-storage migration. Install with the matching manifests/locks, select the runtime from the matrix above, generate CSS through the canonical npm scripts, and restart any existing dev server after dependency installation so it reloads PostCSS plugins and compiler packages.

For source rollback:

1. Refresh remote refs and create a fresh `codex/` branch from current `origin/dev`.
2. Revert this repair's commit (or its PR merge with the appropriate mainline), preserving the nine routine merges through baseline `69abfb1`. Do not reset `dev` or discard later changes.
3. Restore manifests and lockfiles in the root, Functions and both labs together with their compiler/lint scripts, CSS entries/references, PostCSS config, generated-entry hooks, deployment-scope detector and Node-version workflow steps. Do not retain only half of a Firebase pair or compiler/API pair.
4. Remove only the disposable `src/styles/tailwind.generated.css` left by the newer generator, then run `npm ci` in each root. Rebuild through the restored npm scripts and restart local servers.
5. Run build/lint, Angular and Functions tests, emulator checks, scope tests applicable to the restored source, and desktop/mobile light/dark/OS smoke checks before publishing the revert PR.

If this source is later deployed, rebuild and redeploy a compatible predecessor's Hosting assets and matching Functions/SEO shell together. Existing credentials, rules and data do not require restoration. Restoring only old HTML or only a new dependency lock is not a valid release rollback.

## Primary references

- [Tailwind v4 migration](https://tailwindcss.com/docs/upgrade-guide)
- [typescript-eslint supported dependency versions](https://typescript-eslint.io/users/dependency-versions/)
- [ESLint compatibility utilities](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/)
- [Firebase Functions SDK 7 release](https://github.com/firebase/firebase-functions/releases/tag/v7.0.0)
