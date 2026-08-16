# Creator Discovery and Trust Action Plan

This plan converts the August 15 audit into releases. Outcomes are targets, not promises of popularity, ranking, or subscriber growth.

## Release 1: Remove Friction and Identity Conflicts

Status: implemented and focused-tested locally; exact release commit, authenticated verification, and explicit deployment approval still required. Machine-readable gate: [`FOUNDATION-RELEASE.json`](./FOUNDATION-RELEASE.json).

1. Remove the 3.2-second anonymous membership modal.
2. Show the same free-account benefits as a non-blocking inline article card after meaningful reading.
3. Keep Create account, Sign in, and Not now visible together at mobile width.
4. Lock every code-defined public topic’s canonical slug, title, summary, short label, matching terms, required resources, and published state while preserving non-identity presentation controls and fully CMS-owned custom topics.
5. Reject undeclared topic-slug renames; a future rename requires a server redirect, sitemap update, and canonical migration in one release.

Release verification:

- focused membership and topic contract tests;
- 390×844 article check with no timed overlay or body lock;
- local crawler-contract and rendered canonical/H1/title/short-label equality for every public topic; repeat the direct HTTP checks after deployment;
- true `404` for undeclared topic slugs.

## Release 2: Make Initial HTML Useful

Status: implemented locally; validation and explicit Hosting/Functions deployment approval still required.

1. Ship the semantic physical homepage fallback and updated creator identity metadata.
2. Ship category/tag/topic collection fallbacks with actual matching article links.
3. Ship static trust-page fallbacks and route-appropriate structured data.
4. Run the SEO-shell regression after the production build and Functions preparation step.
5. Re-crawl all 130 sitemap routes from production and compare H1, word-count, canonical, status, and JSON-LD coverage with this baseline.

Success gate: no homepage/static/archive route in the sitemap should return an empty initial `<app-root>`.

## Release 3: Stabilize the Homepage

Status: implemented locally; production field verification still requires the exact reviewed release.

1. Match the loading hero’s media/copy geometry to the resolved story and mount the Daily Discovery rail from first paint so the latest-writing region stays in place while async content resolves.
2. Give the page a stable rendered creator-promise H1; demote rotating article titles to article-card headings.
3. Move a compact creator proof and follow reason into the first two mobile viewports.
4. Add Topics, About, and YouTube to the mobile discovery path without crowding the primary header.
5. Re-run repeatable mobile CLS checks and obtain field CWV data when the API becomes available.

Local verification:

- mobile Chromium at 390×844: CLS `0.0031`, one stable creator-promise H1, all four discovery links visible within the first viewport, Daily Discovery beginning within the second viewport, and zero horizontal overflow;
- desktop Chromium at 1440×1000: CLS `0.0097`, the same H1/H2 hierarchy, and zero horizontal overflow;
- focused homepage/hero contracts: 23/23 passed;
- featured-story navigation changed the visible article and live position without shifting the persistent identity block.

The lab target below `0.10` is met locally. Field data remains authoritative once this exact release is deployed and receives sufficient traffic.

## Release 4: Build Topic Journeys and Citation Trust

Target: first 30 days after the foundation deploy.

Status: reusable article-level infrastructure, one genuinely related inline next read, a crawler-visible strongest-topic continuation, the drone article-to-video fallback, exact editor-selected article/video pairing, a protected pre-publication Discovery & Trust review, a crawlable Editorial Standards & Corrections authority surface, and an optional article evidence/disclosure contract are implemented locally. The inline continuation privileges the primary canonical category, excludes merely recent unrelated posts, removes its choice from the right rail, and reuses bounded `related_reading` measurement; it remains a discovery fallback rather than an editorially explained in-body link. Eight content packages are now evidence-ready: five researched packages and three mixed-evidence first-party video companions. The protected Posts screen has separate read-only Evidence and Discovery & Trust queues: it can prioritize published required evidence/source gaps ahead of advisory contextual-link or supporting-artifact opportunities without writing Firestore, changing status, or inferring article claims. The Drones & FPV hub has a branded Flight Field Notes PDF and the Personal Aircraft Buyer Verification guide/PDF. The Gadgets & Toys hub now has a crawlable `/resources/gadget-usefulness-scorecard` framework and one-page printable that unifies the HOVERAir AQUA, Unitree R1, and Laundry Chair articles plus their staged Captain Colin descriptions around the same evidence and verdict loop. Both resource pages have matching Angular/Functions fallbacks, sitemap/search/`llms.txt` discovery, contextual continuations, and bounded `resource_page` download events; field notes retain `topic_guide`. A separate live-audited package now turns the `14,920`-view Hurricane Milton video into a truthful evergreen gateway by preserving its title and ID, correcting the unsupported tornado claim, adding evidenced chapters and safety links, requiring a real-frame thumbnail, and continuing viewers to Farmers Paradise and Drones & FPV. The production corpus still needs article-by-article classification, source editing, approved publication, reciprocal live channel edits, and independently earned citations.

