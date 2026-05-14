# Project Overview

## What This Project Is

This project combines a public portfolio and publishing site with a macOS-inspired desktop experience in the browser. The public site now keeps portfolio, blog, and labs entry points visible while the interactive in-browser "OS" remains available through its own launch route.

## Core Experience

- Desktop shell with app windows and focus management.
- App registry and launcher behavior (dock/system tray/menu).
- CLI-driven game flow with typed output and level progression.
- Settings, storage, and user profile persistence.
- Audio, media rendering, and visual overlay systems.

## Tech Stack

- Angular 19 standalone components
- TypeScript (strict mode enabled)
- Tailwind CSS 3
- RxJS for reactive state/event streams
- AngularFire/Firebase for backend integration points
- FontAwesome and CDK helpers in UI components

## High-Level Module Map

- `src/app/components/main` and `src/app/features/public`:
  public homepage and portfolio-facing route boundary.
- `src/app/features/blog`:
  public blog routes, typed post models, local repository, and read-only block rendering.
- `src/app/admin`:
  protected admin and CMS route boundary.
- `src/app/labs`:
  public experiments index and route-backed playgrounds.
- `src/app/core-os`:
  OS route boundary that preserves legacy desktop/login/boot/sleep URLs.
- `src/app/components/game`:
  legacy desktop simulation, apps, system UI, and most game services pending folder migration.
- `src/app/components/game/services`:
  core runtime logic (app manager, CLI, settings, storage, media, sound, user).
- `src/app/services`:
  shared Firebase/auth services.
- `src/app/guards`, `src/app/pipes`, `src/app/modules`:
  route guards, pipe helpers, feature modules.

## Suggested Reading Order

1. `src/app/app.routes.ts`
2. `src/app/features/public/public.routes.ts`
3. `src/app/labs/lab.routes.ts`
4. `src/app/core-os/os.routes.ts`
5. `src/app/app.config.ts`
6. `src/app/components/game/desktop/desktop.component.ts`
7. `src/app/components/game/services/application-manager.service.ts`
8. `src/app/components/game/apps/cli-game/cli-game.component.ts`
9. `src/app/components/game/services/*` for subsystem behavior
