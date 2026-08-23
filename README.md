# ColinMichaels.com

Angular and Firebase application for ColinMichaels.com. The project combines a public portfolio and publishing site, a Firestore-backed blog/CMS, public experiments, and a reusable browser-based OS framework.

## Current Status

The application is actively developed on scoped feature branches. Use the [Roadmap](docs/FUTURE_FEATURES/ROADMAP.md) for the current prioritized backlog, the [August 2026 audit action plan](docs/SEO/AUDITS/2026-08-15/ACTION-PLAN.md) for the current SEO/discovery release queue, and the [Changelog](docs/CHANGELOG.md) for delivered source work. The root `ACTION-PLAN.md` and `FULL-AUDIT-REPORT.md` files are preserved July 2026 snapshots, not the current backlog.

Recent source work includes hardened CMS recovery/import/media flows; reusable Core OS app-registry, windowing, Dock, tray, keyboard-complete context-menu, terminal-typewriter, and versioned virtual-filesystem packages; registry-driven one-click Dock activation with window minimize/restore and zoom behavior; a writable Finder with durable folders, organization, Trash, tags, search, bounded session undo/redo, and safe metadata-only application previews; cinematic topic-page heroes; bounded in-body image previews for post listings; a paginated device-local Reading library on Profile; and a repeatable local release gate. Local source, Firebase preview, and production deployment remain separate states.

## What This Project Contains

- Public website for portfolio, writing, media, project notes, and personal brand content.
- Blog system with Editor.js content blocks, categories, tags, search, RSS/JSON feeds, social sharing, SEO metadata, and reading UX.
- Protected admin CMS for creating, editing, importing, publishing, and managing blog posts and media.
- Firebase Functions for crawler-friendly SEO HTML, sitemap/feed generation, YouTube feed loading, and CMS AI helpers.
- Preserved labs area for experiments and demos, with `/labs` temporarily redirected during its redesign.
- Browser OS framework for desktop/window/Dock/terminal-style systems. Its current boundary, macOS-inspired behavior, Finder phases, and extraction criteria are documented in [Core OS Desktop and Finder](docs/ARCHITECTURE/CORE_OS_DESKTOP.md).

## Current Stack

- Angular 22 standalone components
- TypeScript strict mode
- Tailwind CSS
- Firebase Hosting, Firestore, Storage, Auth, and Functions
- Editor.js for CMS post content
- Font Awesome for iconography
- RxJS for reactive state

## Repository Layout

- `src/app/features/public`: public site route boundary and portfolio-facing views.
- `src/app/features/blog`: public blog listing, search, archive, and post detail experience.
- `src/app/admin`: protected CMS/admin routes for posts, media, and site management.
- `src/app/shared`: reusable public-site UI, SEO helpers, models, and utilities.
- `src/app/core-os`: reusable OS-style framework route boundary and infrastructure.
- `src/app/components/game`: legacy desktop/game systems pending continued migration into `core-os`.
- `src/app/labs`: preserved experiments and playground routes; `/labs` currently redirects to `/blog`.
- `labs`: isolated production experiments and reproducible media tooling that are not application runtime dependencies.
- `archive`: retired or unreachable prototypes preserved with restoration and security notes.
- `functions`: Firebase Functions for SEO rendering, feeds, sitemap, media, and CMS helpers.
- `docs`: architecture, setup, changelog, planning, and migration notes.

## Requirements

Use the Node version pinned in `.nvmrc`:

```bash
nvm use
npm ci
```

The current engine requirement is:

```text
^22.22.3 || ^24.15.0 || >=26.0.0
```

## Common Commands

```bash
npm start
```

Runs the Angular app with the local configuration.

```bash
npm run build
npm run lint
npm run test:docs
```

Required build/lint validation plus the tracked-Markdown documentation gate.

```bash
npm run test:release
```

Runs the local release gate: lint, production build, documentation validation, the complete Angular suite, content-package validation, and all non-emulator Functions tests. It does not deploy or prove production behavior.

```bash
npm --prefix functions run build
npm run serve:functions
npm run serve:emulators
```

Builds and runs Firebase Functions/emulators for local backend work.

```bash
npm run generate:env
npm run prepare:functions-seo
```

Generates Angular environment files and prepares the SEO HTML shell used by Firebase Functions.

## Deployment Notes

Firebase Hosting serves the built Angular app from `dist/colin-michaels-firebase/browser` and rewrites application routes through `renderSeoHtml` for crawler-friendly HTML. Feed and sitemap routes are handled by dedicated Functions.

The Functions runtime is configured as Node 22 in `firebase.json` and `functions/package.json`. Hosting and Functions predeploy hooks run the Angular build, prepare the SEO shell, and build Functions.

