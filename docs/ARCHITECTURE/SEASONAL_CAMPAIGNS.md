# Seasonal Campaigns

## Purpose And Local State

The seasonal feature turns the Scary Christmas presentation into a reusable, reversible presentation with 42 year-specific hunt/reflection editions and a searchable archive. The seasonal release `d62300a` is published from `codex/publish-seasonal-experience`. The presentation cleanup is prepared locally on `codex/seasonal-cta-cleanup` in the preserved publishing-schedule worktree. The earlier `codex/seasonal-holidays` and `codex/scary-christmas` checkouts/source remain preserved. No additional commit, push, PR, calendar activation, or deployment is implied by the local cleanup.

The current default `SEASONAL_CONFIG` is `enabled: true`, `mode: 'calendar'`, `manualEditionId: 'scary-christmas-2026'`, and `timeZone: 'America/New_York'`. Scary Christmas 2026 is calendar-approved for October 1–November 1; the other 41 entries retain `approvedForCalendar: false`. The owner can explicitly activate a known manual edition or approve a ready calendar window; visitors cannot choose a main-site season. The existing light/dark site preference remains separate.

See [the preparation and operation guide](../README/SEASONAL_CAMPAIGNS.md) for dates, media readiness, activation, retirement, and next-year cloning. [Scary Christmas](./SCARY_CHRISTMAS.md) preserves the original edition's concept, assets, compatibility, and historical validation record.

## Architecture And Component Inventory

The generic feature belongs under `src/app/features/seasonal`. It replaces the app shell's Halloween-specific binding while retaining the original `features/scary-christmas` source. Existing routes, public writing, CMS records, account workflows, and reusable Core OS infrastructure remain authoritative.

| Resource | Responsibility |
| --- | --- |
| `seasonal.models.ts` | Typed edition, collectible, theme, placement, configuration, and global visitor preference contracts. |
| `seasonal.catalog.ts` | Seven original illustrated editions plus 35 planning-registry templates; year-specific identity, dates, copy, art, music, item count, and archive context. Recurring templates reuse matching illustrated media/items with independent year-specific storage. |
| `seasonal.plans.ts` / `SeasonalPlan` | Extensible planning registry: source-backed 2027 observances, editorial display windows, quiet/reflection treatment, date-review status, and neutral template copy. It owns no activation or publishing approval. |
| `seasonal.config.ts` | Manual/calendar/off selection, inclusive local-date eligibility, archive ID lookup, supported public route shapes, priority resolution, and per-edition storage keys. |
| `SeasonalService` | One owner/date-selected edition/context, independent collections, registered-account opt-out, auth-state gating, lantern state, bounded persistence/storage synchronization, and minute/visibility date re-evaluation without a route change. |
| `SeasonalBannerComponent` | Holiday artwork and hunt/reflection invitation on explicit archive edition pages only, with external Dreadnauts listening. |
| `MainComponent` seasonal slot | Deferred collectible just after the normal homepage hero; retains the original `banner` placement identity and existing collection ID. |
| `SeasonalCollectiblesComponent` | Named touch/keyboard targets at public hunt placements; archive detail owns its anchored collection locations. |
| `SeasonalLanternComponent` | Shared dynamic item total, slots, clues, confirmed reset, opt-out/restoration, and an external Dreadnauts listening link. **Holiday options** serves a signed-in registered account in an active-edition or opt-out restoration context; there is no season selector or idle Theme control on the neutral archive index. |
| `SeasonalArchiveComponent` | Neutral editorial catalog at `/archive/seasons`, with deliberate edition entry points, a Find a celebration filter over label/year/title, and a visible result count. |
| `SeasonalEditionComponent` | Explicit `/archive/seasons/:id` edition, observance/source context, reflection or all collectible anchors on one page. |
| `functions/src/seasonal-archive-identity.ts` | Crawler-facing identity projection, exact known archive paths, independent publishing approval, and sitemap eligibility. |
| `src/styles/_seasonal.scss` | Scoped edition token/decoration variants and responsive, focus, contrast, and reduced-motion treatments. |
| `src/assets/seasonal/<edition-id>/` | Delivered edition media derivatives; shared leaf/star cutouts and the existing collector avoid duplicating equivalent art. |

The shell defers seasonal components and uses one feature state source. Archive routes are lazy loaded. Index images should load lazily and a detail page should fetch its selected artwork rather than preload the entire catalog. The seasonal components load no audio; listening opens the external Dreadnauts music page.

The main-site boundary covers home, public blog/index/article/taxonomy, topic hubs, and authors. Private blog previews, admin, auth, Profile, privacy, contact/forms, Core OS, and truly unknown route shapes remain excluded. The reading-route predicate recognizes URL shapes; it does not prove that a valid-shaped CMS article/topic/author exists. Existing missing-record presentation remains the page repository's responsibility.

## Public Schedule Integration

The follow-up [public publishing schedule](./PUBLIC_PUBLISHING_SCHEDULE.md) reuses the 42-edition title/art/date context in upcoming holiday cards. These are planned public teasers; seasonal display windows are not CMS article publication times, and future schedule cards do not unlock article bodies or invent edition launch links. Existing bundled archive experiences/artwork remain public presentation. CMS article early access is enforced by the separate server reader and granted role/window. This schedule addition is isolated on `codex/seasonal-publishing-schedule`; the QA recorded below remains the prior seasonal implementation record.

