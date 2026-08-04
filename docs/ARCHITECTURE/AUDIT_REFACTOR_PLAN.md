# Architecture Audit and Refactor Plan

Original audit date: 2026-05-12

Original scope: Angular 19 standalone application using TailwindCSS, Firebase, AngularFire, ngx-markdown, and an experimental OS-style desktop framework. The application now uses Angular 22; counts and command results below are retained as the historical May baseline unless a later update explicitly supersedes them.

This plan is intentionally phased. It preserves routes, content, Firebase configuration, and existing OS-style systems while moving reusable infrastructure toward `core-os`, shared UI toward `shared`, public website concerns toward `features`, administrative tooling toward `admin`, and experiments toward `labs` or `archive`.

## 2026-07-09 Cleanup Update

- Removed unreferenced public/blog duplicates after route and import graph checks: the old blog search component, old homepage blog wrapper/tech tips section, disclaimer/subheader components, and the obsolete `components/not-found` compatibility export.
- Preserved remaining app-unreachable candidates that look like OS framework, lab/demo, environment replacement, test helper, or content/archive decisions until they can be explicitly moved to `core-os`, `labs`, `archive`, or removed with migration notes.
- Tightened lazy rendering in the public shell and blog article path: below-the-fold homepage sections no longer prefetch on idle, the site search drawer renders only when opened, and article comments/author widgets defer to viewport.

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

## Historical Validation Baseline (2026-05-12)

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

- 81 Angular components.
- 38 injectable services.
- 4 pipes.
- 59 spec files.
- 2 NgModules remain: `ChatModule` and `ScrollEffectsModule`.

Current component distribution:

- `components/game`: 51 components.
- `components/main`: 12 components.
- `components/UI`: 4 components.
- `features/blog`: 5 components.
- `admin`: 4 components.
- `labs`: 1 component.
- `modules/chat`: 1 component.
- `modules/scroll`: 1 playground component.
- `shared/not-found`: 1 component.
- `app.component.ts`: root shell.

Important current groups:

- Public website: `components/main`.
- Blog feature: `features/blog`.
- Admin tooling: `admin`.
- Shared fallback UI: `shared/not-found`.
- OS shell: `components/game/desktop`, `components/game/system`, `components/game/templates`, `components/game/directives`, `components/game/factories`, `components/game/services`.
- OS apps and demos: `components/game/apps`.
- Experimental UI primitives: `components/UI`.
- Legacy modules: `modules/chat`, `modules/scroll`.

## Service Inventory

Root/shared application services:

- `services/auth.service.ts`: Firebase Auth facade.
- `services/firebase/firestore.service.ts`: Firestore and Storage facade.
- `services/firebase/realtime-db.service.ts`: deprecated Realtime Database facade.
- `features/blog/services/blog-repository.service.ts`: typed local blog content repository, pending Firebase backing.

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

Current route map uses clean Angular path URLs. Firebase Hosting rewrites app route requests through `renderSeoHtml`, which injects SEO metadata and returns the Angular shell for deep links.

Current routes:

- `/`: public home.
- `/blog`: public blog index.
- `/blog/category/:category`: public blog category listing.
- `/blog/:slug`: public published blog detail.
- `/labs`: public labs index.
- `/background`: background experiment.
- `/admin`: protected admin overview.
- `/admin/cms`: protected CMS post list.
- `/admin/cms/:slug/edit`: protected Editor.js post editor.
- `/os`: OS desktop, protected by `AuthGuard`.
- `/os/:app`: OS desktop with app launch param, protected by `AuthGuard`.
- `/login`: OS login.
- `/sleep`: OS sleep screen.
- `/boot`: OS boot/loading screen.
- `/external/:externalUrl`: guarded external redirect.
- `**`: not found.

Route issues:

- OS route declarations still import concrete component paths from `components/game`.
- `/archive` route boundary does not exist yet.
- `background` is experimental and remains as a preserved top-level route while the labs index links to it.
- The old homepage demos are component labs embedded in `/labs`; they are not treated as standalone full-screen routes.

Proposed route shape:

```ts
export const routes: Routes = [
  ...publicRoutes,
  ...labRoutes,
  ...adminRoutes,
  ...osRoutes,
  { path: '**', loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
```

Preserved route paths:

- Keep `''`, `background`, `os`, `os/:app`, `login`, `sleep`, `boot`, and `external/:externalUrl`.
- Preserve new `blog`, `blog/:slug`, `labs`, `admin`, and `admin/cms` boundaries unless replacement redirects are added.
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

An initial blog/admin scaffold now exists. The public blog uses `features/blog`, the protected admin CMS list/editor uses `admin/cms`, and both share the typed `BlogPost` content model. CMS-created and edited posts read and write through the Firestore `posts` collection; browser `localStorage` is not used for blog post persistence. Existing markdown support remains limited to `MarkdownReaderComponent`, `ngx-markdown`, `marked`, and Prism scripts.

