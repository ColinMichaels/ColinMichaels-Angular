# Public Blog Shell

## Purpose

The public shell treats the blog as the primary content destination while keeping the portfolio homepage available at `/`. It removes repeated text navigation and gives search, reading preferences, and account utilities clear ownership.

## Header Contract

`SiteHeaderComponent` renders three responsive regions:

- the Colin Michaels logo, which always routes to `/`
- a rounded `Search` field that opens and filters the existing live-results drawer
- compact utilities: an optional post-list shortcut and one site/account menu

The utility menu owns links to All Posts and OS, the light/dark theme action, and the role-aware account/admin controls supplied by `SiteAuthControlsComponent`. On narrow screens the post-list shortcut is hidden because the same destination remains available inside the menu.

## Search Flow

The header field is the single search input for the live-results experience. `SiteSearchDrawerComponent` is mounted inside that positioned header control so the result panel opens directly beneath it and matches its width and center from the `sm` breakpoint upward. On narrower screens it remains directly below the header but clamps to 12px viewport gutters to prevent overflow. Activating or typing in the header field opens the panel, which:

- streams recent content before a query is entered
- filters quick results directly from the header query without rendering a duplicate field
- links to the full `/search` page with the current query
- preserves Escape, backdrop, and close-button dismissal

The Blog index no longer renders a duplicate Search action because the global launcher remains visible in the sticky header.

## Labs Pause

Labs code is preserved under `src/app/labs`, but its public entry points are intentionally paused:

- `/labs` redirects to `/blog`
- the header, homepage Labs promotion, blog footer, and static search items omit Labs
- existing experimental components are not deleted or moved
- `/background` remains available as an existing standalone route

Re-enabling Labs should restore the route component and selected discovery links only after the section redesign is ready.

## Reader Tools

Reader Tools remains available on public reading routes. Its current-status readout uses a prominent fixed-height treatment, and the panel reserves stable width and help-text height so hover/focus descriptions cannot shift controls under the pointer.

## Validation

Relevant regression coverage includes:

- `site-header.component.spec.ts` for logo/search/menu ownership and the single-input search contract
- `app.routes.spec.ts` for the temporary Labs redirect
- `reader-tools.component.spec.ts` for stable panel dimensions
- browser checks for live result filtering, menu theme changes, desktop/mobile layout, and the `/labs` redirect
