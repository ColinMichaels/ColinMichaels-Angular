# Scary Christmas

## Edition Compatibility Note

This document records the original Halloween implementation and its completed local QA on `codex/scary-christmas`. That checkout and feature source are preserved. The follow-up `codex/seasonal-holidays` preparation uses the [generic seasonal feature](./SEASONAL_CAMPAIGNS.md) for the app shell and archive while retaining Halloween's exact storage key, collectible IDs, artwork, and soundtrack. The validation recorded below is historical evidence for the original build, not a claim that the new generic engine has passed its checks.

## Purpose And Release State

Scary Christmas is a reversible seasonal presentation and device-local candy hunt for the public site. It combines Colin's playful Halloween identity with the established cosmic/Dreadnauts direction: lantern light, warm pumpkin and candy accents, quiet bats and garlands, and a hunt that encourages readers to explore real writing and projects.

This work is isolated on `codex/scary-christmas`. The feature is enabled in the dedicated review branch through central configuration. Its timing is branch-controlled; there is no automatic October calendar, scheduled activation, or scheduled removal. Commit, push, pull-request creation, publication, and deployment remain separate actions. No production release is recorded by this document.

The homepage banner reads **Scary Christmas.** and **A little spooky. A little cosmic. A whole lot of candy.** Its primary action is **Start the candy hunt**. The seasonal banner supplements the existing homepage creator promise and real CMS-selected story; it does not replace the site identity or seed fictional articles. The accepted visual concept's sample story text is a design reference only.

## Architecture And Component Inventory

The feature lives under `src/app/features/scary-christmas`. Existing public components expose small integration points rather than duplicating hunt state or turning the public site into a new application. No reusable OS framework code moves into the feature.

| Component or resource | Responsibility |
| --- | --- |
| `ScaryChristmasBannerComponent` | Homepage seasonal opening, hunt invitation, and optional Dreadnauts listening action. |
| `ScaryChristmasCandiesComponent` | Named, accessible collectible buttons at configured public discovery locations; observes the shared collected state. |
| `ScaryChristmasLanternComponent` | Persistent bottom-left collection control and dialog containing progress, clues, completed/remaining candy state, reset confirmation, and design preference. |
| `ScaryChristmasService` | Single source of truth for feature preference, known collectible IDs, deduplicated progress, lantern state, polite announcements, and bounded device-local persistence. |
| `scary-christmas.config.ts` | `SCARY_CHRISTMAS_CONFIG.enabled` central switch, season ID, eight collectible definitions, stable IDs, labels, clues, route targets, and optional music destination. |
| `src/styles/_scary-christmas.scss` | Seasonal site-token overrides and decorative shell treatments scoped to the app host instead of global theme or OS tokens. |
| `src/assets/seasonal/scary-christmas/` | Generated hero, candy, and lantern derivatives prepared for this feature. External source masters are preserved. |

The app shell defers seasonal presentation until its eligible public route is active. The ordinary application, header, blog content, existing theme service, and routing remain authoritative. Seasonal state and UI are lazy/deferred resources rather than additions to the initial always-visible infrastructure.

Seasonal token decoration, the header garland/bats, candies, and lantern participate on the homepage, public blog/list/article surfaces, topic hubs, and authors index/details. The full hero banner appears on the homepage only. Tokenized blog previews, admin, authentication, Profile, privacy, contact/forms, Core OS, and truly unknown route shapes keep their existing presentation and behavior.

`isScaryChristmasRoute` is an eligibility check for public URL shapes, not a CMS existence check. A valid-shaped missing article, topic, or author can retain the seasonal shell while the existing page reports missing data. That limitation must not be described as a complete missing-content exclusion. The master `SCARY_CHRISTMAS_CONFIG.enabled` gate also controls the app-shell route condition, so setting it to `false` removes the normal-design restore button as well as the active seasonal presentation.

## Hunt And Lantern Behavior

The hunt has eight unique candies. Every placement is part of the public page composition, with a named button and a generous touch/focus target. Collecting a candy updates one shared lantern rather than creating accounts, awards, or another progression system.

