# Public Publishing Schedule And Early Reader Access

## Purpose And Local Scope

The public `/schedule` surface lets visitors see upcoming holiday context and deliberately announced article releases. It keeps a planned date separate from an available article: a scheduled post remains locked until the backend actually changes it to `published` and its release time is due, or a separately authorized early reader reaches the configured early-access window.

This addition is developed locally on `codex/seasonal-publishing-schedule`. The earlier seasonal/Halloween worktrees and their assets remain preserved. No content scheduling, publication, role grant, commit, push, PR, deployment, or public-release proof is implied by the local implementation.

The [protected publishing calendar](./PUBLISHING_CALENDAR.md) remains the editorial timing/composition system and its five-minute scheduler remains the publication authority. The [seasonal engine](./SEASONAL_CAMPAIGNS.md) continues to own bundled presentation editions and independent device-local collections. The new schedule presents their public date/art context alongside a sanitized article-release projection; it does not replace either system.

## Three Distinct Date Contracts

| Date/context | Meaning |
| --- | --- |
| Holiday observance | The actual cultural, religious, civil, or astronomical date, including community and sundown/nightfall context where applicable. |
| Seasonal display window | An inclusive editorial site window from the seasonal catalog; it is neither an article publication appointment nor proof that a theme will activate automatically. |
| Article release / early-access time | CMS-controlled `publishedAt` and optional `readerRelease.earlyAccessAt`. Server state/time/authorization determine reading availability. |

`UpcomingHolidayScheduleComponent` in `features/seasonal/components` presents titled/art-backed date cards from the 42-edition catalog. It starts with seven current/upcoming teaser rows, selected from windows that have not ended or still need date review using the New York presentation date, and offers search/the full 42-edition set. Cards have no links: they are planned/upcoming context without invented article launch dates, article URLs, or edition launch actions. Date-review templates retain their review context instead of receiving guessed dates. Existing playable archive presentations and bundled illustration assets remain public presentation; CMS member access governs private article bodies rather than retroactively hiding that artwork. The archive header provides a separate schedule entry point. Opening an already bundled archive page is a public visual preview, not an early-reader article grant.

A holiday date alone never opens an article, changes CMS status, grants a role, authorizes calendar activation, or publishes a seasonal edition. Existing calendar and archive publishing approvals remain separate controls. The subsequent seasonal correction defaults main-site presentation to approved calendar windows or explicit owner activation, with no public season picker; all 42 calendar approvals remain false. The schedule/article role-release contracts and existing public archive previews stay unchanged. See the seasonal architecture correction record for its separate QA.

## Article Announcement And Access Contract

`BlogPost.readerRelease` / `BlogReaderRelease` adds the optional exact shape `{announceInSchedule: boolean, earlyAccessAt: string | null}`. Unknown fields and malformed timestamps are rejected; a non-null early time must be timezone-qualified ISO and strictly precede publication. Editor/repository normalization canonicalizes valid times to ISO. Absent legacy metadata stays absent, without automatic announcement or a default early time. These are deliberate schedule announcement and early-access settings. `announceInSchedule: true` opts an otherwise eligible scheduled/published post into the public release projection. Missing/disabled announcement settings do not advertise drafts by default. `earlyAccessAt` opens an early-reader window only when the server validates it and the caller has the separately granted `earlyReader` role.

`getPublicPublishingSchedule({})` selects `readerRelease.announceInSchedule == true` through one bounded field-selected query and derives display/access information on the server. Its return value is `{serverNow, entries}`; entries include only opted-in scheduled/published articles with valid metadata, a public author profile or valid legacy embedded byline, and no hidden non-discovery Cat Corner post. It requests at most 201 candidate records; more than 200 fails closed with `resource-exhausted` rather than quietly presenting an incomplete schedule. The frontend displays that failure explicitly instead of calling an unavailable result an empty schedule.

