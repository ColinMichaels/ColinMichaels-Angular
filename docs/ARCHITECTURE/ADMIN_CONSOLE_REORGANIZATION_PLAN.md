# Admin Console Reorganization Plan

## Outcome

Turn the current collection of protected admin pages into one calm, consistent working environment without rewriting feature logic or changing established URLs.

The reorganized console should make the next action obvious, reduce repeated chrome, preserve role-based access, and give Posts, Calendar, Homepage, Topics, Links, Comments, Media, and Users a predictable place in the information architecture.

## Current Implementation Status

Phase 1, the first Overview slice, and the first Phase 2 publishing-flow slice are implemented:

- `AdminShellComponent` now owns a 224px desktop sidebar, an optional 72px icon-only collapsed state with hover/focus labels, a 64px utility header, a phone/tablet navigation drawer, the environment indicator, account links, the persistent `New Post` action, and the browser-tab title for the active admin URL. The desktop choice persists without changing the always-labeled mobile drawer.
- `admin-navigation.config.ts` is the typed, role-aware source of truth for the five navigation groups and page titles.
- The public site header is excluded from `/admin/**`, leaving one navigation system inside the console.
- Page-local Admin/Home/Blog navigation was removed from the Overview, Posts, Editor, Calendar, Comments, Users, Media, Homepage, Topics, Recommended Links, and access-denied surfaces.
- The Overview is now an operations dashboard backed by repository post data: publishing counts, the next scheduled post, recent drafts, recently published work, and compact site-management links.
- Duplicate Overview quick actions were removed after responsive review; the shell owns `New Post`, while the schedule module provides contextual Calendar access.
- The Post Editor now presents secondary settings as compact control modules. Post Details remains open, while Publishing, Cover Image, Search & Sharing, Draft Preview, SEO, AI suggestions, and Last Saved details default closed with live summaries and status badges. Its desktop inspector rail remains sticky beneath the shell header and uses a bounded internal scroller so all controls remain reachable above the fixed command area.
- `AdminControlModuleComponent` keeps collapsed form content mounted, preserving field state and upload progress, and invalid saves automatically reveal the section that needs attention.
- The Editor.js toolbar and sticky command area use the same denser hierarchy; on phones the sticky bar keeps status and Save visible while View/Delete actions move into a compact contextual menu.

The next Phase 2 delivery slice is to simplify the Posts maintenance/bulk-action flow and align the schedule/social composition controls with the same compact hierarchy.

## Current Friction

The present admin is functionally capable, but navigation and page composition grew one feature at a time:

- `AdminShellComponent` only renders the environment badge; each page rebuilds its own local navigation, header, actions, width, and spacing.
- The public site header remains visible on admin routes, while admin pages also include Home, Blog, and Admin links. This creates two competing navigation systems.
- The overview uses a large workflow-card collection as navigation. As features grow, the landing page becomes a catalog instead of a useful operational view.
- The Posts header exposes New Post, Calendar, Topics, Recommended Links, Media, import, export, and refresh at the same visual level.
- Maintenance actions, navigation actions, and core publishing actions are mixed together.
- Status colors, page headers, breadcrumbs, buttons, and empty states are recreated with long Tailwind strings across feature components.
- Route strings and role-aware visibility decisions are scattered rather than driven by one typed admin navigation definition.
- Large page components combine page composition, derived view data, form state, and persistence orchestration, which makes small UI changes more expensive.

## Target Information Architecture

Keep the existing routes. Reorganize how they are presented rather than introducing a URL migration.

### Overview

- Overview (`/admin`)

### Publishing

- Posts (`/admin/cms`)
- Calendar (`/admin/cms/calendar`)
- Comments (`/admin/comments`)

`New Post` is a persistent primary action in the shell, not a permanent navigation destination.

### Site Content

- Homepage (`/admin/cms/homepage`)
- Topics (`/admin/cms/topics`)
- Recommended Links (`/admin/cms/recommended-links`)

### Assets

- Media Library (`/admin/cms/media-library`)

### Administration

- Users (`/admin/users`, visible only to permitted roles)

### External Destinations

- View site
- View blog
- Open OS

These belong in one compact utility area instead of appearing in every page header.

## Shared Shell

Expand `AdminShellComponent` into the real protected application shell.

Desktop layout:

- a restrained 224-240px left sidebar
- brand/admin home link at the top
- one grouped navigation list driven by route and role configuration
- environment state and user menu in the sidebar footer
- a compact top bar over the content region with breadcrumbs, page-level secondary actions, and one `New Post` primary action
- one router outlet in the content region

