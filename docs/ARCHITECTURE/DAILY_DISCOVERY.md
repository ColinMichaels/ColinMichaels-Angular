# Daily Discovery

## Purpose

Daily Discovery gives the homepage a small piece of useful, changing content every day. A visitor can answer up to ten questions by finding details in existing published posts. The feature is deliberately attached to the homepage hero and reuses the one site-wide header search instead of introducing a second search field.

The interaction remains guest-accessible. Signing in adds durable benefits—five reader points per solved question, up to 50 daily points, and a consecutive-day streak—without putting the question or answer flow behind an account gate. Question generation uses no AI provider, API key, or scheduled job.

## Component Inventory

- `DailyDiscoveryRailComponent` owns the collapsed prompt rail, inline answer panel, completion feedback, and responsive presentation. The rail starts directly with the challenge; it does not repeat the site name or a separate Today/date block.
- `DailyDiscoveryService` calls the public challenge and answer-check Functions. It never receives accepted answers.
- `DailyDiscoveryStateService` retains up to 140 successful guest completions in device-local storage. It stores only challenge identifiers and completion timestamps.
- `SiteSearchOverlayService.openAndFocus()` lets the rail open and focus the existing `SiteHeaderComponent` search input.
- `HomeArticleHeroComponent` composes the rail directly after the hero content so the daily prompt remains part of the first homepage surface. Its featured-post artwork stays top-anchored in compact desktop crops and returns to the source 16:9 ratio at tablet and mobile widths so embedded image labels remain readable.
- `UserProfileComponent` projects Daily Discovery point totals and the current streak alongside the existing reader-point summary.
- `functions/src/daily-discovery.ts` owns the reviewed fallback catalog, Eastern-time date selection, exact normalized answer matching, sequential selection, and pure streak rules.
- `functions/src/daily-discovery-generation.ts` creates deterministic title-gap questions from published post metadata and validates stored daily sets.
- `getDailyDiscoveryChallenge` and `submitDailyDiscoveryAnswer` are the public callable boundary for prompt delivery and answer validation.

## Interaction Contract

1. The homepage requests the next unfinished challenge for the current `America/New_York` calendar date and supplies device-local completed ids for a guest.
2. The Function reads `dailyDiscoveryQuestionSets/{YYYY-MM-DD}`. If no valid set exists, that first request deterministically creates up to ten title-gap questions from published, publicly discoverable posts and stores the result in a transaction. Later visitors receive the same set.
3. The public response contains the challenge id, date, question, point value, question number, total count, and completion summary. It does not expose the source post or accepted answers.
4. **Search the blog** expands the answer rail and calls `openAndFocus()` on the shared search overlay. The header input remains the only `type="search"` field on the page.
5. A visitor submits an answer from the rail's ordinary text field. The Function rejects expired challenge/date pairs and evaluates the missing title word through normalized exact matching on the server.
6. A correct answer reveals the source post and explanation. **Next question** requests the next unfinished interaction without closing the rail. A guest completion is remembered on that device; a signed-in completion also creates one deterministic point event for that user, Eastern date, and challenge.
7. A repeated correct signed-in submission returns the existing total and progress without awarding points again. After the final question, the rail reports the daily set complete.

The answer panel opens above the rail on wider screens and joins document flow on narrow screens. It is not a modal, popup, or page-blocking membership prompt. Keyboard focus is moved only when the visitor opens the answer field or explicitly requests the shared site search.

## Generation and Fallback

Daily generation is intentionally rule-based. It requires no OpenAI credits or other third-party inference service:

- published non-Cat-Corner posts are deterministically shuffled by Eastern date;
- one eligible post is used per question, up to ten posts;
- one informative word of at least four characters is removed from each canonical title;
- stop words and numeric-only candidates are excluded;
- the removed word is the server-private accepted answer;
- question ids and ordering remain stable for the entire date.

Generation occurs only when the first request for an Eastern date finds no valid stored set. A Firestore transaction prevents concurrent first visitors from producing competing sets. This is an on-demand daily materialization boundary, not per-answer generation.