Production deploys run through `.github/workflows/firebase-production.yml` on pushes to `master` and through the same workflow's manual dispatch controls. Deploying Functions also deploys the matching Hosting assets because `renderSeoHtml` serves deep-link HTML that references the current Angular bundle filenames. Manual dispatch exposes an opt-in `force_functions` confirmation for reviewed Firebase Functions policy changes that require `--force`; it remains disabled for automatic push deploys and never applies to Hosting or Rules. The dev PR preview workflow remains separate because it deploys temporary Hosting preview channels only.

## Environment Files

Local secrets and generated environment files must stay out of version control.

- Use `src/environments/.env.example` as the safe template.
- Keep `src/environments/.env.local` local only.
- Keep `src/environments/environment.local.ts` local only.
- Do not commit Firebase service account JSON or Functions secret values.

See [Environment and Secrets Setup](docs/README/ENVIRONMENT_SECRETS.md) for full CI, Firebase, Functions, and local emulator details.

## Project Areas

### Public Site

The public website is the main professional surface: homepage, portfolio content, blog, project writing, media, SEO metadata, feeds, and global site shell. Normal public routes use a shared header and theme system.

Relevant areas:

- `src/app/features/public`
- `src/app/components/main`
- `src/app/shared`
- `src/app/shared/seo`

### Blog and CMS

The blog supports structured Editor.js blocks, custom typography/stats/chart/sanitized-HTML content blocks, Firestore persistence, post statuses, categories, tags, search, social sharing, Open Graph/Twitter metadata, BlogPosting JSON-LD, RSS, JSON Feed, sitemap entries, reading time, table of contents, heading anchors, and CMS SEO/share validation.

Relevant areas:

- `src/app/features/blog`
- `src/app/admin/cms`
- `src/app/admin/media-library`
- `functions/src/index.ts`

### SEO and Feeds

Firebase Hosting rewrites clean app routes through the `renderSeoHtml` Function so crawlers receive initial HTML with canonical, Open Graph, Twitter Card, robots, and JSON-LD metadata. Published posts also feed `/sitemap.xml`, `/feed.xml`, and `/feed.json`.

Relevant routes:

- `/sitemap.xml`
- `/feed.xml`
- `/feed.json`
- `/blog`
- `/blog/search`
- `/blog/category/:category`
- `/blog/tag/:tag`
- `/blog/:slug`

### Labs

Labs isolate experiments and playgrounds from the production public site and reusable OS framework. Their implementation remains preserved, but the `/labs` index redirects to `/blog` during redesign; `/topics/labs-projects` is the current public discovery surface. Experimental systems should stay under `labs`, `archive`, or playground-style boundaries unless intentionally promoted.

Relevant areas:

- `src/app/labs`
- `src/app/modules/scroll`

### Core OS Framework

The OS-style systems are reusable infrastructure and should be preserved and modularized rather than rewritten. This includes desktop UI, dock, windows, terminal systems, tooltips, context menus, command systems, and app/window management.

Relevant areas:

- `src/app/core-os` — active route boundary plus the migrated app-registry, windowing, dock, tray, context-menu, terminal typewriter, tooltip, and browser-storage packages.
- `src/app/components/game`

## Documentation

Start here:

- [Documentation Index](docs/README/INDEX.md)
- [Project Overview](docs/README/PROJECT_OVERVIEW.md)
- [Development Setup](docs/README/DEVELOPMENT.md)
- [Environment and Secrets Setup](docs/README/ENVIRONMENT_SECRETS.md)
- [Architecture Overview](docs/ARCHITECTURE/OVERVIEW.md)
- [Media Library Architecture](docs/ARCHITECTURE/MEDIA_LIBRARY.md)
- [Security Notes](docs/ARCHITECTURE/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)
- [Future Roadmap](docs/FUTURE_FEATURES/ROADMAP.md)
- [Tech Debt Completion Log](docs/TODOS/TECH_DEBT.md)
- [August 2026 SEO and Reader-Experience Action Plan](docs/SEO/AUDITS/2026-08-15/ACTION-PLAN.md)

## Development Rules

Project-specific agent and architecture rules live in [AGENTS.md](AGENTS.md). In short:

- Preserve existing functionality.
- Prefer refactor, extraction, and modularization over rewrites.
- Keep reusable OS framework systems under `core-os` boundaries where possible.
- Keep experimental systems isolated from production public-site logic.
- Use Tailwind and existing shared design tokens/components.
- Preserve dark mode support.
- Do not delete routes without redirects.
- Do not overwrite Firebase configs or local secrets.
- Run `npm run build` and `npm run lint` before completing code changes.

## Validation Notes

If `npm run lint` or `npm run build` fails immediately with an Angular CLI Node-version error, switch to the pinned Node version first:

```bash
nvm use
node -v
```

Then rerun:

```bash
npm run lint
npm run build
```

For TypeScript-only checks during development:

```bash
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
./node_modules/.bin/tsc -p tsconfig.spec.json --noEmit
npm --prefix functions run build
```