| Reader/post state | Reading result |
| --- | --- |
| Anonymous or ordinary member; draft or archived article | No private article body. These states are not announced as scheduled/public reading. |
| Anonymous or ordinary member; scheduled article before/after its planned release time | Locked until actual publication. A clock passing does not convert a scheduled document into public content. |
| Actually published, announced article with a due valid release time | Anonymous/public access is allowed. The schedule links to `/blog/:slug`; an authorized reader response with `access: public` redirects there rather than mounting an early article. |
| Separately granted early reader; eligible scheduled article before `earlyAccessAt` | Locked. Membership alone does not bypass the time window. |
| Separately granted early reader or existing CMS-role reader; eligible announced scheduled article with `earlyAccessAt <= serverNow < publishedAt` | `/schedule/read/:slug` can request the body from the authorized server reader. After the planned release time, a still-scheduled article remains locked until actual publication. |
| Missing, revoked, disabled, or no longer eligible identity | No scheduled/private body; authorization failures remain explicit. Already public due articles remain public. |

`earlyReader`, labelled **Early Reader**, is an additive, non-administrative role granted through existing Admin Users controls. It adds no Admin Console access. Existing `admin`, `cmsAdmin`, and `contentEditor` roles retain their editorial early-reader qualification in this endpoint; their ordinary protected editor/preview access remains separate. Creating an account, earning points, joining the reader campaign, finding a seasonal collectible, or opting into alerts does not grant it. No account/role mutation is performed by loading the schedule or trying to read a locked article.

For optional authenticated summary/body callers, `resolveCurrentReaderPermission` loads the current Firebase Admin Auth record, checks disabled state and token `auth_time` against `tokensValidAfterTime`, and uses current flat/nested claims. Anonymous callers can receive only announced, actually published/due bodies; scheduled early bodies require a current qualifying role. Auth lookup errors, removed roles, disabled/deleted users, and revoked sign-ins yield no early privileges. The endpoint rechecks every request rather than trusting a stale browser role display. Revoking Early Reader through the existing role mutation path removes both flat and nested mirrors while preserving unrelated claims. UI labels and link availability are helpful presentation, not the authorization boundary.

## Summary, Body, And Cache Separation

The public summary allowlist is exactly `id`, `slug`, `title`, `excerpt`, `coverImage`, `publishedAt`, `earlyAccessAt`, `status`, and server-derived `access` (`public`, `early`, or `locked`), alongside response `serverNow`. The query uses Firestore `select()` to avoid reading body/search fields; the client parser also reconstructs only the allowlisted metadata and rejects more than 200 entries or inconsistent status/access pairs. This is an explicit display-safe projection. It excludes Editor.js/body blocks, body-derived search text, private media/body metadata, social-promotion drafts, preview tokens, credentials, and arbitrary post fields. Public announcement copy itself is intentionally public; editors should use it as a teaser rather than paste private campaign notes into it. The projection must never spread the full source post into its response.

`getScheduledPostForReader({slug})` uses a separate request/response boundary for `/schedule/read/:slug`, returning `{serverNow, access, post}` only for an eligible uniquely resolved slug. Unknown/ambiguous, hidden, unannounced, and nonpublic-author records are unavailable. `sanitizeReaderBlogPost` allowlists article/byline/SEO/disclosure/block fields and excludes preview tokens, `socialPromotion`, `searchBodyText`, release settings, and private draft extras. Both callable response paths set `Cache-Control: private, no-store`. It must not merge early bodies into `BlogRepositoryService`'s shared public post collection, public search/discovery, or a browser-persistent cache. The component-scoped `PublishingScheduleService` keeps the current authorized body only in memory for the active reader view. Auth transitions/sign-out clear it immediately; route teardown clears it; monotonically tracked request generations reject late or competing responses. Manual checks, visibility restoration, and a visible-page 60-second refresh revalidate server access and clear the old body while waiting. Role revocation is enforced on each fresh server request, rather than claimed as an instantaneous push into an already open tab.

`ngsw-config.json` excludes `/schedule/read/**` from service-worker navigation caching/fallback (`!/schedule/read/**`); callable APIs are outside its existing data-group caches. The reader body remains request-scoped and is never written to service-worker, local/session storage, IndexedDB, or the shared public repository.

The schedule route's public summaries may be visible to all readers. That does not make an early article available to crawlers, feed consumers, other clients, or people who copy its slug. Direct URL/refresh/new body requests are authorized on the server. The frontend uses only server access values: locked entries have no href, public/published entries link to `/blog/:slug`, and early/scheduled entries link to `/schedule/read/:slug`; changing the browser clock cannot unlock them. The early renderer uses read-only `BlogBlockRendererComponent` with preview mode, retains `status: scheduled`, and exposes no public offline-save or engagement controls.

