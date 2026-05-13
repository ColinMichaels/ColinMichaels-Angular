# Architecture Audit and Refactor Plan

Date: 2026-05-12

Scope: Angular 19 standalone application using TailwindCSS, Firebase, AngularFire, ngx-markdown, and an experimental OS-style desktop framework.

This plan is intentionally phased. It preserves routes, content, Firebase configuration, and existing OS-style systems while moving reusable infrastructure toward `core-os`, shared UI toward `shared`, public website concerns toward `features`, administrative tooling toward `admin`, and experiments toward `labs` or `archive`.

## Executive Summary

The project builds successfully today, but the architecture is carrying two products in one folder tree:

- A public portfolio website under `src/app/components/main`.
- A reusable OS-style framework under `src/app/components/game`.

The current structure works, but the public website imports OS internals directly. Examples include `MainComponent` importing OS app widgets, OS services, `WindowHeaderComponent`, and scroll modules. This makes the landing page heavier and makes it hard to separate stable public content from experimental systems.

The safest refactor is a move-and-adapt plan:

1. Introduce target folders and route group files without changing behavior.
2. Move reusable OS framework pieces into `core-os` with import-only migrations.
3. Move demo applications into `features` or `labs`.
4. Extract shared UI and design tokens after behavior is stable.
5. Add blog/CMS and Editor.js contracts after the content model is defined.

No systems should be deleted during this work. Suspected unused systems should be archived after a reference check.

## Current Validation Baseline

Commands run:

- `npm run build`: passed.
- `npm run lint`: failed with 353 errors.

Build observations:

- Local Node is `v23.11.1`, outside the declared package engine `>=20.11 <23`.
- Initial bundle is `4.66 MB`, exceeding the `2.00 MB` warning budget.
- `styles-*.css` is `3.01 MB` raw, which suggests Tailwind safelist and global style pressure.
- CommonJS optimization warnings are reported for `web-audio-oscillators` and `dayjs`.

Lint failure categories:

- Heavy `any` usage across OS apps, services, Firebase wrappers, and specs.
- Accessibility template errors for clickable non-focusable elements and labels without associated controls.
- `standalone: false` scroll directives conflict with the standalone preference.
- Selector issues: `svg-icon` lacks the app prefix, and `app-defaultPatch-editor` is not kebab-case.
- Injectable lifecycle issue: `SoundService` implements `ngOnInit`, which Angular DI will not call.

## Component Inventory

Current count from static scan:

- 71 Angular components.
- 37 injectable services.
- 4 pipes.
- 54 spec files.
- 2 NgModules remain: `ChatModule` and `ScrollEffectsModule`.

Current component distribution:

- `components/game`: 51 components.
- `components/main`: 12 components.
- `components/UI`: 4 components.
- `modules/chat`: 1 component.
- `modules/scroll`: 1 playground component.
- `components/not-found`: 1 component.
- `app.component.ts`: root shell.

Important current groups:

- Public website: `components/main`, `components/not-found`.
- OS shell: `components/game/desktop`, `components/game/system`, `components/game/templates`, `components/game/directives`, `components/game/factories`, `components/game/services`.
- OS apps and demos: `components/game/apps`.
- Experimental UI primitives: `components/UI`.
- Legacy modules: `modules/chat`, `modules/scroll`.

## Service Inventory

Root/shared application services:

- `services/auth.service.ts`: Firebase Auth facade.
- `services/firebase/firestore.service.ts`: Firestore and Storage facade.
- `services/firebase/realtime-db.service.ts`: deprecated Realtime Database facade.

OS/framework services:

- Application runtime: `application-manager`, `application-lifecycle`, `application-registry`, `application-state-persistence`, `application-catalog`, `application-manager.models`.
- System behavior: `context-menu`, `tooltip`, `notification`, `overlay`, `settings`, `storage`, `user`, `clock`, `log`.
- Media/audio: `sound`, `music`, `patch`, `media`, `svg`, `icon-generator`.
- Gameplay/terminal: `cli`, `game-config`, `input-transformer`, `typewriter`, `ai-chat`.
- Apps/data: `weather`, `task`, `file-system`, `jokes`, `space-x/spacex.service`.

Service concerns to separate:

- Firebase services should move toward `shared/firebase`.
- OS state services should move under `core-os/services`.
- App-specific data services should live with their feature or lab app.
- Logging should become a shared service only if public website and admin both need it.

## Oversized Component and Service Report

Largest component files:

| File                                                                                | Lines | Recommendation                                                                       |
|-------------------------------------------------------------------------------------|------:|--------------------------------------------------------------------------------------|
| `modules/chat/chat.component.ts`                                                    |   769 | Split shell, conversation list, message thread, composer, dialogs, data seed.        |
| `components/game/system/full-screen-background/full-screen-background.component.ts` |   741 | Extract media provider adapters, scroll/parallax controller, and player API loaders. |
| `components/game/apps/messages/messages.component.ts`                               |   453 | Extract message list, composer, conversation nav, mock data.                         |
| `components/game/apps/cli-game/cli-game.component.ts`                               |   357 | Move command IO orchestration into facade and keep UI focused.                       |
| `components/game/system/login-screen/login-screen.component.ts`                     |   348 | Split login/register/reset forms and auth validation helpers.                        |
| `components/game/templates/app-window/app-window.component.ts`                      |   328 | Extract drag/resize logic into directives or window controller service.              |
| `components/game/desktop/desktop.component.ts`                                      |   268 | Move intro boot sequence and notification seeding into OS startup service.           |

Largest services/data files:

| File                                              | Lines | Recommendation                                                                          |
|---------------------------------------------------|------:|-----------------------------------------------------------------------------------------|
| `services/firebase/firestore.service.ts`          |   671 | Split Firestore document CRUD, Storage upload, user profile helpers, and batch helpers. |
| `components/game/services/file-system.service.ts` |   381 | Separate static tree loading, path operations, mock generation, and UI state.           |
| `services/firebase/realtime-db.service.ts`        |   345 | Keep as deprecated compatibility adapter until no consumers remain.                     |
| `components/game/services/application-catalog.ts` |   331 | Move app entries into feature-owned manifests and register through a catalog adapter.   |
| `components/game/services/weather.service.ts`     |   309 | Add typed API DTOs and feature boundary.                                                |
| `components/game/services/settings.service.ts`    |   298 | Split registry, persistence, and form adapter concerns.                                 |

## Duplicated Logic Report

Confirmed duplication:

- `MenuTypeAComponent` and `MenuTypeBComponent` both use selector `app-menu-type-a`. `MenuTypeBComponent` should be `app-menu-type-b`.
- Chat sample data exists in both `modules/chat/chat.service.ts` and `modules/chat/chat.component.ts`.
- `ChatBotComponent` and `MessagesComponent` overlap as message/chat UI concepts.
- Public home project demos instantiate OS app components directly instead of using a shared project/demo card contract.
- `WindowHeaderComponent`, `AppWindowComponent`, `FinderWindowComponent`, and project demo wrappers contain overlapping window chrome concepts.
- Tooltip behavior exists as a directive, service, overlay component, and examples app. This is valid for an OS framework, but should be packaged as one `core-os/tooltip` module.
- External API demo patterns repeat between SpaceX and Weather components: service call, loading state, detail panel, and external window opening.

Potential duplication or consolidation targets:

- `NotificationService`, `NotificationServerComponent`, and media/icon helpers should form a reusable notification package.
- `ScrollEffectsModule` and standalone public page animation use should become standalone directives in `shared/scroll`.
- `StorageService` and `ApplicationStatePersistenceService` should share a browser storage abstraction or have a documented boundary.

## Dead Code and Archive Candidates

These are suspected unused or route-unreachable based on static reference scans. Do not delete them without manual route/template/runtime verification.

Archive candidates:

- `components/UI/toggles/big-toggle`
- `components/UI/toggles/multi-toggle`
- `components/UI/toggles/shiny-silver-toggle`
- `components/game/apps/login-window`
- `components/game/system/game-server`
- `components/game/templates/intro-overlay`
- `components/game/utils/overlay`
- `components/main/resume/resume.component.ts`
- `components/main/resume/old-resume.html`
- `modules/scroll/scroll-effects-playgorund`
- `pipes/slugify.pipe.ts`
- `modules/chat/chat.module.ts`
- `components/game/services/icon-generator.service.ts`
- `services/firebase/FirestoreTestUtils.ts`