## Selection And Archive Contract

Eligible main-site routes use only owner configuration and approved calendar dates. `mode: 'calendar'` selects explicitly approved entries with valid ordered dates, without `dateStatus: 'needs-review'`, inside their inclusive `America/New_York` display window. Missing/review dates remain ineligible even if mistakenly approved. Higher priority wins an overlap; lexical ID is the stable tie breaker. Priorities describe editorial rotation rather than ranking traditions.

The owner can choose `mode: 'manual'` with a known `manualEditionId` for explicit activation; an unknown ID yields no edition. `mode: 'off'` or `enabled: false` removes campaigns from normal reading routes. All entries remain unapproved in this local batch. A minute refresh and return-to-visible check re-evaluate calendar dates without requiring navigation. These local checks choose presentation; they do not schedule a release or CMS publication.

Visitor `preferredEditionId`, `selectableEditions`, and `setPreferredEdition` APIs and the Season selector are removed. Signed-in registered accounts may opt out of the active presentation and restore it without losing progress; anonymous visitors follow the owner-selected presentation and have no design preference control; restoration cannot bypass owner approval, date eligibility, or master-off. **Holiday options** appears only for a registered signed-in account in an active edition/restoration context. The neutral archive index has no idle season-picker control.

Known `/archive/seasons/:id` URLs deliberately open their own public archived edition before the normal-site master gate. Browsing an archive card/URL is an explicit visit to that edition, not a visitor override of the main site. The neutral index stays neutral. Unknown, malformed, or unregistered IDs yield a safe missing state and never substitute Halloween or another season.

Every hunt detail page contains all of its own items/clue anchors, so a prior edition remains independently completable. Global/legacy edition opt-out is respected only while signed into a registered account, and progress stays respected for all visitors; restoration retains progress. Reflection editions have no collection to complete. Archive detail pages retain their public presentation and ordinary archive navigation without a selector.

## Crawler Identity And Publishing Boundary

The Functions projection supplies the archive index and exact registered edition pages with readable fallback content, canonical URLs, and a single page heading. Unknown IDs, malformed paths, and extra segments remain real HTTP 404 responses. The server tests compare the projection's identity/copy against the frontend catalog to catch drift.

`publishApproved` in the Functions projection is separate from `approvedForCalendar` in the app catalog. Prepared index/edition pages currently remain `noindex,follow` and outside the sitemap; approval to rotate a main-site theme does not authorize crawler indexing. Angular archive metadata also uses `noindex,follow` during preparation. A future authorized release must align these controls and deploy the tested Hosting/Functions scope together, then verify literal public URLs. Local fallback tests do not prove public deployment.

## Editions And Cultural Boundaries

Prepared editions cover Halloween 2026, Thanksgiving 2026, Hanukkah 2026, Northern Hemisphere winter solstice 2026, Christmas 2026, Kwanzaa 2026, and New Year 2027. All use the shared lantern/interaction system. The illustrated Kwanzaa 2026 edition has seven collectibles corresponding to the seven principle labels; the other original editions have eight. Render item totals from each edition instead of hardcoding eight in accessible labels, slot grids, progress, or completion messages.

| Registered edition ID | Opening | Items | Priority |
| --- | --- | --- | --- |
| `scary-christmas-2026` | Scary Christmas. | Eight candies | 100 |
| `thanksgiving-2026` | Good things, gathered. | Eight leaves | 100 |
| `hanukkah-2026` | A little brighter. | Eight lights | 110 |
| `winter-solstice-2026` | The longest night. | Eight stars | 120 |
| `christmas-2026` | Cosmic Christmas. | Eight stars | 100 |
| `kwanzaa-2026` | Together, we glow. | Seven tokens | 110 |
| `new-year-2027` | Next orbit. | Eight sparks | 120 |

The broader registry supplies 35 additional registered template editions for 2027 and New Year 2028, producing 42 total catalog entries. The templates show an **Early edition** marker and use `preparationStatus: 'template'`; this is preparation rather than calendar or publishing approval. It includes major U.S. observances and a selection of international, cultural, religious, and astronomical dates; it is an extensible starting set, not a claim to include every celebration worldwide. Twenty-nine plans have checked dates/windows; Ramadan, Holi, Eid al-Fitr, Eid al-Adha, Diwali, and Vesak keep empty windows and `dateStatus: 'needs-review'` rather than invented dates. See the guide for every plan and primary reference.

MLK Day, Presidents’ Day, Ramadan, Memorial Day, Yom Kippur, Indigenous Peoples’ Day / Columbus Day, and Veterans Day use a quiet reflection treatment with zero collectibles. Other new festive templates use eight discoveries except recurring Kwanzaa 2027, which reuses the seven principle items. Matching recurring editions reuse their earlier illustrated hero, collectible art, and stable item IDs; year-specific edition keys keep progress independent. Other templates use the neutral cosmic-lantern hero/shared stars. Existing palettes and selected edition-specific accents provide continuity; a palette name is not a claim that an unrelated tradition shares holiday-specific symbols. All editions except the released Halloween 2026 retain `approvedForCalendar: false` until deliberate review/activation.