## Legacy Boundary And New Writes

New future-dated `published` writes are rejected; editors must use `scheduled` for a future release. The existing trusted publication scheduler promotes due scheduled posts to published. Scheduled documents remain denied by public Firestore rules; the new protected reader does not relax those rules or make direct scheduled-post reads public.

Existing Firestore public reads use the legacy `status == 'published'` rule. Historically published documents and previously public media assets are not retrospectively embargoed by this batch. A broad legacy timestamp/content/media migration is neither authorized nor required for the new scheduled-release feature. Do not describe the new schedule as erasing access to material that was already public.

The stricter state/due/early-role contract applies to the new schedule reader and new trusted writes. Existing public article/CMS workflows, preview-token behavior, push subscriptions, social-delivery outbox, reader points, and Core OS remain separate.

## Component And Service Inventory

| Resource/boundary | Responsibility |
| --- | --- |
| `PublishingScheduleComponent` | Lazy `/schedule` page: announced article rows, no-link Soon labels, public/early links, and explicit loading/empty/error states. |
| `UpcomingHolidayScheduleComponent` | `features/seasonal/components` teaser rows: seven initially, search/full 42, title/art/editorial display-window context, and no links. |
| `ScheduledReaderComponent` | Lazy `/schedule/read/:slug`: denied/retry state, read-only early rendering, and redirect to canonical `/blog/:slug` for public responses. |
| `publishing-schedule.models.ts` | `PublishingScheduleEntry`, `PublishingScheduleResponse`, `ScheduledReaderResponse`, `parsePublishingSchedule`, `parseScheduledReader`, and server-access-only `publishingScheduleReadPath`. |
| `PublishingScheduleApiService` | Exact `getPublicPublishingSchedule` / `getScheduledPostForReader` callable adapter. |
| `PublishingScheduleService` | Component-scoped memory, auth transitions, current-request generation guards, visible-minute revalidation, and teardown; no public repository or offline storage. |
| `publishing-schedule.routes.ts` / `pages/publishing-schedule.scss` | Lazy route metadata and responsive public reader layouts. Exact schedule/valid reader paths receive `public-schedule-frame` and public reader scope; Core OS paths stay separate. |
| `functions/src/public-publishing-schedule.ts` | `ReaderRelease`, bounded summary projection, current Auth permissions, server state/time matrix, unique reader lookup, and safe reader DTO. |
| Functions `getPublicPublishingSchedule` / `getScheduledPostForReader` | Public-callable exports with current permission lookup and `private, no-store` response headers. |
| `BlogReaderRelease` / `blog-reader-release.util.ts` | Optional canonical settings; `isBlogReaderRelease`, `normalizeBlogReaderRelease`, `getReaderReleaseDateError`; strict validation and ISO normalization. |
| CMS post editor/recovery/repository/storage | Explicit announcement/early-time controls and existing save/import/export/JSON-backup/recovery round-trip; public index summaries omit reader-release metadata. |
| Shared user role model / `functions/src/user-role-mutation.ts` | Named Early Reader grant through existing Admin Users; synchronized flat/nested revocation without granting admin access. |
| Existing scheduler/public Firestore rules | Keep actual publication authoritative and scheduled post documents inaccessible through public direct reads. |
| Functions SEO shell / `ngsw-config.json` | Generic schedule/reader shell with no article body/metadata; reader `noindex,nofollow` and `private, no-store`; `!/schedule/read/**` navigation exclusion and no callable data-group cache. |

The feature implementation is isolated under `src/app/features/publishing-schedule`. Holiday artwork/date presentation stays under the reusable seasonal feature; CMS/admin and Core OS responsibilities remain in their existing modules.

## Editor Workflow

1. Draft the article in the existing CMS editor and use `scheduled` with a valid future `publishedAt` when planning a release.
2. Explicitly enable the public schedule announcement for posts whose title/teaser/date may be shown. Keep private details out of announcement fields.
3. If early reading is intended, configure a valid earlier ISO time (the editor presents a local datetime field) and have an authorized admin separately grant **Early Reader** through Admin Users. Granting a role is not publishing the post.
4. Review `/schedule` anonymously and with the intended account: future posts remain locked to ordinary readers; eligible early readers use the protected member destination.
5. Keep the article locked after its planned time until actual publication succeeds. Verify the trusted scheduler/publish action and due time before representing the article as publicly readable.