Archive policy:

- Move deprecated but preserved systems to `archive/YYYY-MM-DD/<original-path>`.
- Keep a README in each archive folder explaining original path, reason, and restoration steps.
- Preserve route redirects or compatibility imports if anything was publicly reachable.

## Route Organization Audit

Current route map uses `withHashLocation()` and should keep hash URLs for Firebase hosting compatibility unless hosting rewrites are explicitly changed.

Current routes:

- `#/`: public home.
- `#/background`: background experiment.
- `#/os`: OS desktop, protected by `AuthGuard`.
- `#/os/:app`: OS desktop with app launch param, protected by `AuthGuard`.
- `#/login`: OS login.
- `#/sleep`: OS sleep screen.
- `#/boot`: OS boot/loading screen.
- `#/external/:externalUrl`: guarded external redirect.
- `**`: not found.

Route issues:

- Route declarations import concrete component paths from `components/game`.
- Public routes and OS routes are not grouped.
- No `/admin`, `/blog`, `/labs`, or `/archive` route boundary exists yet.
- `background` is experimental but sits as a top-level public route.

Proposed route shape:

```ts
export const routes: Routes = [
  ...publicRoutes,
  ...osRoutes,
  ...adminRoutes,
  ...labRoutes,
  { path: '**', loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
```

Preserved route paths:

- Keep `''`, `background`, `os`, `os/:app`, `login`, `sleep`, `boot`, and `external/:externalUrl`.
- Add new routes without replacing old ones.
- If a route later moves, add redirect routes instead of removing paths.

## Shared Design System Opportunities

Tailwind is the primary styling system and should remain so.

Recommended shared UI targets:

- `shared/ui/window-header`
- `shared/ui/button`
- `shared/ui/icon-button`
- `shared/ui/form-field`
- `shared/ui/card`
- `shared/ui/dialog`
- `shared/ui/badge`
- `shared/ui/empty-state`
- `shared/ui/media`
- `shared/scroll` standalone directives
- `shared/pipes`

Recommended token targets:

- CSS custom properties for surface, border, text, accent, danger, success, warning, radius, shadow, and z-index layers.
- Tailwind theme extension that maps to those CSS variables.
- Separate public-site tokens from OS-theme tokens where necessary.

Tailwind risks:

- Current `styles-*.css` raw output is over 3 MB.
- Existing safelist patterns are broad and likely inflate CSS.
- `tailwind.config.js` content globs overlap. This can be simplified after folder migration.

## Blog and CMS Preparation

No blog feature currently exists. Existing markdown support is limited to `MarkdownReaderComponent`, `ngx-markdown`, `marked`, and Prism scripts.

Recommended feature boundary:

```text
src/app/features/blog/
  blog.routes.ts
  models/blog-post.model.ts
  services/blog-repository.service.ts
  pages/blog-index/
  pages/blog-detail/
  components/post-card/
  components/tag-list/

src/app/admin/cms/
  cms.routes.ts
  models/editor-document.model.ts
  services/cms-draft.service.ts
  pages/post-editor/
  pages/media-library/
```

Minimum content model:

- `id`
- `slug`
- `title`
- `excerpt`
- `coverImage`
- `author`
- `categories`
- `tags`
- `status`: `draft | scheduled | published | archived`
- `seo`: title, description, canonical, open graph image
- `contentFormat`: `editorjs`
- `blocks`: Editor.js block JSON
- `createdAt`, `updatedAt`, `publishedAt`

Firebase collections:

- `posts`
- `postDrafts`
- `media`
- `categories`
- `tags`

Migration stance:

- Keep existing markdown docs under `assets/docs`.
- Add Editor.js as an admin-only editor, not a public runtime dependency.
- Render published Editor.js blocks through a read-only public renderer.
- Store block JSON, not HTML, and sanitize embeds at render time.

## Editor.js Compatibility Plan

Editor.js works best as an admin feature with browser-only initialization.

Implementation requirements:

- Lazy-load Editor.js only in `admin/cms`.
- Wrap Editor.js in an Angular standalone component using `AfterViewInit` and `DestroyRef`.
- Guard initialization behind `isPlatformBrowser`.
- Define strict block DTOs for paragraph, header, image, embed, list, quote, code, delimiter, table, and raw HTML only if explicitly allowed.
- Build a public renderer that maps block types to Angular components.
- Store image assets in Firebase Storage and references in Firestore.
- Keep draft autosave separate from publish.

Security requirements:

- Do not trust saved block data.
- Sanitize URLs and embeds.
- Restrict raw HTML blocks or keep them admin-only with explicit review.
- Add Firestore rules for author/admin write access and public published read access.

## OS Framework Modularization Strategy

Target `core-os` should hold reusable framework infrastructure, not public website logic.

Proposed `core-os` structure:

```text
src/app/core-os/
  core-os.routes.ts
  shell/
    desktop/
    boot-screen/
    login-screen/
    sleep-screen/
  windowing/
    app-window/
    window-header/
    window-controller/
  dock/
  tray/
  context-menu/
  tooltip/
  notifications/
  background/
  filesystem/
  terminal/
  app-registry/
    application-catalog.ts
    application-manager.models.ts
    application-manager.service.ts
    application-lifecycle.service.ts
    application-registry.service.ts
    application-state-persistence.service.ts
  services/
    clock.service.ts
    log.service.ts
    settings.service.ts
    storage.service.ts
    sound.service.ts
    user.service.ts
```

OS apps should move out of the framework when they are demos or product features:

```text
src/app/features/
  portfolio/
  projects/
  blog/
  weather-demo/
  tasks/
  music/
  spacex/

src/app/labs/
  icon-playground/
  tailwind-preview/
  tooltip-examples/
  full-screen-background-demo/
  chat-experiment/
```

Catalog migration:

- Keep `ApplicationManagerService` public API stable.
- Replace one central `application-catalog.ts` with feature-owned app manifests over time.
- Support both legacy catalog entries and new manifests during migration.

## Proposed Folder Structure

```text
src/app/
  app.component.ts
  app.config.ts
  app.routes.ts

  core-os/
    core-os.routes.ts
    shell/
    windowing/
    dock/
    tray/
    terminal/
    context-menu/
    tooltip/
    notifications/
    background/
    filesystem/
    app-registry/
    services/

  shared/
    ui/
    directives/
    pipes/
    firebase/
    design-tokens/
    utils/
    not-found/

  features/
    portfolio/
    projects/
    blog/
    weather/
    tasks/
    music/
    spacex/

  admin/
    admin.routes.ts
    cms/
    auth/
    dashboard/

  labs/
    labs.routes.ts
    tailwind-preview/
    icon-playground/
    scroll-effects/
    full-screen-background/

archive/
  README.md
  YYYY-MM-DD/
```

Recommended path aliases:

```json
{
  "paths": {
    "@core-os/*": ["src/app/core-os/*"],
    "@shared/*": ["src/app/shared/*"],
    "@features/*": ["src/app/features/*"],
    "@admin/*": ["src/app/admin/*"],
    "@labs/*": ["src/app/labs/*"]
  }
}
```

## Migration Plan

### Phase 0: Baseline Stabilization

- Pin local Node to a supported version from `package.json`.
- Decide whether lint should be a hard gate immediately or repaired in batches.
- Create a route snapshot test for current routes.
- Capture a build artifact size baseline.
- Add a short architecture decision record for preserving hash routes.

Exit criteria:

- `npm run build` passes.
- Lint error count is documented and triaged.
- No route behavior changed.

### Phase 1: Folder Skeleton and Route Grouping

- Add empty target folders with README files.
- [~] Split `app.routes.ts` into public, OS, admin, and lab route arrays.
  - Progress: added `features/public/public.routes.ts`, `core-os/os.routes.ts`, and `labs/lab.routes.ts`; admin routes are still pending.
- Keep route paths unchanged.
- Move `NotFoundComponent` to `shared/not-found` or leave a compatibility export.

Exit criteria:

- Build still passes.
- Route paths remain identical.

### Phase 2: Shared UI and Directive Extraction

- Move scroll directives from `modules/scroll` to standalone `shared/directives/scroll`.
- Preserve `ScrollEffectsModule` temporarily as a compatibility wrapper.
- Move public-safe pipes to `shared/pipes`.
- Extract typed `ProjectFeature` and `ProjectDemo` models from inline home template data.
- Move `WindowHeaderComponent` only after deciding whether it is shared UI or OS window chrome.

