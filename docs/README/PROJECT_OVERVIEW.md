# Project Overview

## What This Project Is

This project recreates a macOS-inspired desktop experience in the browser using Angular and Tailwind CSS. It mixes a portfolio-style landing experience with an interactive in-browser "OS" that includes movable windows, app launching, CLI-like gameplay, notifications, overlays, and media tools.

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

- `src/app/components/main`:
  public/portfolio-facing experience.
- `src/app/components/game`:
  desktop simulation, apps, system UI, and most game services.
- `src/app/components/game/services`:
  core runtime logic (app manager, CLI, settings, storage, media, sound, user).
- `src/app/services`:
  shared Firebase/auth services.
- `src/app/guards`, `src/app/pipes`, `src/app/modules`:
  route guards, pipe helpers, feature modules.

## Suggested Reading Order

1. `src/app/app.routes.ts`
2. `src/app/app.config.ts`
3. `src/app/components/game/desktop/desktop.component.ts`
4. `src/app/components/game/services/application-manager.service.ts`
5. `src/app/components/game/apps/cli-game/cli-game.component.ts`
6. `src/app/components/game/services/*` for subsystem behavior