`dailyDiscoveryQuestionSets` is backend-only because each document contains accepted answers. If fewer than five eligible posts are available, the post query fails, or the stored set is invalid, the Function fails softly to the reviewed seven-question catalog in `functions/src/daily-discovery.ts` and attempts to materialize that fallback for a stable remainder of the day. A CMS review queue remains deferred until usage shows that title-gap questions need editorial curation.

## Points and Streak Data

Signed-in completion updates trusted server-owned data only:

- `userPointEvents/{daily_discovery_uid_YYYY-MM-DD_challengeId}` records one five-point `daily_discovery` event with its challenge id/date and source slug.
- `users/{uid}.points.dailyDiscoveries` stores the cumulative Daily Discovery points awarded.
- `users/{uid}.dailyDiscovery` stores `currentStreak`, `longestStreak`, `totalCompleted`, `lastCompletedDate`, and the current date's `completedChallengeIds`.

The deterministic point-event id makes each question award idempotent across retries and devices while allowing up to ten awards per day. The first completion on a new Eastern date advances or resets the streak; additional questions on the same date increase completion and point totals without increasing the daily streak more than once. Direct client writes to points and streak state remain disallowed by the existing user-account Rules boundary.

## Migration and Deployment

No Firestore backfill or index is required. Existing accounts default a missing `completedChallengeIds` field to an empty list, while missing `points.dailyDiscoveries` and `dailyDiscovery` values retain their zero-state projections. A same-day completion from the original one-question release is treated as question one during rollout, preserving nine remaining awards and the 50-point daily ceiling. `dailyDiscoveryQuestionSets/{YYYY-MM-DD}` is created automatically on the first request of each date and cannot be read or written directly by public, editor, or admin clients.

Deploy in this order:

1. Firestore Rules, adding `dailyDiscoveryQuestionSets` to the backend-only collection boundary while preserving backend ownership of point events and account reward fields.
2. Firebase Functions, so the on-demand generator, sequential challenge selection, and per-question reward boundary are available.
3. Hosting, after the Angular build and focused browser checks pass against the deployed or local Function boundary.

Do not deploy Hosting first: the rail fails softly when its callable is unavailable, but that would ship an intentionally incomplete homepage experience.

## Local End-to-End Testing

The full flow can be exercised without production credentials or data. Use three terminals from the repository root:

1. Run `npm run serve:daily-discovery:local` to build the Functions package and start the Auth, Functions, and Firestore emulators.
2. After the emulators report ready, run `npm run seed:daily-discovery:local` once. The guarded seed command refuses non-loopback Auth or Firestore hosts, writes 12 clearly local published posts, creates the emulator-only reader `daily-discovery@example.test` with password `daily-discovery-local-only`, and removes only the current local question-set document so the first homepage request exercises generation.
3. Run `npm start` to serve Angular with `environment.local.ts`. Do not use `npm run start:live`, which intentionally calls the deployed backend.

Open `http://localhost:4200/`, expand Daily Discovery, solve the missing title word, and use **Next question** to verify sequential progress. Sign in with the emulator-only reader to verify points and streak behavior without sending credentials to production. Emulator data is temporary unless an export is explicitly configured, so rerun the seed command after restarting the emulator suite.

Guest progress intentionally survives a page reload. To restart the browser-side flow at question one during local QA, run `localStorage.removeItem('cm.daily-discovery.v1'); location.reload();` in the localhost tab's browser console. This removes only the Daily Discovery guest-test state for that browser origin; rerunning the seed command separately rebuilds the server-side daily set.

## Rollback

Hosting can roll back the multi-question rail independently because the new account field, private set documents, and per-challenge point events are additive. If the Functions are rolled back to the one-question implementation, roll Hosting back at the same time because the response contract changed. Existing `daily_discovery` point events, account progress, and `dailyDiscoveryQuestionSets` documents should remain as historical data; no destructive cleanup is required.

## Validation

- Functions compilation and pure generation, storage parsing, catalog, date, answer, sequential-selection, and streak tests.
- Angular rail, device-state, header-focus, homepage-composition, and Profile projection tests.
- Repository lint and production build.
- Desktop and narrow browser verification for collapsed, progress, search-open, answer, incorrect, correct, next-question, and final-completion states.
- A production smoke test after deployment confirming first-request set creation, ten prompts, existing header search focus, source links, anonymous progression, authenticated per-question award idempotency, the 50-point daily ceiling, and next-day rollover.