Themes use light, curiosity, generosity, community, heritage, and reflection. They are editorial invitations rather than simulated religious practice. The Kwanzaa edition preserves its African and African American cultural context and seven principles; Hanukkah dates retain the sundown/nightfall distinction. External learning links point to the cited primary/authoritative sources in the guide.

Holiday observance dates and editorial display windows are separate fields. A full-day software window is not a claim about the start of a religious observance; solstice copy names the Northern Hemisphere rather than implying the same season worldwide.

## Music And Generated Media

The original 186-second **Spooky · The Dreadnauts** source recording and its provenance remain preserved. Every active generic edition now has `musicSrc: null`; archive invitations and the lantern link to the existing Dreadnauts music destination. No embedded seasonal audio, new generation, upload, or music publication is introduced.

Six edition hero originals, a neutral year-round hero, an archive concept, and transparent leaf/star cutouts have been generated and retained under `/Users/colin/.codex/generated_images/01a0f453-6186-7321-a3aa-4b39980928c5/`. Runtime WebP byte sizes below were checked from the delivered files. The broader template library uses a delivered neutral cosmic-lantern hero unless a matching earlier illustrated edition is reused. The six upcoming heroes and neutral hero are 1536×1024; shared leaf/star cutouts are 256×256. Preserve the originals, the existing MP3, and source masters. Generation is not public publication.

| Source original | Edition or role | Delivered asset target | Bytes |
| --- | --- | --- | --- |
| `exec-52fa637b-fe8b-46fb-a275-3e5d5dfed395.png` | Neutral seasonal archive concept | Composition reference only. | — |
| `exec-78e0b3c7-6dbd-4e98-a2cb-e6873f8e82cd.png` | Thanksgiving harvest | `thanksgiving-2026/hero.webp` | 124,418 |
| `exec-149e2ffc-5dce-4d34-b4c3-d2814960139a.png` | Hanukkah | `hanukkah-2026/hero.webp`; nine branches visually checked. | 128,796 |
| `exec-fdac0d55-6f4e-4a5d-a2b7-3dcf9f02216d.png` | Winter solstice | `winter-solstice-2026/hero.webp` | 111,608 |
| `exec-be221e40-706c-4805-b021-772e363df04b.png` | Christmas | `christmas-2026/hero.webp` | 160,340 |
| `exec-be576b6c-f730-4178-b6c5-36f32e3378ec.png` | Kwanzaa | `kwanzaa-2026/hero.webp`; seven candles checked as three red, black center, three green. | 144,598 |
| `exec-7c031d9d-f173-46ce-b833-2c3365fe82ac.png` | New Year | `new-year-2027/hero.webp` | 152,464 |
| `exec-da3d3d14-d270-424c-aeda-7479f017f209.png` | Shared transparent leaf | `shared/leaf.webp` | 16,202 |
| `exec-9c5a3544-dadc-4940-ae35-7da16ed8f8f5.png` | Shared transparent star | `shared/star.webp` | 13,606 |
| `exec-5a5e02d5-dd54-4a9d-8b83-bda441cff052.png` | Neutral year-round cosmic lantern | `shared/year-round.webp` | 158,550 |

Asset targets above are relative to `src/assets/seasonal/`. The imagery is contextual illustration; collection clicks do not simulate lighting a hanukkiah or kinara.

## Storage Migration And Compatibility

Two independent device-local storage contracts keep opt-out compatibility separate from earned progress:

| Key | Payload and scope |
| --- | --- |
| `cm.seasonal-preference.v1` | Compatibility shape `{version: 1, editionId: null, disabled: boolean}`. Global opt-out is applied only to signed-in registered accounts; legacy known edition strings are normalized to `null` in memory and ignored for selection. New writes retain `editionId: null`. |
| `cm.<edition-id>.v1` | `{version: 1, enabled: boolean, collectedIds: string[]}`. One edition's progress plus its retained legacy enabled flag. Halloween preserves exactly `cm.scary-christmas-2026.v1` and its original collectible IDs. |

Opting out, restoring the active presentation, visiting an archived edition, or an owner/date-driven season change does not clear any edition's collection. The global preference begins as `{version: 1, editionId: null, disabled: false}`. Existing edition `enabled: false` flags remain respected for signed-in registered accounts and are ignored while signed out; a deliberate restoration also restores that legacy flag for the current edition. The generic migration does not rewrite all old keys or manufacture global consent from an earlier choice.

Preference reads preserve the bounded version-1/boolean disabled contract within 512 characters. A recognized legacy edition string is accepted only for compatibility and becomes `null` in memory; it never overrides owner/date selection. Unrelated storage and edition progress keys are untouched. Subsequent preference writes use `editionId: null` rather than clearing all browser data. Edition reads reject payloads above 4,096 characters, unsupported versions/shapes, and malformed JSON; collectible IDs are filtered to known IDs, deduplicated, and capped at that edition's total. Storage denial falls back to current-session state. Cross-tab events synchronize the preference or the matching edition's progress without treating another edition's IDs as current.