This workflow does not add an external announcement send, email campaign, paid membership system, automatically granted role, or new scheduled job.

## Migration, Deployment, And Rollback

The optional per-post field is backward-compatible: existing saves/recovery/import/export preserve it, and the canonical scheduler preserves it across publication while leaving it out of public index summaries. No bulk post/account backfill, role grant, body migration, new private-media upload, or rewrite of old public content is performed. Existing posts without the opt-in stay outside the announced queue. Existing year-specific seasonal collection/global preference keys remain unchanged.

An authorized release requires the matched Hosting and Functions scope so the UI can use the summary/body endpoints and trusted post validation. The confirmed implementation changes no scheduled-post Firestore permissions or `firebase.json`, and adds no composite-index migration: the announcement query uses the existing single-field index. No Firebase configuration overwrite or blanket permission change is implied. Current Auth claims must be managed through the existing role mutation flow and refreshed/verified before live early-reader proof.

Rollback removes/restores the public schedule UI and matched endpoint/trusted-validation integration coherently. Retain posts, announcements, optional `readerRelease` metadata, source masters, accounts, roles, scheduled-publication machinery, and seasonal progress. Old clients can ignore the optional metadata. Never broaden public scheduled-post access, clear browser/account data, delete established routes without the repository's redirect/archive review, or reverse a role grant by guessing which accounts should lose it.

A source rollback cannot make previously public bodies/media secret; the legacy boundary remains explicit. Public deployment, real article scheduling, role grants, and authenticated production content verification require separate authorization/evidence.

## Creative Director Loop And Visual Proof

The installed Creative Director Loop guided a schedule that preserves Colin's cosmic imagery and the real site's reading hierarchy. The existing seven illustrated seasonal assets are reused; no fresh generation or fictional future article was needed.

| Stage/finding | Revision or proof |
| --- | --- |
| CREATE | Pair a real announced-post queue with a public holiday date/art calendar, retaining the site's actual header, light/dark themes, and open editorial rows. |
| CRITIQUE — Important | The legacy gray app frame and compressed calendar spacing weakened readability and the accepted seasonal composition. |
| REVISE | Apply exact `/schedule` and valid `/schedule/read/:slug` public reader/frame treatment and correct calendar spacing without changing Core OS routes. |
| CRITIQUE — Important | Holiday dates could be mistaken for article publication or unlocked future content. |
| REVISE | Name editorial celebration windows, retain unresolved-date context, use no holiday-card links, and derive article links only from server release/access decisions. |
| VERIFY | Native empty-CMS emulator review and the independently scoped fixture/server/emulator checks below establish the recorded local behavior. |

| Concept reference | Actual local schedule comparison |
| --- | --- |
| Airy horizontal rows | Open rows retain the editorial composition. |
| Landscape artwork at the left | Existing seasonal illustrations anchor the left column. |
| Central title and year | Live title/year labels remain the central hierarchy. |
| Right-hand action/date position | Date/status text replaces Explore links on locked holiday teasers. |
| Thin rules | Quiet dividers preserve scanning rhythm. |
| Site header/theme | The real site header and selected light mode are deliberately retained; reference-only branding is omitted. |
| Hunt collector | The static schedule has no hunt collector; the existing playable archive retains its own collector behavior. |

Native evidence is saved under `/Users/colin/.codex/visualizations/2026/09/30/01a0f453-6186-7321-a3aa-4b39980928c5/`: `posting-schedule-desktop.jpg`, `posting-schedule-calendar-desktop.jpg`, and `posting-schedule-mobile.jpg`.

## Final Local Validation

The suites below overlap and are reported separately rather than summed into one test total. Browser release/member cases deliberately intercept server-approved callable fixtures; they are presentation tests, not real member authentication or a live content grant. Auth-state unit tests independently verify sign-out body clearing/stale response rejection. Backend callable tests independently exercise current Auth role/disabled/revoked state and cache headers.

