# Development

## Prerequisites

- Node.js LTS (recommended: Node 20 or Node 22)
- npm 10+
- Chrome/Chromium for Karma tests

Current environment note: Node `23.11.1` is unsupported by Angular 19 and currently causes unstable build behavior in this repository.

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

## Current Quality Gate Status (Audit Baseline)

- `npm ci`: not re-run in this pass (existing `node_modules` reused)
- `npm run lint`: runs and reports real legacy issues (`353` current errors)
- Focused changed-spec runs with `npx ng test --watch=false --browsers=ChromeHeadless --include=...`: passing (`13/13`)
- `npm run build`: passing when Angular can fetch configured Google Fonts for production font inlining

Current build observations:

- Local Node is `v23.11.1`, outside the declared package engine `>=20.11 <23`.
- The production build still reports the existing initial bundle warning and CommonJS warnings for `web-audio-oscillators` and `dayjs`.

## Recommended Local Tooling Alignment

1. Use Node `22` (or any version matching `package.json#engines`).
2. Run `nvm use` (project now includes `.nvmrc`).
3. Continue reducing lint backlog from current baseline.

## Troubleshooting

- If test fails with port binding in sandboxed environments, run with elevated permissions or locally in non-sandbox shell.
- If Angular CLI prompts for analytics in CI/local automation, set:
  - `NG_CLI_ANALYTICS=false`
- If build crashes with memory allocator errors, switch to supported LTS Node first before code-level debugging.