No Firebase, CMS document, auth claim, reward, leaderboard, rule, secret, or account migration is required. These keys remain separate from the site's light/dark preference, reader tools, and Core OS storage. Clone a new year with a new edition ID/key so an earlier year's progress remains available in the archive. An intentional replay of the same edition retains its progress until the visitor confirms reset.

## Disable, Reactivate, And Rollback

- **Local normal design:** the global bypass suppresses seasonal presentation in that browser, including edition pages, while retaining every collection. Restoration keeps progress.
- **Owner/date selection:** main-site presentation follows approved valid calendar windows or an explicit owner manual activation. Public visitors have no season-picker override. An archive URL visits its own edition without changing the main site.
- **Retire main-site decoration:** use `mode: 'off'` or `enabled: false`. The neutral archive and deliberate known-edition visits remain available.
- **Reactivate deliberately:** select a known manual edition, review it, and restore the main-site config. Reusing the same edition preserves its key; a new year receives a new key.
- **Calendar activation:** calendar mode is the default, but all 42 entries remain unapproved. Approve only ready windows after the guide's review gate. Date fields alone never authorize activation or release.
- **Source rollback:** revert the coherent generic shell/routes/styles change while retaining original Halloween source, assets, source masters, and local keys. Never remove public routes without the repository's redirect/archive review or clear all browser storage.

Public release remains separate from local preparation. The prepared crawler/SEO fallback and sitemap gates need the applicable Functions and Hosting deployment plus literal public-route verification before claiming a deployed archive. The app catalog and Functions projection must remain aligned during both release and rollback; no existing Firebase configuration or content migration is required.

## Historical Creative Director Loop And Validation

This preparation uses the installed **Creative Director Loop** with the initialized ColinMichaels.com profile: balanced exploration, one meaningful critique/revision cycle, and low risk for public content, state, and Core OS. Use the current chat's model settings; the skill does not change them automatically. Shared native audio and a small reusable collectible set keep resources proportionate to the visible experience.

The review criteria are recognizable imagery/copy for illustrated editions and honest Early edition labels for templates; useful archive entry points; correct observed dates and cultural context; clear date-review status; quiet reflection on remembrance/observance pages; owner/date activation and opt-out/restoration with independent collections; retained Halloween progress; meaningful completed-state payoff; legible light/dark/mobile layouts; keyboard/focus/touch/reduced-motion behavior; click-initiated audio and teardown; and modular, lazy-loaded media.

| Loop stage | Current record |
| --- | --- |
| CREATE | Preserve the illustrated Halloween experience; add a neutral archive, six distinct upcoming scenes, and a broader source-aware registry using shared interaction/media resources. |
| CRITIQUE — Important | Unverified lunar/regional dates, a generic candy hunt on remembrance days, and accidental crawler exposure would weaken the experience or misstate readiness. |
| REVISE | Keep six unresolved windows empty; mark seven observances for quiet zero-item reflection; separate visitor preference/progress; hold calendar and publishing approvals independently; keep unknown crawler paths as 404s. |
| CRITIQUE — Opportunity | Make old editions self-contained and easy to revisit without depending on today's main-site rotation. |
| REVISE | Put all edition collectibles/clue anchors on their own detail page, keep a neutral searchable index, and retain year-specific collections during opt-out or owner/date changes. |
| CRITIQUE — Important | The first archive frame was gray, its title too small, a generic Collect action weakened the original hunt invitation, and a selector could show the main-site preference while visiting another archived edition. |
| REVISE | Apply the public reader background/display typography, restore **Start the candy hunt**, display the explicit archive edition in the native selector, and retain mobile controls/dynamic item totals. |
| Preference | Retain the real site header/footer and public copy while the seasonal concept supplies the visual direction. |
| VERIFY | Final build/lint/cache passed after the candle-art framing refinement. The earlier 57 combined Angular, 64 desktop/mobile browser, and 65 selected Functions checks remain unchanged; final native desktop candle-art proof and documentation checks are recorded below. |

## Concept Fidelity And Intentional Differences

The archive concept and original local screenshots were reviewed together after revision; picker-related rows below are historical and superseded by the date-activation correction. The comparison retains the open editorial composition while accommodating the real website and an expanded catalog:

| Reference element | Implemented comparison |
| --- | --- |
| Seasonal archive heading and subtitle | The same heading/subtitle direction appears as live, readable text with display typography. |
| Open horizontal rows with fine rules | The archive retains three-column editorial rows and quiet horizontal separators rather than card-heavy framing. |
| Cinematic thumbnail at the left | The actual thumbnails keep a focal crop; larger thumbnails improve reader comfort. Final Hanukkah/Kwanzaa hero framing uses `object-fit: contain` and a feathered mask to preserve the complete candle arrangements. |
| Edition title/year and description in the middle | Live edition titles include year labels and readable descriptions, preserving the reference hierarchy. |
| Holiday label and Explore edition action at the right | The right-hand entry point remains direct and repeats the named holiday context. |
| Distinct cosmic seasonal illustrations | Six new illustrated editions have distinct scenes; broader early templates use neutral shared art or matching recurring illustrations. |
| Floating collector and options | A selected hunt edition has its lantern; the neutral index has Theme options because no edition collection is active there. |

