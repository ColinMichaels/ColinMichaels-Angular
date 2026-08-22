# Project Overview

## What This Project Is

This project combines a public portfolio and publishing site with a macOS-inspired desktop experience in the browser. The public site is currently blog-first: the preserved Labs implementation is out of public navigation and `/labs` temporarily redirects to `/blog`, while Labs and project writing remains available through `/topics/labs-projects`. The interactive in-browser "OS" remains available through its own launch route.

The normal site routes share a global header/menu and persistent light/dark theme toggle. The OS desktop/login/boot/sleep routes remain outside that shared site shell so the reusable OS framework can preserve its own interface system.

The protected Profile surface owns account identity, providers, roles, points, device settings, communication preferences, and a device-local Reading library. Reading records are ordered by recent modification and paginated 10 at a time; cross-device account synchronization is deliberately deferred.

For current priorities, use the [Roadmap](../FUTURE_FEATURES/ROADMAP.md). Dated audits and the root July SEO reports are evidence snapshots rather than live backlog authorities.

## Core Experience

- Desktop shell with app windows and focus management.
- App registry and launcher behavior (dock/system tray/menu).
- CLI-driven game flow with typed output and level progression.
- Settings, storage, and user profile persistence.
- Audio, media rendering, and visual overlay systems.

## Tech Stack

- Angular 22 standalone components
- TypeScript (strict mode enabled)
- Tailwind CSS 3
- RxJS for reactive state/event streams
- AngularFire/Firebase for backend integration points
- FontAwesome and CDK helpers in UI components

## High-Level Module Map

- `src/app/components/main` and `src/app/features/public`:
  public homepage and portfolio-facing route boundary.
- `src/app/shared`:
  reusable global site header, theme persistence, not-found UI, and shared primitives.
- `src/app/features/blog`:
  public blog index, category listing, detail routes, typed post models, Firestore-backed repository/storage, and read-only block rendering.
- `src/app/features/search`, `src/app/features/topics`, `src/app/features/authors`, and `src/app/features/youtube`:
  public discovery, canonical topic journeys, bylines/profiles, and verified channel-aware video continuations.
- `src/app/admin`:
  protected admin and CMS route boundary for post listing, creation, and editing.
- `src/app/labs`:
  preserved experiments and route-backed playgrounds; the `/labs` index is paused while `/background` remains available.
- `src/app/core-os`:
  OS route boundary plus migrated app-registry, windowing, tooltip, and browser-storage packages; legacy desktop/login/boot/sleep URLs remain preserved.
- `src/app/components/game`:
  legacy desktop simulation, apps, system UI, and most game services pending folder migration.
- `src/app/components/game/services`:
  legacy runtime logic (CLI, settings, media, sound, user) pending staged Core OS migration; former app-registry and storage service paths are compatibility re-exports. The former window-template paths separately re-export `core-os/windowing`.
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
7. `src/app/core-os/app-registry/application-manager.service.ts`
8. `src/app/core-os/windowing/app-window/app-window.component.ts`
9. `src/app/components/game/apps/cli-game/cli-game.component.ts`
10. `src/app/components/game/services/*` for subsystem behavior