Exit criteria:

- Public home imports fewer OS internals.
- Existing templates still render.
- No public content removed.

### Phase 3: Core OS Framework Move

- Move app manager, windowing, dock, tray, context menu, tooltip, notifications, terminal, filesystem, and shell components into `core-os`.
- Update imports mechanically.
- Keep `ApplicationManagerService` and route behavior stable.
- Preserve app IDs in `APP_ID`.

Exit criteria:

- `#/os`, `#/os/:app`, `#/login`, `#/boot`, and `#/sleep` still work.
- Open/focus/close app behavior remains unchanged.

### Phase 4: Feature and Lab Isolation

- Move stable demo apps to `features`.
- Move playgrounds and experiments to `labs`.
- Keep app catalog entries pointing to moved components.
- Add `labs.routes.ts` only for intentionally reachable experiments.
- Move deprecated/unreachable systems to `archive` after verification.

Exit criteria:

- Public home no longer imports experimental OS app components directly.
- Catalog can register apps from features and labs.
- Archived systems have restoration notes.

### Phase 5: Firebase and CMS Foundation

- Move Firebase facades to `shared/firebase`.
- Split Firestore document, Storage upload, user profile, and batch helpers.
- Keep `RealtimeDbService` as deprecated compatibility adapter until all consumers are migrated.
- Add `features/blog` read model and `admin/cms` draft model.
- Add Editor.js adapter behind lazy admin route.

Exit criteria:

- Existing Firebase Auth, Firestore, Storage, and Realtime Database integrations continue to build.
- Blog public rendering does not depend on Editor.js runtime.

### Phase 6: Design System and Bundle Reduction

- Add tokenized Tailwind theme extension.
- Reduce broad Tailwind safelist patterns.
- Split OS global styles from public global styles.
- Replace repeated button/card/form utility clusters with shared primitives.
- Review CommonJS warnings and bundle budget after lazy route boundaries are cleaner.

Exit criteria:

- Initial CSS size decreases.
- Public website route has minimal OS/lab code in its lazy chunk.

## Risk Assessment

High risk:

- Moving OS framework files can break dynamic app catalog imports.
- Changing route paths can break external links and Firebase-hosted hash URLs.
- Firebase config and environment files must not be overwritten.
- Editor.js raw/embed blocks can introduce XSS if rendered without sanitization.

Medium risk:

- Public home currently renders OS app components directly, so decoupling may change visual demos.
- Storage migrations can orphan local settings, tasks, patches, and open app state.
- Lint remediation may touch many templates and create visual regressions.
- Bundle reduction through Tailwind safelist changes can remove dynamic classes if not covered.

Low risk:

- Creating route group files while preserving paths.
- Adding path aliases.
- Adding feature/lab/core folder skeletons.
- Moving clearly standalone pipes or directives with compatibility exports.

Mitigations:

- Move files in small batches and run build after each batch.
- Keep compatibility modules and re-export files temporarily.
- Add route snapshot tests before route changes.
- Keep archived code restorable.
- Do not change Firebase environment file names or provider setup during folder migration.

## Recommended Roadmap

1. Baseline gate repair: document lint debt, pin Node, and keep build green.
2. Route grouping: split route declarations without changing paths.
3. Public website simplification: extract home page data and remove direct OS app imports from public components.
4. Shared scroll and UI primitives: convert scroll directives to standalone and preserve compatibility module.
5. Core OS move: migrate shell, app manager, windowing, dock, tray, terminal, tooltip, context menu, notification, storage, settings.
6. Feature/lab move: move SpaceX, Weather, Tasks, Music, Tailwind Preview, Icon Playground, Tooltip Examples, and background demo into feature/lab boundaries.
7. Archive pass: move verified unused systems to `archive` with restoration notes.
8. Blog/CMS foundation: add models, Firestore schema, admin route, Editor.js wrapper, and public renderer.
9. Design system pass: add tokens, reduce Tailwind safelist, and standardize buttons/forms/cards.
10. Quality pass: reduce lint failures by category, then make lint a hard gate again.