Responsive layout:

- below the desktop breakpoint, collapse the sidebar into a labeled navigation drawer
- keep breadcrumbs and the primary action visible
- preserve the current full-width content surfaces; do not turn tables or the Calendar into generic card stacks
- at phone widths, allow dense tools such as Posts and Calendar to use intentional horizontal scrolling with fixed first-column context where practical

Public-shell boundary:

- stop rendering the public site header for `/admin/**`
- expose `View site`, `Blog`, and `OS` from the admin utility area
- keep public and admin visual systems independent while reusing authentication/user controls where useful

## Shared Admin Primitives

Create a small set of standalone components under `src/app/admin/shared`, not a new general-purpose design-system project:

- `AdminSidebarComponent`
- `AdminMobileNavigationComponent`
- `AdminTopbarComponent`
- `AdminBreadcrumbsComponent`
- `AdminPageHeaderComponent`
- `AdminStatusBadgeComponent`
- `AdminControlModuleComponent`
- `AdminEmptyStateComponent`
- `AdminOverflowMenuComponent`
- typed `admin-navigation.config.ts`

Use the existing zinc/cyan palette and Tailwind tokens. Extract repeated class families only when at least two admin surfaces use them. Avoid abstract wrappers that merely rename a `<div>`.

## Page Simplification

### Overview

Replace the workflow-card catalog with an operations-first summary:

- next scheduled post
- drafts recently updated
- comments awaiting moderation
- failed social deliveries when connector workers exist
- recent publishing activity
- one compact quick-actions row

Keep statistics secondary. Avoid four large metric cards when the numbers do not lead to an action.

### Posts

- Keep search, sort, row count, and the post table as the primary surface.
- Keep `New Post` as the sole primary button.
- Move Import JSON, Export JSON, and Refresh Firestore into a `Maintenance` overflow menu.
- Remove Topics, Links, Media, and Calendar from the page header because the shared sidebar owns navigation.
- Hide the bulk-action panel until one or more rows are selected; show a compact selection action bar instead.
- Keep status, update date, publish date, edit, preview/view, and destructive actions visible according to row state.

### Calendar

- Use the month grid and day rail already implemented as the main canvas.
- Let the shared shell replace Calendar’s local Admin/Posts/Blog links and New Post button.
- Keep filtering, post lookup, social composition, and upcoming queue in the feature.
- Add connection-health and retry states only when real provider connectors exist.

### Post Editor

- Keep writing as the dominant central surface.
- Group metadata, SEO, schedule, and social distribution into a consistent inspector or section navigation.
- Use one sticky save/publish command area with explicit state.
- Move backup/import utilities into an overflow menu.
- Preserve Editor.js and current persistence behavior; refactor composition before splitting data flow.

### Homepage, Topics, And Recommended Links

- Use the same page header, save-state treatment, form spacing, and list/detail layout.
- Remove return-navigation links now handled by the shell.
- Keep domain-specific controls within each feature; do not merge these managers into a generic CRUD builder.

### Media Library

- Preserve its specialized organizer layout.
- Adopt the shared shell and top bar, but do not wrap the media grid, inspector, or toolbar in additional cards.
- Reuse shared badges/buttons only where the behavior and density match.

### Users And Comments

- Keep role restrictions in route data and backend enforcement.
- Adopt the shared shell and page header.
- Standardize search/filter/empty/error/loading states.
- Keep sensitive or destructive operations visually separate from routine actions.

## Phased Implementation

### Phase 0: Inventory And Baselines

- Record every admin route, route role, page-local navigation block, header action, shared state pattern, and responsive breakpoint.
- Capture desktop, tablet, and phone screenshots for the current Overview, Posts, Calendar, Editor, Media, Comments, and Users pages.
- Add route/role tests before moving navigation ownership.
- Define a short removal ledger: candidate, references found, replacement, migration risk, and decision.

Exit criteria:

- no unknown routes or role assumptions
- current behavior is covered well enough to refactor safely
- unused-code candidates are evidence-backed, not inferred from appearance

### Phase 1: Shell And Navigation

- Introduce the typed navigation config with labels, icons, route, exact/prefix matching, group, and required roles.
- Build the desktop sidebar, mobile drawer, top bar, breadcrumbs, environment/user footer, and primary New Post action.
- Hide the public site header on admin routes.
- Remove page-local Admin/Home/Blog navigation one page at a time after the shell is active.
- Preserve every existing route and guard.