| Candy ID and name | Placement | Public destination |
| --- | --- | --- |
| `ember-toffee` — Ember toffee | Homepage banner | `/` |
| `moonlit-mint` — Moonlit mint | Homepage footer | `/` |
| `paper-phantom` — Paper-wrapped phantom | Blog trail | `/blog` |
| `midnight-caramel` — Midnight caramel | Blog footer | `/blog` |
| `witchy-wonder` — Witchy wonder | Topic trail | `/topics/gadgets-toys` |
| `sky-sour` — Sky sour | Topic trail | `/topics/drones-fpv` |
| `neon-nougat` — Neon nougat | Topic trail | `/topics/labs-projects` |
| `ghostwriter-gum` — Ghostwriter gum | Authors trail | `/authors` |

The lantern displays collected progress out of eight, lets visitors reveal clues, and confirms collection reset before discarding it. A quiet **Use the normal design** preference disables the seasonal treatment locally; **Bring back Scary Christmas** restores the hunt presentation and retained collection. The central configuration switch overrides local preference so maintainers can end the campaign without changing routes or deleting content.

The dialog uses CDK focus trapping and Escape dismissal. Removing a collected candy moves focus to the lantern launcher; reset, disable, restore, and music actions keep focus on a live control. A polite screen-reader status announces collections while a separate visible toast expires after five seconds. The lantern sits at bottom left to avoid the existing Reader Tools control at bottom right.

The hunt has no rewards, points, Firebase records, role claims, leaderboard, or dedicated collection analytics. Its state is a convenience on one browser/device, not proof of account identity or an achievement with value. Existing site analytics and ordinary public navigation remain governed by their established boundaries.

## Music And Asset Provenance

The review build uses the existing **Spooky · The Dreadnauts** recording, the strongest located match to the user's recently created Suno song. Its local source is `/Users/colin/.codex/.chatgpt-projects/g-p-6a5aa4a815348191bf2f4dd4283ae1d9/dreadnauts-spooky-video/public/audio/spooky-remix-new-lyrics.mp3`. The unchanged 4.4 MB, 186-second MP3 is staged at `src/assets/seasonal/scary-christmas/spooky-remix-new-lyrics.mp3`. Source and staged file share SHA-256 `fd1ad03343886df91cd4899978672a3c5a1d5113fc182dc2181406bc42dd3c62`.

Music is optional and starts only when the visitor chooses **Play Spooky**. The native `<audio>` controls are created after that action with `preload="none"` and no autoplay attribute. Closing or disabling the lantern, leaving its eligible route, or destroying its component pauses playback and removes the active player. The existing `https://dreadnauts.uk/music` destination remains an optional **More from the Dreadnauts** link. No new music generation, full-track listening audition, upload, or publication is established by this work.

A local browser check observed native playback advance from `currentTime` 0.285 to 9.00 seconds with duration 186 seconds. This proves the click-initiated player advances locally; it is not a full-song quality assessment or evidence of a public music release.

Generated seasonal artwork is a presentation derivative. The supplied generation outputs remain source masters outside the runtime transformation path; the runtime uses compact WebP derivatives and keeps heading/message/actions as HTML rather than text baked into images.

| Source generation ID | Role | Delivered resource |
| --- | --- | --- |
| `exec-951650e6-9748-4e8a-a28d-375b70ef5d1c` | Accepted composition reference | Concept only; sample content is not seeded into the CMS. |
| `fe7e70b5-bdb3-4704-889e-3213ec51ef9e` | Text-free cosmic lantern/pumpkin hero | `haunted-lantern-night.webp`, approximately 86 KB. |
| `301dd189-81ea-45e2-9b7b-0be8ba49cd47` | Wrapped moon candy cutout | `moon-candy.webp`, approximately 13 KB; amber/violet/mint presentation variants reuse it. |
| `0c520b6b-30ff-4a8c-8e62-e4de3a37de5d` | Brass crescent/star collection lantern | `collection-lantern.webp`, approximately 13 KB. |

## Device-Local State And Migration

The feature owns `cm.scary-christmas-2026.v1` in its own seasonal `localStorage` namespace, exported as `SCARY_CHRISTMAS_STORAGE_KEY`. Its payload is `{version: 1, enabled: boolean, collectedIds: string[]}` and stores only local seasonal preference and collected candy IDs. It is independent of the existing site theme, Reader Tools, membership, CMS Recovery, Daily Discovery, and Core OS storage.

