# Daily Discovery

## Purpose

Daily Discovery gives the homepage a small piece of useful, changing content every day. A visitor answers one question by finding a detail in an existing published post. The feature is deliberately attached to the homepage hero and reuses the one site-wide header search instead of introducing a second search field.

The first release is guest-accessible. Signing in adds durable benefits—five reader points, a once-per-day award, and a consecutive-day streak—without putting the question or answer flow behind an account gate.

## Component Inventory

- `DailyDiscoveryRailComponent` owns the collapsed prompt rail, inline answer panel, completion feedback, and responsive presentation.
- `DailyDiscoveryService` calls the public challenge and answer-check Functions. It never receives accepted answers.
- `DailyDiscoveryStateService` retains up to 14 successful guest completions in device-local storage. It stores only challenge identifiers and completion timestamps.
- `SiteSearchOverlayService.openAndFocus()` lets the rail open and focus the existing `SiteHeaderComponent` search input.
- `HomeArticleHeroComponent` composes the rail directly after the hero content so the daily prompt remains part of the first homepage surface. Its featured-post artwork stays top-anchored in compact desktop crops and returns to the source 16:9 ratio at tablet and mobile widths so embedded image labels remain readable.
- `UserProfileComponent` projects Daily Discovery point totals and the current streak alongside the existing reader-point summary.
- `functions/src/daily-discovery.ts` owns the code-reviewed challenge catalog, Eastern-time date selection, exact normalized answer matching, and pure streak rules.
- `getDailyDiscoveryChallenge` and `submitDailyDiscoveryAnswer` are the public callable boundary for prompt delivery and answer validation.

## Interaction Contract

1. The homepage requests the challenge selected for the current `America/New_York` calendar date.
2. The public response contains the challenge id, date, question, point value, and signed-in completion summary. It does not expose the source post or accepted answers.
3. **Search the blog** expands the answer rail and calls `openAndFocus()` on the shared search overlay. The header input remains the only `type="search"` field on the page.
4. A visitor submits an answer from the rail's ordinary text field. The Function rejects expired challenge/date pairs and evaluates a normalized exact alias on the server.
5. A correct answer reveals the source post and explanation. A guest completion is remembered on that device; a signed-in completion also creates one deterministic point event for that user and Eastern date.
6. A repeated correct signed-in submission returns the existing total and progress without awarding points again.

The answer panel opens above the rail on wider screens and joins document flow on narrow screens. It is not a modal, popup, or page-blocking membership prompt. Keyboard focus is moved only when the visitor opens the answer field or explicitly requests the shared site search.

## Challenge Catalog

The first catalog is code-owned and contains seven prompts. That keeps accepted answers out of Firestore public reads and makes editorial changes reviewable with the Function tests. Selection advances once per Eastern calendar day and wraps deterministically through the catalog.

Each entry requires:

- a stable challenge id;
- a question whose answer appears in one published post;
- the canonical source slug and title;
- a short allowlist of equivalent answers;
- a concise explanation shown only after a correct answer.

Before adding or changing a prompt, confirm the source remains published and searchable, keep the answer unambiguous, and update `functions/test/daily-discovery.test.cjs` when rotation assumptions change. A CMS queue, draft review, and scheduled challenge editor are deferred until the interaction proves useful enough to justify an operator workflow.

## Points and Streak Data

Signed-in completion updates trusted server-owned data only:

- `userPointEvents/{daily_discovery_uid_YYYY-MM-DD}` records the five-point `daily_discovery` event, challenge id/date, and source slug.
- `users/{uid}.points.dailyDiscoveries` stores the cumulative Daily Discovery points awarded.
- `users/{uid}.dailyDiscovery` stores `currentStreak`, `longestStreak`, `totalCompleted`, and `lastCompletedDate`.

The deterministic point-event id makes the award idempotent across retries and devices. The Function calculates a streak by comparing the last completed date with the previous Eastern calendar date. Direct client writes to points and streak state remain disallowed by the existing user-account Rules boundary.

## Migration and Deployment

No Firestore backfill or index is required. Existing accounts default missing `points.dailyDiscoveries` and `dailyDiscovery` values to zero-state projections. Direct legacy user creation may omit `dailyDiscoveries`; updated Rules accept either the old zero-point map or the new zero-valued field.

Deploy in this order:

1. Firestore Rules, preserving backend ownership of point events and account reward fields.
2. Firebase Functions, so both Daily Discovery callables and the server-only catalog are available.
3. Hosting, after the Angular build and focused browser checks pass against the deployed or local Function boundary.

Do not deploy Hosting first: the rail fails softly when its callable is unavailable, but that would ship an intentionally incomplete homepage experience.

## Rollback

Hosting can roll back the rail independently because the new account fields and point-event type are additive. If the Functions must be rolled back, remove the rail from Hosting at the same time so visitors do not receive the unavailable prompt state. Existing `daily_discovery` point events and account progress should remain as historical data; no cleanup is required for rollback.

## Validation

- Functions compilation and pure catalog/date/answer/streak tests.
- Angular rail, device-state, header-focus, homepage-composition, and Profile projection tests.
- Repository lint and production build.
- Desktop and narrow browser verification for collapsed, search-open, answer, incorrect, and correct states.
- A production smoke test after deployment confirming the prompt, existing header search focus, source link, anonymous completion, authenticated award idempotency, and next-day rollover.