Intentional differences retain the existing real header/footer and site light preference, omit invented reference brand taglines, increase thumbnail/row typography, add search for 42 editions, and use a native edition selector in the options drawer instead of decorative mock controls. Public stories remain real CMS content; no reference text was seeded as a fake article.

## Historical Seasonal Local Validation

These results describe the earlier `codex/seasonal-holidays` implementation, including its now-removed visitor picker. They do not validate the current `codex/seasonal-date-activation` correction. Build/lint/cache were rerun after the final styling-only candle-art framing adjustment. The 64 browser checks preceded that adjustment; no behavior changed, and final desktop visual captures verify the revised framing. The original checks in `SCARY_CHRISTMAS.md` remain historical evidence for its separate worktree.

| Check | Result |
| --- | --- |
| `npm run build` | Passed. Initial bundle: 1.46 MB raw / 328.41 kB transfer. |
| `npm run lint` | Passed for the whole app. |
| Combined Angular tests | 57/57 passed: 36 generic engine/catalog, 13 retained Halloween service, six AppComponent, and two site-footer checks. |
| Combined Playwright suites | 64/64 passed in approximately 4.3 minutes before the final styling-only candle-art crop adjustment: 32 desktop and 32 mobile checks. Both profiles visit every one of the 42 archive routes. |
| Browser behavior | Theme choice/site default, global bypass/restoration, archive search, independent progress/reset, focus/keyboard, zero-item reflection, dynamic seven/eight totals, unknown-ID safety, master-off archive use, reduced motion, and narrow/light/dark layouts passed. Native Halloween audio remains click-initiated with a 186-second duration. |
| Functions build and selected server tests | Passed: 48 seasonal and 17 adjacent checks, 65 total, including frontend/server identity alignment, readable known pages, canonical/noindex/sitemap gates, and unknown-path HTTP 404s. |
| `npm run test:service-worker-cache` | Passed: 12 critical files totaling 1,476.2 KiB; 131 JavaScript chunks remain lazy. Edition imagery/audio load on demand rather than prefetching all media. |
| Planning registry | Targeted ESLint and read-only TypeScript/data checks passed: 35 unique plan IDs, 29 checked windows, six empty needs-review windows, seven reflective plans, and U.S. Mother/Father Sunday calculations. |
| Documentation and whitespace | `npm run test:docs` passed for 108 tracked Markdown files; the same validator including untracked files passed for 111 total. `git diff --check` passed. |
| Native app browser review | The actual archive heading/artwork loaded; the native selector reflected the current Hanukkah archive edition before changing to Kwanzaa. Global bypass and restoration were exercised on a 390-pixel mobile viewport. No framework error overlay appeared on the archive. Final desktop Hanukkah/Kwanzaa captures verify complete candle arrangements after the contain/mask framing refinement. |

Exact final Angular command:

```bash
npm test -- --watch=false --browsers=ChromeHeadless \
  --include=src/app/features/seasonal/seasonal.models.spec.ts \
  --include=src/app/features/seasonal/seasonal.service.spec.ts \
  --include=src/app/features/scary-christmas/scary-christmas.service.spec.ts \
  --include=src/app/app.component.spec.ts \
  --include=src/app/shared/site-footer/site-footer.component.spec.ts
```

Exact final browser command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4327 npx playwright test \
  e2e/scary-christmas.spec.ts e2e/seasonal-archive.spec.ts \
  --project=chromium --project=mobile-chromium --workers=2
```

Exact selected Functions commands (Node 24.15.0):

```bash
npm --prefix functions run build
node --test \
  functions/test/seasonal-archive.test.cjs \
  functions/test/editorial-standards.test.cjs \
  functions/test/seo-fallback-pages.test.cjs \
  functions/test/seo-response-headers.test.cjs \
  functions/test/index-module-loading.test.cjs