The read boundary refuses stored payloads longer than 4,096 characters, accepts version `1` and known IDs only, deduplicates IDs, caps progress at eight, and falls back safely for malformed JSON or an unsupported shape. A denied/unavailable `localStorage` read or write leaves the feature usable with in-memory state. It never clears the origin's storage, reads another feature's keys, or exposes errors to a visitor as broken navigation. Storage events synchronize the same campaign across browser tabs; the listener is removed with Angular teardown.

No Firestore, Storage, Functions, rules, route, CMS content, account, or existing local-state migration is required. A later campaign/schema should use a new versioned key or an explicit bounded migration; do not silently reinterpret this collection as another season's progress.

## Disable, Rollback, And Deployment

1. For one browser, choose **Use the normal design**. Existing collection remains available through **Bring back Scary Christmas** while the central campaign switch is enabled.
2. For the entire build, set `SCARY_CHRISTMAS_CONFIG.enabled` to `false`. Verify that the banner, candies, lantern, restore button, token overrides, and header decoration all disappear on eligible routes.
3. For source rollback, revert this coherent seasonal change and its shell/page integration. Keep existing public routes, article data, theme preferences, OS code, and external source masters. The inert local seasonal key may be retained or removed individually when explicitly desired; never clear all browser storage.

An eventual release requires the tested Angular Hosting build. No new Function, rule, secret, provider account, or content import is required. Deployment is not authorized by the local implementation request and must be recorded separately if performed.

## Creative Director Loop Record

The initialized ColinMichaels.com profile supplies balanced exploration, low risk for public/content/state boundaries, and one meaningful critique/revision cycle. This seasonal direction protects the site's personal voice, useful humor, existing reading hierarchy, dark mode, and the reusable OS framework. The current chat's model/reasoning configuration remains in control; the skill does not change model settings automatically.

### CREATE

The selected direction is a warm, cosmic Halloween celebration with a large readable seasonal banner, restrained decorations, eight purposeful discoveries, and a lantern collection payoff. Reuse the existing Angular/public shell and keep the seasonal layer modular. Generated media is reserved for the hero/collectibles where it materially supports the concept.

### CRITIQUE

The review uses Creative Director, Reader, Accessibility, Technical Director, and Performance lenses. Meaningful findings were separated from subjective styling preferences:

| Classification | Finding | Response |
| --- | --- | --- |
| Important | Collect/reset/disable/play can remove the focused control and strand keyboard users. | Preserve focus through collection-to-launcher transfer, reset-to-exploration transfer, disable/restore transfer, CDK focus trapping, and an explicitly focusable native audio control. |
| Important | A hidden or destroyed lantern could leave soundtrack state active. | Pause and clear the player on close, disable, route/component teardown; keep playback visitor-initiated. |
| Opportunity | Empty or indefinitely visible announcement UI adds visual clutter. | Keep a stable screen-reader-only polite status and a separate five-second visible collection toast. |
| Important | The master switch could leave a local restoration control visible. | Include the central switch in the app-shell seasonal route gate. |
| Important | The lantern summary was too tight on a 320-pixel phone. | Use a 1.35-rem summary heading and a four-column slot grid below 380 pixels; retain all eight collection slots across two rows. |
| Preference | A seasonal composition could replace the normal header/story with concept sample content. | Retain the real site header, creator promise, and CMS-selected story; sample concept copy is not production content. |

The source review also identified the route-shape/CMS-existence distinction described above. It remains an explicit limitation rather than a claim that missing valid-shaped records are excluded.

### REVISE

The targeted revisions protect the spooky humor and cosmic imagery while improving actual interaction behavior. A final narrow-screen adjustment preserves the lantern summary and eight-slot collection at 320 pixels without horizontal overflow. The implementation preserves the ordinary CMS header and story copy and places the lantern at bottom left so the existing Reader Tools remain available at bottom right. The soundtrack reuses the located recording and native browser controls instead of introducing a new music provider, API, or background audio system.

#### Concept Fidelity