Recommended feature boundary:

```text
src/app/features/blog/
  blog.routes.ts
  models/blog-post.model.ts
  services/blog-storage.service.ts
  services/blog-repository.service.ts
  pages/blog-index/
  pages/blog-detail/
  components/post-card/
  components/tag-list/

src/app/admin/cms/
  cms.routes.ts
  models/editor-document.model.ts
  models/blog-ai-assistant.model.ts
  services/blog-ai-assistant.service.ts
  services/blog-ai-functions.service.ts
  services/cms-draft.service.ts
  pages/post-list/
  pages/post-editor/
  pages/media-library/
```

Initial implementation status:

- `features/blog/blog.routes.ts`: public `blog`, `blog/category/:category`, and `blog/:slug` routes.
- `features/blog/models/blog-post.model.ts`: typed post, SEO, status, and block contracts.
- `features/blog/services/blog-storage.service.ts`: browser-local storage for initial CMS create/edit workflows.
- `features/blog/services/blog-repository.service.ts`: local typed repository for published/admin reads plus local CMS create/save operations.
- `features/blog/components/block-renderer`: public read-only dispatcher for stored Editor.js-shaped content, including custom Markdown, typography, stats, and sanitized HTML blocks; Chart.js rendering is isolated in `features/blog/components/chart`.
- `admin/admin.routes.ts`: protected admin route boundary.
- `guards/admin-auth.guard.ts`: Firebase Auth custom-claim guard for all admin routes.
- `admin/cms/cms.routes.ts`: protected CMS post list, new post, and post editor routes.
- `admin/cms/components/editor-js`: browser-only Editor.js wrapper using dynamic imports and CMS-only custom tools for code, Markdown, typography, stats, charts, and sanitized HTML sections.
- `admin/cms/services/blog-ai-functions.service.ts`: callable Firebase Functions client for server-side CMS AI metadata and thumbnail generation.
- `admin/cms/services/blog-ai-assistant.service.ts`: CMS-local writing assistant fallback for draft metadata and thumbnail prompt suggestions when the backend is unavailable.
- `functions/src/index.ts`: Firebase callable functions that call OpenAI server-side and store generated blog thumbnails in Firebase Storage.
- Editor.js dependencies are installed as admin-only lazy route dependencies: `@editorjs/editorjs`, `@editorjs/header`, `@editorjs/list`, `@editorjs/quote`, `@editorjs/code`, `@editorjs/delimiter`, `@editorjs/embed`, and `@editorjs/image`.

Minimum content model:

- `id`
- `slug`
- `title`
- `excerpt`
- `coverImage`
- `backgroundImage` (optional full-screen single-post backdrop)
- `author`
- `categories`
- `tags`
- `status`: `draft | scheduled | published | archived`
- `seo`: title, description, canonical, open graph image
- `contentFormat`: `editorjs`
- `blocks`: Editor.js block JSON, normalized into typed blog block data before public rendering
- `createdAt`, `updatedAt`, `publishedAt`

Firebase collections:

- `posts`
- `postDrafts`
- `media`
- `categories`
- `tags`

Migration stance:

- Keep existing markdown docs under `assets/docs`.
- [x] Add Editor.js as an admin-only editor, not a public runtime dependency.
  - Progress: the browser-guarded post editor lazy-loads and destroys Editor.js/tools in `admin/cms`; post saves now persist through the Firebase-backed blog repository.
- [x] Render published Editor.js blocks through a read-only public renderer.
  - Progress: `BlogBlockRendererComponent` handles paragraph, header, image, embed, list, quote, code, Markdown, delimiter, typography, stats, chart, and sanitized HTML blocks without importing Editor.js.
- Store structured block JSON when possible, keep raw HTML as an explicit sanitized fallback, and sanitize embeds/HTML at render time.
  - Interactive article apps use a dedicated Editor.js App Embed tool normalized into the typed embed model. The initial Hear the Hook integration trusts one canonical HTTPS page, applies an app-specific iframe sandbox and capability denials, validates resize messages, and retains a link fallback without widening raw HTML.
- Keep secret-bearing AI calls out of Angular browser code. CMS writing assistance and thumbnail generation run through authenticated Firebase callable functions with `OPENAI_API_KEY` bound as a Functions secret.
- Admin authorization uses Firebase Auth custom claims (`admin`, `cmsAdmin`, or `roles.admin`) across route guards, callable functions, Firestore rules, Realtime Database rules, and Storage rules. The login screen supports Google sign-in, and admin route guards can read future role requirements from route `data.roles`; any role that protects data must also be enforced server-side and in Firebase Security Rules.

## Editor.js Compatibility Plan

