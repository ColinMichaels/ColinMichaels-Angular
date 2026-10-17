# Development

## Prerequisites

- Node.js `24.15.0` via `.nvmrc` for the frontend (the root also accepts `>=26.0.0`); Node `22.22.3` separately for Functions runtime checks
- npm 10+
- Chrome/Chromium for Karma tests

Run `nvm use` before installing or validating. Angular 22 rejects unsupported odd-numbered Node releases such as Node 23.

## Install

```bash
npm ci
```

## Environment Setup (Local)

1. Copy `src/environments/.env.example` to `src/environments/.env.local`.
2. Fill in your local values.
3. Keep `src/environments/.env.local` and `src/environments/environment.local.ts` uncommitted.

## Run Locally

```bash
npm start
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test -- --watch=false --browsers=ChromeHeadless
```

## Lint

```bash
npm run lint
```

## Commits and Pull Requests

Follow the [Change Documentation and Pull Request Standard](./CHANGE_DOCUMENTATION_STANDARD.md). New pull requests automatically start from `.github/pull_request_template.md`; feature PRs normally target `dev` as drafts so the Firebase preview workflow can run.

## Dependency Updates

Update the Angular runtime packages, compiler, compiler CLI, build package, CLI, and devkit together. Their coordinated `22.2.3` baseline is pinned exactly in `package.json`; CDK and other integrations retain their independent compatible versions. Never use `--force` or `--legacy-peer-deps` to hide a peer conflict. Regenerate the lockfile and prove it with `npm ci` before relying on a locally installed build.

`.github/dependabot.yml` schedules weekly updates for the root app, Functions, and both Remotion labs, targeting `dev`. Angular tooling and runtime version updates are grouped, with a matching group for Angular security updates; Remotion and React version updates are grouped within the lab configuration. Dependabot reads its configuration from the repository's default branch, verified as `dev` on October 17, 2026, so the configuration activates when merged there. If the default branch changes, review the configuration again: groups targeting a non-default branch do not configure security updates on the default branch. Existing security alerts still require review.

Dependency PRs run the credential-free [dependency validation workflow](../../.github/workflows/dependency-validation.yml). See [Environment and Secrets Setup](./ENVIRONMENT_SECRETS.md) for the intentionally skipped bot preview path. Firebase Web 13 and Rules Testing 6 use Node `24.15.0`; test Functions using Node `22.22.3`, matching the retained Firebase runtime and Node types. Firebase Web/Rules Testing, Admin/Functions, and Tailwind families update together.

Functions and labs compile with native TypeScript 7 through the explicit `typescript-native` alias. Their `typescript` package stays at API-compatible 6.0.3 for lint and catalog drift checks. Labs retain Remotion rules through a scoped typescript-eslint update and ESLint compatibility adapter. Do not replace the API dependency with the native compiler package or bypass peers. See the [compatibility matrix and complete rollback](../ARCHITECTURE/DEPENDENCY_COMPATIBILITY.md).

Tailwind 4 runs through `.postcssrc.json`; existing Sass uses explicit CSS references. Canonical build/start/test/watch scripts generate the ignored CSS entry first. Run `npm run generate:styles` before direct Angular CLI invocation. The opt-in `TAILWIND_INCLUDE_GENERATED_PREVIEW_CLASSES=true` preview palette remains supported.

The October 17 integration baseline includes Sharp `0.35.5` and reader-campaign `fast-uri` `3.1.8`, preserving previously merged Dependabot updates. It supersedes the dependency changes proposed in PRs #353, #377, and #386; those PRs should be reconciled after the integration is merged. No Firebase configuration, route, content, storage, or data migration is required. For rollback, revert the integration commit through a fresh branch/PR and restore matching manifests and lockfiles together, then run `npm ci` in each affected package. The prior `dev` Angular graph was already inconsistent, so reverting the whole batch restores that known install failure; preserve or reapply the coordinated Angular repair when rolling back only a patch or CI policy change.

## Quality Gate Reporting

`npm run build` and `npm run lint` are the required repository checks. Run both under the pinned Node version and report the exact current result; do not reuse lint counts or build warnings from an older audit as a present-day baseline. Add focused tests, route checks, and rendered checks proportional to the change.

For a repeatable local source-release gate, run:

```bash
npm run test:release
```

It first verifies a supported Node runtime; run `nvm use` if it asks you to switch to the pinned Node `24.15.0`. It then runs lint, the production application build, the complete Angular suite, content-package validation, and every non-emulator Functions suite. It does not deploy, access production data, start Firebase emulators, or prove live behavior; run emulator and production verification separately when a change needs them.

The release gate also runs:

```bash
npm run test:docs
```

That check validates local links across tracked Markdown, requires every architecture document in the documentation index, preserves the historical labels on the root July SEO reports and completed tech-debt log, and requires the active roadmap to be reviewed at least every 120 days. It does not check external URL availability or prove that dated production claims remain current.

Historical clean baseline (July 16, 2026, Node `24.15.0`; Functions build/tests were also verified on Node `22.15.0` at that time):

The counts below explain a known good repository state; they are not a substitute for a current run. Use `npm run test:release` for the current checkout and report its exact counts and failures.

- `npm run build`: passes with `0` optimization warnings and no `allowedCommonJsDependencies` exemptions after replacing the legacy Day.js, audio, and Editor.js YouTube runtime paths.
- `npm run lint`: passes with `0` errors and `0` warnings after the accessibility and explicit-typing cleanup.
- `npm --prefix functions run build`: passes.
- `npm run test -- --watch=false --browsers=ChromeHeadless`: passes (`573/573`).
- `node --test functions/test/*.test.cjs`: passes (`27/27`).
- Root and `functions/` `npm audit`: both report `0` vulnerabilities, down from `10` vulnerable paths in each lockfile (`20` total paths behind `18` GitHub Dependabot warnings).
- Focused route and motion-sensitive component contracts pass (`25/25`).
- Focused accessibility-cleanup component contracts pass, including native system-tray, desktop-keyboard, and SpaceX interaction coverage.

## Dependency Security Overrides

Two narrow overrides keep the supported framework graph patched while upstream peer and transitive ranges catch up:

- Root `vite > esbuild` is held at `0.28.1`. Angular Build `22.0.7` already uses that release directly, but its pinned Vite `7.3.5` still requests the vulnerable `^0.27.0` range. Remove this override once the supported Angular Build release pins Vite to an esbuild range beginning at `0.28.1` or newer.
- Functions Google clients resolve `uuid` to `11.1.1`. Firebase Admin `13.10.0` is the newest major accepted by the current Firebase Functions peer contract, while its optional Firestore and Storage clients still request UUID 9. Remove this override once the supported Firebase Functions/Admin graph resolves UUID `11.1.1` or newer without intervention, or when Firebase Functions officially accepts Firebase Admin 14.

Treat either override change as dependency work: run both audits, the app and Functions builds, all Angular specs, and every `functions/test/*.test.cjs` test before merging. No Firebase configuration or data migration is required for the current overrides; deploying the Functions package is sufficient to pick up its refreshed production dependency tree.

## Recommended Local Tooling Alignment

1. Run `nvm use` to select Node `24.15.0`.
2. Confirm `node -v` and `npm -v` before diagnosing tool failures.
3. Use a different Node release only when it satisfies `package.json#engines`.

## Troubleshooting

- If test fails with port binding in sandboxed environments, run with elevated permissions or locally in non-sandbox shell.
- If Angular CLI prompts for analytics in CI/local automation, set:
  - `NG_CLI_ANALYTICS=false`
- If build crashes with memory allocator errors, switch to supported LTS Node first before code-level debugging.
