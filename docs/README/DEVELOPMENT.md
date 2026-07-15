# Development

## Prerequisites

- Node.js `24.15.0` via `.nvmrc` (the package also accepts `^22.22.3` or `>=26.0.0`)
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

## Quality Gate Reporting

`npm run build` and `npm run lint` are the required repository checks. Run both under the pinned Node version and report the exact current result; do not reuse lint counts or build warnings from an older audit as a present-day baseline. Add focused tests, route checks, and rendered checks proportional to the change.

Current verified baseline (July 14, 2026, Node `24.15.0`):

- `npm run build`: passes; `5` CommonJS optimization warnings remain in the optional audio stack. Day.js now uses its ESM distribution.
- `npm run lint`: passes with `0` errors and `0` warnings after the accessibility and explicit-typing cleanup.
- `npm --prefix functions run build`: passes.
- `npm run test -- --watch=false --browsers=ChromeHeadless`: passes (`517/517`).
- Focused route and motion-sensitive component contracts pass (`25/25`).
- Focused accessibility-cleanup component contracts pass, including native system-tray, desktop-keyboard, and SpaceX interaction coverage.

## Recommended Local Tooling Alignment

1. Run `nvm use` to select Node `24.15.0`.
2. Confirm `node -v` and `npm -v` before diagnosing tool failures.
3. Use a different Node release only when it satisfies `package.json#engines`.

## Troubleshooting

- If test fails with port binding in sandboxed environments, run with elevated permissions or locally in non-sandbox shell.
- If Angular CLI prompts for analytics in CI/local automation, set:
  - `NG_CLI_ANALYTICS=false`
- If build crashes with memory allocator errors, switch to supported LTS Node first before code-level debugging.