The shared renderer now turns literal HTTP(S) text into a safe clickable reference without mutating stored posts. Article pages also add one strongest-match public topic continuation using deterministic taxonomy/tag/title/slug/excerpt weighting; unmatched posts receive no generic link. Editors can mark exactly one trusted YouTube block as the article's companion; that exact video is deferred after reader feedback and measured as `source_component=article_companion_youtube`. Drone/FPV articles without an exact pairing retain the separately attributed latest-channel fallback. Meaningful revisions already show a separate Updated date through the existing article date contract.

The CMS Preview & SEO workspace now analyzes the current Editor.js document for usable external references, non-self contextual article links, and supporting artifacts. It recognizes rich-text, Markdown, literal URL, recursive-list, and chart-source links while excluding media destinations from citation counts. The checks remain advisory because a personal journal can be source-free and because the presence of media does not prove originality, authority, or relevance. No post content is rewritten.

The public `/editorial-standards` route now defines hands-on, field-note, research-only, manufacturer-supplied, and synthetic-media evidence boundaries; documents sources, relationships, AI assistance, high-stakes limits, and material corrections; and gives readers a direct correction path. Angular, crawler fallback HTML, `WebPage` structured data, sitemap, internal search, author surfaces, footers, and `llms.txt` expose the same policy. It does not claim that legacy posts already satisfy the policy or invent credentials, tests, ownership, sponsorship, or external recognition.

Every article now also has a reader-visible evidence surface near its opening. Reviewed posts can store a supported evidence basis, an article-specific summary, source-review date, relationship/AI/synthetic-media disclosures, and a substantive update note; unreviewed posts display **Not yet classified** without implying ownership, testing, supply, sponsorship, or verification. The same state appears in crawler fallback HTML, while explicit external source URLs populate deduplicated `BlogPosting.citation` metadata in Angular and Functions. The protected CMS preserves the optional fields through save, backup, import, social workspace, checklist, and legacy-compatible recovery paths; the trusted Function validates them. No production post was classified or rewritten, so corpus adoption remains editorial work.

The HOVERAir AQUA, passenger-drone, Unitree R1, Laundry Chair, and Temu mega-drone packages now carry reviewed `researched` metadata that matches their source ledgers and no-hands-on disclosures. The Temu refresh also has a complete local Captain Colin companion-video package and a dedicated commentary-labeled thumbnail; its current Goonzquad embed remains third-party evidence, not an exact companion selection. A read-only live-record verifier now proves the Temu package targets the exact public document at effective legacy revision `0`, preserves its dates, media, taxonomy, and all 61 original block IDs, and fails on any complete-document fingerprint drift. A separate live-snapshot channel package aligns Captain Colin's About copy, HTTPS profile links, banner, new-visitor trailer, returning-viewer spotlight, Home rows, and gated playlists with the same gadgets/FPV/internet-finds promise while preserving the existing archive and current configuration for rollback. The Farmers Paradise article uses `mixed` evidence: Colin's own timestamped public footage for the visible story and current official FAA pages for general U.S. flight context, with no aircraft, exact-location, permission, airspace, weather, or compliance claims inferred from the edit. Repository gates confirm evidence fields, explicit non-media references, generated-media disclosure, and a substantive update note. All new posts and channel changes remain local, and the Temu refresh remains unimported pending final editorial approval, authenticated Production Preview, and an immediate fingerprint recheck.

Independent-authority preparation now includes two machine-validated exact-page cohorts: 25 Drones/FPV prospects and 25 gadget/creator-tech prospects. Across both, 18 are ready only after the relevant landing/PDF production gate and a same-day route check, 12 require a specific relationship, rights, reporting, or experience decision, 20 remain on hold, and 0 have been contacted. Paid dofollow placement, commercial product listing, and self-publication are forced holds rather than being counted as earned recognition. Provider-backed backlink scoring remains **INSUFFICIENT DATA**; this research does not claim a backlink, referral, or authority gain.

The eight evidence-ready article candidates now have a validated release runway rather than an undifferentiated draft backlog. The common score weights proven audience demand, first-party evidence, and current creator-promise fit most heavily, then accounts for readiness, cross-channel continuation, save/share utility, and risk. Ace Pro is the strongest new flagship at `47/50`; the operational order intentionally puts the existing Temu refresh first to repair its measured search/CTR leak, Ace Pro second to create an exact first-party article/video loop, and the Laundry Chair third to test the promise beyond drones. A live preflight found a complete indexed HOVERAir AQUA article under a different canonical, so the staged HOVER package is consolidation-only and explicitly forbidden from becoming a second URL. A separate read-only Ace Pro preflight now proves the proposed route returns `404` with `noindex,nofollow`, has zero anonymous published-slug matches, stays out of the sitemap, and still resolves the exact `OFeCTH2LP9s` upload under Captain Colin; because anonymous direct-document reads are denied, protected import-time draft reservation remains mandatory. The runway recomputes score math, covers every current import package, validates the duplicate-topic gate, and fails if any external action is marked complete without the artifact being deliberately updated.

For each new flagship article and for the highest-impression existing articles:

- add one contextual link to the most relevant topic hub;
- add one contextual link to a related article where it genuinely advances the reader’s question;
- convert named sources into descriptive references; the renderer now makes literal printed HTTP(S) URLs clickable as a safe baseline;
- show a visible updated date and concise reason when a substantive revision occurred;
- add at least one original artifact when available: footage, field photo, screenshot, measurement, comparison table, or checklist;
- link the companion YouTube video and article in both directions.

Do not pad short recovery updates to arbitrary word counts. Treat them as a serial journal with explicit previous/next context.

## Release 5: Clean Index and Feed Contracts

Target: days 31–60.

Status: feed-item URL normalization, Function response-header parity, blog-index trailing-slash redirect, duplicate taxonomy consolidation, non-destructive title/description review, and exact Firebase Auth iframe coverage completed locally; CSP enforcement still requires deployed authenticated/embed verification, and article metadata recommendations require explicit CMS editorial approval.

The shared Functions feed metadata path now resolves stored relative canonicals against `https://colinmichaels.com`, preserves valid absolute HTTP(S) canonicals, and falls back to `/blog/{slug}` when a canonical is missing, malformed, or uses a non-HTTP scheme. RSS `<link>`/`<guid>` and JSON Feed `id`/`url` therefore share one absolute-URL contract without rewriting Firestore documents.

1. Inventory duplicate categories/tags and select one canonical public taxonomy for each duplicated set.
2. Add permanent redirects before removing any duplicate archive from the sitemap.
3. Normalize RSS and JSON Feed item URLs to absolute canonical URLs.
4. Redirect `/blog/` to `/blog` if route and cache testing confirm no regression (implemented locally and emulator-verified).
5. Shorten long titles/descriptions only after checking the actual query and page intent; do not rewrite solely to satisfy character heuristics.
6. Extend security headers to Function-generated 404s and allow the exact current Firebase Auth helper in `frame-src` (implemented locally); keep enforcement off until deployed authenticated and embed verification passes.

Local index/feed verification:

- Functions TypeScript build passed;
- 4/4 focused feed URL contracts passed for relative, absolute, missing, malformed, and non-HTTP canonical inputs;
- 6/6 focused response-header contracts passed, including exact Hosting parity, report-only CSP, the bounded Firebase Auth helper origin, all four Functions' early 405 paths, and a generated static-asset 404;
- 2/2 Hosting configuration contracts passed, proving an exact `/blog/`-only `301` and no configured `/blog` loop;
- the live taxonomy inventory selected `cats-and-pets`, `health-and-recovery`, and category-owned `personal-growth` as canonical public intents; five exact legacy category/tag URLs now have local `301` contracts;
- canonical matching includes legacy tag-only posts, deduplicates aliases per post, removes overlapping tag archives from generated sitemap output, and aligns Angular links/metadata with Functions feeds/fallbacks without rewriting Firestore content;
- 24/24 pure Functions SEO contracts and 22/22 focused Angular taxonomy/rendering contracts passed;
- all five taxonomy aliases completed one local emulator `301` hop to a final `200`; canonical category pages, `/blog`, and both feeds remained `200`, and a true unknown route remained `404`;
- a fresh crawl of 131 sitemap URLs produced 26 unique long-metadata review candidates: 23 posts already have stable-slug, no-redirect recommendations in the protected CMS manifest, while the three non-post candidates retain accurate copy; no bulk import or character-count-only rewrite was performed;
- report-only `frame-src` now permits only `https://colinmichaels.firebaseapp.com` for the current Firebase Auth helper, with a regression that rejects a broad Firebase Hosting frame wildcard; custom-domain Auth migration remains provider-console gated and CSP enforcement remains off;
- Firebase Hosting/Functions emulator: `/blog/` returned `301 Location: /blog`; following it reached `/blog` with one redirect and final `200`; `/blog` remained `200`; an article path and unknown route remained unredirected `404`s in the empty emulator dataset; and both feed routes remained `200`;
- no CSP enforcement, Firebase data migration, deployment, or production URL/feed/header change was performed.

## Ten-Day Measurement Loop

Compare counts before percentages:

- Search: impressions, clicks, query/page CTR, and position.
- Reading: 25%/95% article progress, next-content selections, saves, reactions, shares, and comments.
- Video: impressions, CTR by surface, first-30-second retention, average view duration, and end-screen continuation.
- Loyalty: new/casual/regular viewers and returning engaged readers.
- Cross-channel: article-to-video and video-to-article selections.

The initial low-volume baselines remain:

- Google Search, comparable 28 days: 5 clicks, 472 impressions, 1.06% CTR, average position 18.57.
- YouTube, comparable 28 days: 129 views, 2.5 watch hours, monthly audience 85, with 2.4% regular viewers.

Do not call page loads “people,” and do not treat an impression, subscriber, or account creation as proof of satisfaction.

## Deployment Boundary

Before release, run `npm run build`, `npm run lint`, `npm run build:functions`, `npm run prepare:functions-seo`, `npm run test:seo-shell`, the focused contracts, and the complete Angular suite. Deploy only the exact reviewed commit. Verify production HTTP output, rendered mobile behavior, console state, and analytics receipt separately.

Rollback must restore Angular Hosting and the matching Functions renderer together. It must not delete Firestore topics, account preferences, articles, analytics history, or unrelated creative assets.