Exit criteria:

- all current admin destinations are reachable in two interactions or fewer
- active-route and keyboard focus states are clear
- role-restricted destinations never flash for unauthorized users
- no page has duplicate global navigation

### Phase 2: Publishing Flow

- Simplify Posts header and progressive bulk actions.
- Fit Calendar into the shared shell.
- Standardize post status, schedule, empty, loading, and error treatments.
- Align Post Editor commands and schedule/social distribution areas with the same information hierarchy.

Exit criteria:

- `New Post`, find/edit a post, schedule it, review it on Calendar, and attach social copy form one coherent workflow
- maintenance actions no longer compete with publishing actions
- no publishing behavior or Firestore contract changes unintentionally

### Phase 3: Site Content, Assets, And Operations

- Migrate Homepage, Topics, Links, Media, Comments, and Users to the shell.
- Normalize page headers and list/detail layouts without flattening specialized tools.
- Add overview operational modules from real repository data only.

Exit criteria:

- every admin page uses the same global navigation and page hierarchy
- the overview surfaces real work rather than duplicating the sidebar
- Media and Editor retain the density their tasks require

### Phase 4: Component And State Cleanup

- Extract shared primitives only after the migrated pages prove the repeated contracts.
- Split large components along stable responsibilities: page composition, pure view-model utilities, form/editor sections, and persistence orchestration.
- Centralize route construction, date/status formatting, and role-aware navigation.
- Remove obsolete page-local nav templates, repeated workflow card definitions, dead styles, and unused imports after reference and archive review.

Exit criteria:

- shared components have multiple real consumers
- no large rewrite of repository or Editor.js behavior
- deleted code is covered by the removal ledger and has no active route/reference

### Phase 5: Accessibility, Responsive, And Performance Pass

- Verify keyboard navigation, focus management, mobile drawer behavior, visible labels, and active-route announcements.
- Test 1440px desktop, 1024px compact desktop/tablet, and 390px phone layouts.
- Inspect console errors and lazy-loaded chunk boundaries.
- Keep admin-only code lazy and avoid adding shell dependencies to public bundles.

Exit criteria:

- no clipped primary controls or accidental nested interactive elements
- tables, Calendar, Editor, and Media have deliberate small-screen behavior
- no new console errors or material public bundle regression

## Bloat Removal Rules

Remove or consolidate only when one of these is true:

- a page-local navigation block is fully replaced by the shared shell
- a workflow card only duplicates a sidebar destination and exposes no state
- a utility action is duplicated and can move to one overflow menu
- a class helper or component has at least two implementations with the same semantics
- `rg`, route inspection, tests, and archive review show a component or style is no longer referenced

Do not remove:

- guarded routes without redirects
- legacy or experimental systems outside the admin scope
- Firebase configuration or backend authorization checks
- import/export and recovery tools merely because they move out of the primary toolbar
- specialized Media or Editor structures in favor of generic dashboard cards

## Acceptance Checklist

- Existing admin URLs and deep links still work.
- Route guards and Firestore/Functions authorization remain aligned.
- The public site header is absent from admin pages and available public destinations remain easy to reach.
- Global navigation has no more than five labeled groups and one primary action.
- Page headers have one primary action; secondary/maintenance actions use a compact group or overflow menu.
- Overview content is operational and does not duplicate the sidebar as a card grid.
- Posts, Calendar, Editor, and Media preserve task-appropriate density.
- Desktop, tablet, phone, keyboard, focus, and console checks pass.
- `npm run build` and focused tests pass on each phase.
- `npm run lint` introduces no new violations; existing repository-wide legacy lint debt is tracked separately rather than mixed into this refactor.
- Architecture docs, component inventory, migration notes, and changelog are updated as each phase lands.

## Recommended Delivery Slices

Implement this as small reviewable changes rather than one branch-wide redesign:

1. navigation config + role tests
2. shell/sidebar/topbar + public-header boundary
3. Overview migration
4. Posts + Calendar migration
5. Editor migration
6. Homepage + Topics + Links migration
7. Comments + Users migration
8. Media migration
9. shared primitive consolidation and evidence-backed deletion
10. responsive/accessibility/performance validation

The first implementation slice stopped after the shell, navigation, and Overview. That stable frame is now available for the later page migrations without mixing the riskiest publishing-editor changes into the same review.