```

The Functions test runner reported 65 passed, zero failed/cancelled/skipped/todo after all 42 identities and reflection-specific fallback copy were finalized. These selected checks do not claim the unrun repository-wide test suite passed.

The seasonal preview runs locally on port 4327; the original Halloween preview/worktree on port 4326 remains preserved. Visual evidence is retained under `/Users/colin/.codex/visualizations/2026/09/30/01a0f453-6186-7321-a3aa-4b39980928c5/`: `seasonal-archive-desktop.jpg`, `seasonal-hanukkah-desktop.png`, `seasonal-kwanzaa-desktop.png`, `seasonal-kwanzaa-mobile.png`, `seasonal-theme-options.png`, `seasonal-theme-options-mobile.png`, `seasonal-bypass.png`, `seasonal-hanukkah-framed-final.jpg`, and `seasonal-kwanzaa-framed-final.jpg`. Some historical `.png` names contain JPEG-encoded captures; preserve the existing filenames rather than treating them as runtime assets. Browser verification includes the 320-pixel narrow layout and light/dark states.

## Known Baselines And Deferred Release

The original local public CMS baseline records four Firestore permission-error families: homepage hero, topics, recommended links, and post index. That historical native browser console also reported Firestore connection/unavailable transport warnings after a main-route visit. The root cause remains unverified. Archive presentation has no CMS content dependency and showed no framework error overlay; this does not establish a clean CMS console or verified live published article content.

The historical seasonal implementation/QA above is complete; current activation-correction QA is recorded separately below. Remaining preparation is explicit: six holiday date/community reviews, appropriate track selection for new editions, and optional independent artwork/copy passes for Early edition templates. All calendar and archive publishing approvals remain false. Commit, push, PR, scheduled activation, CMS import, music publication, deployment, and literal public-route verification have not been performed or authorized by this local work.

## Date Activation Correction

The user's correction removes public season selection and restores the intended timing model: automatic presentation only for owner-approved, valid dated windows, or a deliberate owner manual activation. The default is calendar mode with all approvals false. The public archive remains browsable and its media remain presentation assets.

Compatibility retains global disabled/progress values while ignoring recognized legacy edition preferences, writing `editionId: null`, and removing the visitor preference APIs/selector. Calendar minute/visibility refresh prevents a date-boundary change from waiting for the next route navigation. No role grant, CMS mutation, calendar approval, publication, commit, push, PR, or deployment is performed by this correction.

For temporary rollback, the owner can set the central presentation to off while retaining archive routes, assets, opt-out, and collection keys. A source revert must preserve the requested owner/date activation policy rather than silently reinstate a visitor picker; no stored progress or global browser data needs clearing.

Final correction verification passed. Browser results are aggregated across the original run and focused reruns; they are not described as one clean 64-case invocation.

| Current correction check | Result |
| --- | --- |
| `npm run build` / `npm run lint` | Passed after the final restore-focus fix. Initial transfer: 328.49 kB. |
| Calendar/model/service units | 37/37 passed, including owner manual activation, approved-date/timezone boundaries, ignored legacy edition preferences, preserved opt-out/progress, cross-tab storage, minute/visibility refresh, and teardown. |
| Desktop/mobile browser checks | 42 active cases passed: 36 archive cases plus four private/privacy/OS exclusions and two bypass cases. The 22 historical main-site Halloween cases require explicit owner manual activation and remain skipped under the calendar default. |
| Keyboard correction | A stale bypass assertion was corrected, then the updated test found focus was canceled when the inactive control unmounted. Registering the focus callback with the application EnvironmentInjector preserves it; both focused desktop/mobile reruns passed. Component-scoped audio teardown is retained. |
| Scoped spec lint / browser-spec TypeScript / whitespace | Passed. |
| Generated service-worker policy | Passed: 12 critical files / 1,477.5 KiB and 135 lazy JavaScript chunks. |
| Docs/link checks | Passed: 108 tracked Markdown files and 112 including the new files. |
| Native current preview | Port 4328 homepage/index have no idle picker. The archive options dialog has no Season selector and retains the normal-design bypass. Existing Halloween progress remained 1 of 8 without a collection write. Latest warning/error console inspection was empty against the real local empty-CMS emulators. |

Reproduce the focused units with the supported Node 24.15.0 runtime:

```sh
npm test -- --watch=false --browsers=ChromeHeadless \
  --include=src/app/features/seasonal/seasonal.models.spec.ts \
  --include=src/app/features/seasonal/seasonal.service.spec.ts