| Check | Actual result |
| --- | --- |
| `npm run build` | Passed after exact schedule-frame, calendar spacing, and singular/plural count polish. Initial transfer: 328.62 kB. |
| `npm run lint` | Whole-app lint passed. |
| `npm run test:service-worker-cache` | Passed: 12 critical files / 1,477.5 KiB and 135 lazy JavaScript chunks. Generated policy asserts early-reader navigation exclusion and no data-group callable caching. |
| Focused frontend Angular/Jasmine | 99/99 passed, covering release validation/round-trip, role/model and metadata parsing, API/state/auth teardown, and reader/schedule integration. |
| `e2e/publishing-schedule.spec.ts` | 16/16 passed: eight cases in desktop/mobile profiles using callable fixtures. Locked/public/early links, denied/revoked reader state, canonical redirect, retries, client-clock non-unlock, and 320-pixel light/dark layout were exercised. |
| Upcoming holiday units | 4/4 passed after New York presentation-date/window correction. |
| `e2e/holiday-schedule.spec.ts` | 6/6 passed: three desktop and three mobile checks for nonlinked holiday windows, date-review context, and the archive schedule entry point. Article responses in these checks are empty fixtures. |
| `npm --prefix functions run test:publishing-schedule` | Functions build plus 46/46 dedicated schedule/validator/role checks passed. |
| `npm --prefix functions run test:phase7` | 60/60 passed. |
| `npm --prefix functions run test:seo` | 99/99 passed, including generic schedule/reader shells and no private article metadata/body. |
| `npm run test:rules:phase7` | 9/9 emulator checks passed; scheduled Firestore documents remain closed. |
| `npm run test:functions:phase7:emulator` | 3/3 canonical publishing/migration checks passed. The scheduler preserves canonical release settings while omitting them from public summaries. |
| Native app browser / real local emulators | `/schedule` returned the successful **No announced posts yet** state against real local Auth/Functions/Firestore, with 42 nonlinked holiday entries. Hanukkah search returned two editions; Vesak returned one unresolved-date edition with singular count. The 390-pixel mobile view had no horizontal overflow. No fake posts were written. |
| Current console snapshot | Latest native preview warn/error inspection was empty. This is a local snapshot, not a retrospective claim that the prior unrelated public CMS permission/transport warnings never occurred. |

Reproducible focused holiday checks (launch environment variables can differ from the original passing sessions):

```bash
npm test -- --watch=false --browsers=ChromeHeadless \
  --include=src/app/features/seasonal/components/upcoming-holiday-schedule.component.spec.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4328 npx playwright test \
  e2e/holiday-schedule.spec.ts --project=chromium \
  --project=mobile-chromium --workers=1
```

The Node runtime and installed Chrome/Chromium follow the existing project test setup. The new schedule preview uses port 4328; the earlier seasonal/Halloween previews and worktrees remain preserved.

All commands use the supported Node 24.15.0 runtime. `npm run test:docs` passed for 108 tracked Markdown files; the same validator supplemented with untracked files passed for 112 total files, including this new architecture record. `git diff --check` passed after the documentation update. The previous seasonal QA belongs to its preserved worktree; it does not substitute for the new schedule results.

## Local Review State Before The October 1 Release

The new schedule/reader implementation and local validation are complete. Real local emulator content was empty, so the native review proves the successful empty schedule and holiday calendar, while fixture tests prove representative article link/reader presentation. Actual backend role/state/time rules are tested independently; no real article scheduling, publication, member grant, or authenticated production body verification is claimed.

The old published-status Firestore read boundary and previously public tokenized/bundled media remain as described above. This change is not a retrospective content/media embargo. The older seasonal CMS permission/connection baseline remains historical evidence; the latest schedule preview console snapshot was clean. No live CMS/account data mutation, real role grant, commit, push, PR, deployment, or public-route release has occurred. Hosting and Functions deployment plus actual due/public and granted-member production checks remain separately authorized release work.


## October 1 Release Handoff

Colin authorized commit and public deployment on October 1, 2026. The seasonal/schedule release is reviewed on `codex/publish-seasonal-experience` and deploys matched Hosting and Functions through the existing production workflow from the same tested commit. The final complete gate includes 1,418 Angular tests, 240 Functions tests, 12 isolated emulator checks, and 92 desktop/mobile seasonal/schedule browser cases, plus build, lint, content, documentation, and service-worker policy checks. The [seasonal release review](SEASONAL_CAMPAIGNS.md#october-1-release-review) records the refactor, activation scope, deployment and rollback reference. These implementation/publication changes do not opt real articles into the schedule or grant production Early Reader roles. Production member-reading proof requires an actual existing eligible article/account; fixture checks remain explicitly distinct.