| Concept element | Implementation comparison |
| --- | --- |
| Cosmic Halloween night with a warm lantern/pumpkin focal point | The text-free hero retains the brass lantern, crescent/star glow, pumpkin, moon, and night setting; mobile stacks copy above the scene. |
| **Scary Christmas.** with warm amber emphasis | Live HTML keeps the two-line title, cream/amber contrast, and readable message. |
| A clear invitation to play | **Start the candy hunt** stays the primary amber action; the quieter Dreadnauts action opens the same lantern. |
| A lantern that holds the collection | The crescent/star lantern appears in the launcher and dialog, with eight slots and a visible count rather than a decorative-only prop. |
| Small discoverable wrapped sweets | The moon-candy cutout is reused in amber, violet, and mint treatments across eight actual public destinations. |
| Garland and bats around the site | Lightweight shell decoration preserves the festive atmosphere without covering navigation or rewriting page content. |
| Seasonal styling alongside the real website | Existing header, creator promise, and real CMS story remain; the concept's sample editorial rows are intentionally omitted. |
| An easy-to-reach collection panel | The panel is bottom-left and scrollable on small screens, preserving the existing bottom-right Reader Tools. |

### VERIFY

Evidence recorded so far applies to the local review build. Final build, lint, combined focused unit tests, expanded browser tests, service-worker cache validation, documentation checks, and manual master-switch verification have passed locally. No public deployment or live published-article review is claimed.

| Check | Current result |
| --- | --- |
| `npm run build` | Passed after the final 320-pixel lantern-layout revision. |
| `npm run lint` | Passed after the final 320-pixel lantern-layout revision. |
| Focused Angular unit tests | 19/19 passed: 13 seasonal service tests plus six existing app-component tests. One expected existing Auth-without-Firebase-provider warning remains in the unit fixture. |
| `e2e/scary-christmas.spec.ts` | Final 26/26 passed in approximately one minute: 13 Desktop Chrome and 13 Pixel 7 checks, using two workers. |
| `npm run test:docs` | Passed for 108 tracked Markdown files. A supplemental run applying the same validator to the new untracked feature document also passed for all 109 Markdown files. |
| `git diff --check` | Passed for the current change. |
| `npm run test:service-worker-cache` | Passed: 12 critical resources total 1,431.3 KiB; 129 lazy chunks remain outside the critical install set. |
| Manual central disable | Passed: setting `SCARY_CHRISTMAS_CONFIG.enabled` to `false` removed the seasonal app-host class, banner, all candies, garland, lantern, and restore control. `scary-christmas-disabled.png` records the normal-design result. The config was restored to `enabled: true`, matching the tested final source. |
| Native local music playback | Explicit click created controls and playback advanced from 0.285 to 9.00 seconds, duration 186 seconds. |
| Rendered visual evidence | Local desktop light/dark checks at 1276×718, phone at 390×844, and small phone at 320×740. Screenshots: `scary-christmas-desktop.png`, `scary-christmas-desktop-dark.png`, `scary-christmas-desktop-lantern.png`, `scary-christmas-mobile.png`, `scary-christmas-mobile-lantern.png`, and `scary-christmas-small-phone-lantern.png` in the current chat's visualization directory. Theme preference and viewport were restored after QA. |

Initial browser coverage includes candy counting/removal and reload persistence, clue navigation and a complete eight-candy collection, normal-design preference with retained progress, cancelled/confirmed reset, Escape and launcher focus return, visitor-triggered native controls, minimum 44-pixel candy/launcher targets and narrow-screen fit, and privacy-route exclusion.

The local public CMS baseline has four Firestore permission-error families: homepage hero, topics, recommended links, and post index. Their services, rules, and tracked environment source were not changed by this feature. The root cause has not been verified. The seasonal hunt can be exercised independently, but local fallback/read states do not establish verified live published article content. Preserve this quantified console baseline instead of reporting a clean CMS review.

The combined focused unit command was:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/app.component.spec.ts --include=src/app/features/scary-christmas/scary-christmas.service.spec.ts
```

The final expanded browser command, run with Node 24.15.0 on the task's `PATH`, was:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4326 node node_modules/@playwright/test/cli.js test e2e/scary-christmas.spec.ts --workers=2 --reporter=list
```

Expanded checks passed for focus after collection/reset/disable/play, actual native playback and close/route teardown, light/dark preferences, system/reader reduced motion, and excluded private/OS route surfaces. The manual central-disable check restored the configuration byte-for-byte afterward; its SHA-256 was `df4171c45bb2735bc4331380369f6df50f6c787e7fe27b9dd91298eec1ddc83f`. Local feature verification is complete. The remaining limits are the quantified local CMS read baseline and the absence of public publication/deployment evidence.