```

The original browser run used `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4328 node node_modules/@playwright/test/cli.js test e2e/seasonal-archive.spec.ts e2e/scary-christmas.spec.ts --workers=2 --reporter=list`. The privacy/exclusion and final bypass reruns used targeted `--grep` filters. The initial stale-button assertion and later focus failures are resolved, and the old picker QA remains historical.

Native captures are retained under `/Users/colin/.codex/visualizations/2026/09/30/01a0f453-6186-7321-a3aa-4b39980928c5/`: `seasonal-options-calendar-only.jpg` and `seasonal-date-homepage.jpg`. No real calendar entry has been approved or activated, and this is a local preview rather than a deployment.


## Account-Only Holiday Options

The current account-options correction limits personal design preferences to an actual registered Firebase Auth account. `SeasonalService.canCustomize` requires `authState$` to be authenticated with a UID and `isAnonymous === false`. Initializing, unavailable, signed-out, and Firebase anonymous sessions receive the owner/date-selected theme. A local-storage flag or an admin user-view record does not establish eligibility.

Anonymous visitors have no **Holiday options**, bypass, or restore buttons, including inside the public hunt drawer. The hunt, lantern, clues, collectibles, archive browsing, music, and reflective holiday information remain public. Reflection launchers read **About this holiday** rather than implying a preference control. Signed-in ordinary accounts can bypass/restore an eligible holiday; they do not need the separate Early Reader role and still cannot choose another season or bypass owner/date activation.

The service ignores stored global and legacy edition opt-outs while anonymous and rejects direct `setEnabled` calls without writing. The stored values and collection IDs remain intact. Signing out reapplies the site's chosen presentation, closes an open options drawer/lantern, and retains collection progress. Signing back in can resume this browser's saved preference. Preference storage remains device-local; this is not new account synchronization, a paid membership product, a role grant, or a private-content authorization boundary. Article early-access permissions remain independently enforced by the backend.

Temporary retirement still uses the owner off control. Rollback must preserve account-only preference eligibility, existing Auth/account data, archive routes, assets, and progress. No CMS/account data migration, calendar activation, permission expansion, commit, push, PR, or deployment is performed. Current account-options validation is complete:

| Account-options check | Result |
| --- | --- |
| Required whole-app build/lint | Passed after the final account-loss focus handling. Initial transfer: 328.64 kB. |
| Service + lantern component units | 35/35 passed. The five component cases passed again after the final focus polish, including actual document focus returning to the public launcher on sign-out; this overlapping rerun is not added to the unit total. |
| Scoped desktop/Pixel 7 browser checks | 24/24 passed. Includes four actual ordinary-account emulator cases for bypass/reload/restore and cross-tab sign-out, anonymous preseeded global/legacy bypass, public hunt/reflection/audio/clues, 320-pixel light/dark, and privacy/Core OS exclusions. |
| Scoped lint / browser-spec TypeScript / whitespace | Passed. |
| Generated service-worker cache | Passed: 12 critical files / 1,477.9 KiB and 135 lazy JavaScript chunks. |
| Docs/link checks | Passed: 108 tracked Markdown files and 112 including new files. |
| Native current preview | A fresh local archive tab showed the public lantern with existing 1-of-8 progress and zero Holiday options or design-bypass buttons. Latest warning/error inspection was empty. Proof: `seasonal-anonymous-lantern.jpg` under the existing visualizations directory. |

Real account browser proof uses ordinary local Auth-emulator fixtures, with no privileged role or Early Reader grant. The first run found a fixture-profile cleanup authorization error; cleanup was corrected to emulator-only authorization on each fixture's exact profile path, and all own fixtures/profiles were cleaned after the passing rerun. No existing or production accounts/content were changed.

The focused unit run included `seasonal.service.spec.ts` and `components/seasonal-lantern.component.spec.ts`; the final component-only rerun covered the focus polish. Browser checks reused `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4328` with targeted cases from `seasonal-archive.spec.ts` and `scary-christmas.spec.ts`. The all-42 archive loop was not repeated for this auth-only change. Historical owner-manual cases remain gated under the unchanged calendar default, and their obsolete guest-bypass expectations were updated. Previous calendar/date QA remains separately recorded above.


## October 1 Release Review

Colin authorized commit and publication on October 1, 2026. The release branch is `codex/publish-seasonal-experience`, created from the freshly verified `origin/dev` at `8bbaf1547b377ed4879a1ab8d2118cfe7ff8b7ef` while preserving the prepared work. Scary Christmas 2026 is now calendar-approved for its existing inclusive October 1–November 1 New York window. The other 41 editions remain opt-in owner preparations. Historical statements above record the earlier local review state.

The final refactor skips seasonal polling while the page is hidden and suppresses duplicate in-flight schedule requests. Seasonal signal reads are isolated from route analytics so an activation update cannot generate an extra page view. Auth transitions and route changes still clear private state and begin a new request immediately; generation guards continue to reject stale responses. Decorations, component loading, imagery, and click-to-play audio remain scoped to eligible public routes. The owner `off` switch, exact archive URLs, and edition-specific progress remain available for rollback and next-year expansion. Hosting and matching Functions must deploy from the same tested commit. No content scheduling, role grants, Firebase configuration replacement, or source-media changes accompany the release.

### Release Validation And Operational Limits

- `npm run build` and `npm run lint` pass on supported Node 24.15.0. Initial estimated transfer is 328.58 kB. Seasonal UI loads through existing deferred/lazy boundaries; artwork is loaded on demand and the soundtrack requires a click.
- `npm test -- --watch=false --browsers=ChromeHeadless` passes all 1,418 Angular tests, including date boundaries, account transitions, pending-request coalescing, and route analytics. An outdated route-order expectation found in the first run was corrected to include the four new routes.
- `npm --prefix functions run test:all` passes all 240 checks across ten suites; `npm run test:content-packages` validates eight evidence-ready packages.
- Local emulator rules/publishing/migration checks pass 12/12 using isolated test projects. Public direct reads of scheduled article bodies remain blocked. No production posts, accounts, or grants were changed.
- The four seasonal/schedule Playwright files pass 92/92 in desktop Chromium and Pixel 7 profiles. This includes all 42 archive pages, 320/390-pixel light/dark views, keyboard/reset/reduced-motion/music checks, real local ordinary account transitions, and callable fixtures for released/locked/member article presentation. Fixture checks are not authenticated production early-reading proof.
- Native local review confirms the date-selected Halloween homepage, preserved existing collection, and successful empty posting queue against real emulators, with no warn/error logs in the schedule snapshot.
- `npm run test:service-worker-cache` confirms 12 critical shell files and 135 lazy JavaScript chunks. Early-reader navigation is excluded and private responses are not added to offline data caching.
- Calendar approval is limited to Halloween 2026. The other 41 prepared editions retain their review gates. Source rollback or the main-site owner off switch preserves the archive, optional post metadata, source assets, and year-specific progress. Existing published content/tokenized media remain governed by the documented legacy boundary.

Production is released through the repository's existing `firebase-production.yml` workflow from the exact tested feature commit, with Hosting and Functions enabled together and rules/CORS/force options disabled. Keep the prior successful production SHA `8a7646cc6825c1ae15f9990926ae363a06e40f88` as the source rollback reference. There is no merge into `dev` or `master` as part of this direct feature-branch deployment. The draft PR targets `dev` for review and integration; deploy completion and literal public-route evidence are reported separately in the release handoff.


## October 1 CTA Preservation Cleanup

The `codex/seasonal-cta-cleanup` branch was created from freshly verified `origin/dev` at `8bbaf1547b377ed4879a1ab8d2118cfe7ff8b7ef`, then fast-forwarded to the already-published seasonal release `d62300a`. The release is still awaiting integration in PR #357; this cleanup changes only its presentation and documentation.

The public app shell no longer mounts `SeasonalBannerComponent` or an additional reflection panel before normal homepage content. Lights and bats remain non-interactive edge decorations. `MainComponent` defers the reusable seasonal collectible slot immediately after `HomeArticleHeroComponent`; the original `banner` placement value is retained for compatibility, but its CSS now renders a normal row below the hero. Existing IDs, routes, collection keys, calendar approval, owner off/manual controls, and account-only bypass remain unchanged. The first clue now points beyond the featured story.

Component inventory: `SeasonalBannerComponent` is retained exclusively for explicit archive edition pages; it provides holiday artwork, archive hunt/reflection actions, and an external listening link. `SeasonalLanternComponent` retains collection, clues, reset confirmation, account controls, focus trapping, and sign-out behavior. Its audio player, playback state, media references, and teardown machinery were removed because music is external. Active generic Halloween metadata has no music source. Original Halloween components/config and the supplied MP3 are retained as historical source assets; the active app does not load or play them.

Migration: none. Do not clear local storage, collection progress, or site-theme preferences. The source change is presentation-only. The existing production workflow deploys Hosting and the matching Functions SEO shell together so crawler/deep-link responses reference the current hashed web assets. No Functions business-logic, rules, provider, account, or CMS mutation is required. Reverting this cleanup to `d62300a` restores the prior banner/player presentation without changing saved data. Main-site retirement still uses the central owner off switch and preserves the archive.

Cleanup validation: `npm run build` and `npm run lint` pass on Node 24.15.0; initial transfer is 328.33 kB. The focused Angular command covering `seasonal.models.spec.ts`, `seasonal.service.spec.ts`, `seasonal-lantern.component.spec.ts`, `main.component.spec.ts`, and `app.component.spec.ts` passes 62/62. The initial fixture omitted `AuthService.authState$`; adding its signed-out stream resolved eight homepage fixture failures without changing production Auth behavior.

The desktop Chromium and Pixel 7 archive/hunt run passed 68/70, with both remaining failures caused by asking whether a zero-height decorative wrapper was visible. The corrected check observes the actual garland; both focused desktop/mobile reruns pass. These are 70 unique passing cases across the broad run and corrected rerun, not one clean 70-case invocation. Coverage includes every one of the 42 archive routes, 320/390-pixel light/dark layouts, primary CTA position, relocated candy, clues/reset/focus/reduced motion, actual local account bypass/sign-out, and external listening without an audio request/player.

`npm run test:docs` passes all 112 tracked Markdown files; the service-worker policy passes with 12 critical shell files totaling 1,476.5 KiB and 134 lazy JavaScript chunks. Native desktop review at `http://127.0.0.1:4328/` confirms the leading hero and preserved existing 8-of-8 collection, with no warning/error console entries in the inspected snapshot. Clicking the music link opens the actual Dreadnauts Music & Albums page. The local CMS is empty, so this preview does not claim production article data verification. Native mobile screenshot emulation was unreliable; mobile layout evidence comes from the passing Pixel 7 and 320/390-pixel automated checks. The original focused review did not repeat the full Angular/Functions release suite; the final publishing gate is recorded below.