Editor.js works best as an admin feature with browser-only initialization.

Implementation requirements:

- Lazy-load Editor.js only in `admin/cms`.
- Wrap Editor.js in an Angular standalone component using `AfterViewInit` and `DestroyRef`.
- Guard initialization behind `isPlatformBrowser`.
- Define strict block DTOs for paragraph, header, image, embed, list, quote, code, Markdown, delimiter, typography, stats, chart, and raw HTML only when explicitly allowed.
- Preserve Markdown as source data, sanitize only after public parsing, normalize block-local heading semantics, and project formatting-free text for search, reading estimates, and metadata assistance.
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
- Add a short architecture decision record for the clean URL and SEO-rendering Hosting rewrite.

Exit criteria:

- `npm run build` passes.
- Lint error count is documented and triaged.
- No route behavior changed.

### Phase 1: Folder Skeleton and Route Grouping

- [x] Add empty target folders with README files.
- [x] Split `app.routes.ts` into public, OS, admin, and lab route arrays.
  - Progress: `app.routes.ts` composes `features/public/public.routes.ts`, `core-os/os.routes.ts`, `admin/admin.routes.ts`, and `labs/lab.routes.ts`; `app.routes.spec.ts` snapshots the route contract.
- [x] Keep route paths unchanged.
  - Progress: added `app.routes.spec.ts` to snapshot the current route paths.
- [x] Move `NotFoundComponent` to `shared/not-found` or leave a compatibility export.
  - Progress: wildcard route lazy-loads `shared/not-found`; legacy `components/not-found` was removed after cleanup validation.

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

- `/os`, `/os/:app`, `/login`, `/boot`, and `/sleep` still work.
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

- [x] Add tokenized Tailwind theme extension.
  - Progress: public colors, widths, radii, and elevation now map to scoped CSS variables; structural tokens live in `_public-design-tokens.scss` and do not alter Core OS routes.
- [x] Reduce broad Tailwind safelist patterns.
  - Progress: generated preview classes remain behind the existing explicit development flag instead of entering normal production CSS.
- [x] Split OS global styles from public global styles.
  - Progress: `styles.scss` is now an ownership manifest for shared foundations, Core OS globals, and public globals. `app-root` receives exactly one `.site-theme-scope` or `.core-os-scope` on public/OS routes; admin retains its dedicated shell. OS controls, gradients, and motion are route-scoped, public media motion is site-scoped, and reusable window/dock chrome is component-owned.
- [x] Replace repeated button/card/form utility clusters with shared primitives.
  - Progress: homepage, archive, search, privacy, and author shells use semantic width primitives; shared cards, fields, buttons, media frames, state panels, and overlays consume the same geometry/elevation tokens; header search/icon/menu/auth controls share purpose-based primitives; and public comments compose the shared card, field, button, success, error, and empty-state contracts. Specialized article, recovery, topic-map, archive-filter, and Core OS treatments remain intentionally separate.
- [x] Review CommonJS warnings and bundle budget after lazy route boundaries are cleaner.
  - Progress: the dependency program removed all CommonJS exemptions and warnings; the visual-system slice reduced the local development stylesheet from 253.52 kB to 250.45 kB before the explicit scope and semantic-control layers were completed. The current production stylesheet is 216.74 kB raw / 25.03 kB estimated transfer and the initial bundle is 1.48 MB raw / 337.33 kB estimated transfer, still within budget.

Exit criteria:

- Initial CSS size decreases.
- Public website route has minimal OS/lab code in its lazy chunk.

### Phase 7: Quality and Inactive Integration Cleanup

- [x] Review the dormant generic OpenAI/weather boundary without removing active CMS AI features.
  - Progress: verified `functions/package.json` deploys `lib/index.js` compiled from `functions/src/index.ts`; preserved its authenticated CMS OpenAI callables; and archived the unrelated anonymous `functions/index.js` proxy with restoration requirements.
- [x] Preserve referenced OS/lab prototypes without remote vendor or location access.
  - Progress: the terminal `aichat` command returns an explicit local archived-relay response, while Weather uses labelled deterministic sample data, local unit conversion, and Demo status.
- [x] Remove obsolete frontend API configuration.
  - Progress: Angular environment generation, examples, and preview/production workflow validation no longer require `APP_API_URL` or its legacy fallback.

Exit criteria:

- No active public, admin, or Core OS route depends on the archived proxy.
- No OpenAI/weather credential or generic vendor API URL is an Angular build input.
- Active CMS OpenAI callables retain their existing Secret Manager boundary.
- Archived code has explicit non-deployment and restoration notes.

## Risk Assessment

High risk:

- Moving OS framework files can break dynamic app catalog imports.
- Changing route paths or Hosting rewrites can break external links and deep-link fallback.
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