Colin approved the cleanup on October 1 and clarified that seasonal colors should remain. The original homepage hero file and section order match `origin/dev`; the removed extra holiday panel caused the changed hierarchy. The retained palette/decorations are intentional. Commit, push, draft PR, and live verification are recorded separately when confirmed. Desktop proof is saved as `seasonal-cta-homepage.jpg` and `seasonal-cta-lantern.jpg` in the existing task visualizations directory.


### Cleanup Publishing Gate

The final Node 24.15.0 release build and whole-app lint pass; initial transfer remains 328.33 kB. Full Angular tests pass 1,418/1,418, and the unchanged Functions release tests pass 240 checks across ten suites. The documented 70 unique browser cases remain passing across the broad run and corrected focused reruns. Documentation validates all 112 tracked Markdown files; whitespace and offline-cache policy checks pass. The original `home-article-hero.component.ts` is byte-identical to `origin/dev`.

The approved source uses `codex/seasonal-cta-cleanup`, retaining seasonal colors and decorations. Publishing uses the existing `firebase-production.yml` workflow with Hosting and matching Functions enabled together, and rules, Storage CORS, and force deployment disabled. `d62300a` is the prior published source rollback reference. The draft PR includes the already-live release from PR #357 because it has not yet merged into `dev`; the additional cleanup remains isolated in its own commit. This publication changes no CMS posts, account grants, or holiday approvals. Live completion is reported only after the workflow succeeds and the canonical public site is inspected.
