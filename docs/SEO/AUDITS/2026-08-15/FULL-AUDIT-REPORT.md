# ColinMichaels.com SEO, Content, and Reader-Experience Audit

Audit date: August 15, 2026 UTC  
Scope: all 130 sitemap URLs, rendered desktop/mobile spot checks, the 81 sitemap-listed articles, Firebase SEO routing, structured data, and the anonymous article journey  
Site type: independent creator publication connecting ColinMichaels.com with the Captain Colin YouTube channel

## Executive Result

The site has a credible technical base and a substantial first-person article library. Its largest current growth constraint is not publishing volume. It is inconsistent identity and interruption: public topic URLs change meaning after Angular loads, anonymous mobile readers receive a blocking signup dialog before they can read, and important archive/homepage meaning is absent from the initial HTML.

Overall audit score: **68/100**. This score is a directional release baseline, not a Google ranking or traffic forecast.

| Area | Score | Summary |
| --- | ---: | --- |
| Technical SEO | 71 | Clean sitemap/canonical baseline, but 40 routes lack meaningful initial HTML and homepage CLS needs work. |
| Content and E-E-A-T | 65 | Strong first-person experience and disclosures; weak source linking, authority proof, and contextual cluster links. |
| On-page and topic architecture | 64 | Sound article depth, but live topic identity and intent drift undermine the hubs. |
| AI citation readiness | 58 | Good answer-first writing in places; many source lists are not clickable and public entities conflict across render layers. |
| Reader experience and accessibility | 62 | Strong controls/search fundamentals, but the timed mobile modal is a severe interruption. |
| Image accessibility | 100 | The crawl found no missing image alt attributes in the inspected initial markup. |

## Evidence Snapshot

- [robots.txt](https://colinmichaels.com/robots.txt) returns `200`, allows crawling, and points to the sitemap.
- The [XML sitemap](https://colinmichaels.com/sitemap.xml) contains 130 unique URLs. All 130 returned `200` during the crawl; none redirected or failed canonical checks.
- 40 routes had no crawler-visible H1 in initial HTML: the homepage, four public trust/static pages, 21 category archives, and 14 tag archives.
- 47 routes had fewer than 200 words in initial HTML.
- 40 routes had no initial JSON-LD.
- The title/description heuristic found 14 titles over 60 characters and 18 descriptions over 160 characters. These are review queues, not automatic rewrite instructions.
- A repeated mobile lab check measured homepage CLS at `0.189`; the largest observed shift came from the latest-writing region moving after the hero resolved.
- The external field-performance API was rate-limited, so field INP was not verified.

Local remediation after the audit: the hydrated homepage now keeps the same evergreen creator-promise H1 as the physical fallback, treats the rotating article title as an H2, mounts the Daily Discovery rail from first paint, and uses a geometry-matched loading story. A fresh local Chromium check measured CLS at `0.0031` on 390×844 mobile and `0.0097` on 1440×1000 desktop. These are lab results, not production field CWV.

## Critical Findings

### 1. Public topic identity changes after the page loads

The server, sitemap, Angular client, and stored topic overlay do not currently agree:

- [Labs & Project Demos](https://colinmichaels.com/topics/labs-projects) returns a valid labs page, then the client changes the URL/canonical to `/topics/weekly-updates`; that direct URL returns `404` and `noindex`.
- [Recovery Planning](https://colinmichaels.com/topics/recovery-planning) becomes “Health Tips” after client rendering.
- [Angular & Firebase Architecture](https://colinmichaels.com/topics/angular-firebase-architecture) becomes “Web Development.”

This also changes article matching. The recovery hub currently includes unrelated AI, travel, and utility articles, weakening reader intent and topical relevance.

Local remediation in this worktree: code-defined public topics now lock their ID, slug, eyebrow, title, description, summary, published state, short label, matching terms, and required public resources. Firestore can still supply artwork, guide content, theme color/icon/map presentation, ordering, and additive resources; custom CMS topics remain CMS-authoritative. Contract coverage proves a stored rename or archive cannot create a hydrated 404 for a sitemap route, while the short-label lock prevents old overlays from leaking conflicting names into breadcrumbs, CTAs, guides, and archive labels.

### 2. Anonymous mobile readers are interrupted before reading

At 390×844, a focus-trapped, full-screen membership modal opened 3.2 seconds after anonymous auth resolution. The primary account actions began below the initial viewport while body scrolling was locked; only the close control was initially reachable without scrolling inside the dialog.

Local remediation in this worktree: the wall-clock anonymous modal trigger is removed. A non-blocking inline card appears after the article content and before reactions. Create account, existing-account sign-in, and Not now remain visible together on mobile. The modal and body lock remain only for an explicit signed-in preference-completion follow-up.

### 3. Important route meaning is absent from the initial HTML

Firebase Hosting serves the physical application index for `/` before the Functions catch-all can add a route fallback. The live homepage therefore has an empty `<app-root>`. Category/tag routes and four trust/static pages also lack meaningful initial content.

Local remediation in this worktree:

- The physical homepage index contains one semantic creator-promise H1, explanatory copy, and direct links to the blog, gadget hub, drone hub, and YouTube channel.
- The initial loader is disabled in `noscript` mode so it cannot cover that content.
- Category, tag, topic, and public static Function responses contain escaped fallback content and matching `CollectionPage`, `ItemList`, or `WebPage` data.
- Dynamic Functions rendering replaces the physical homepage fallback rather than nesting or duplicating route headings.

These are local changes. They are not evidence of production behavior until the exact tested build and Functions renderer are deployed and re-crawled.

## Content and Authority Findings

The 81 sitemap-listed articles were fetched successfully:

- minimum 560 words;
- median 1,941 words;
- maximum 4,211 words;
- 53 articles contain at least 1,500 words;
- none contain fewer than 300 words.

The strongest trust signal is lived experience. Recovery stories, project screenshots, build details, and explicit research-versus-hands-on disclosures are specific and useful. The [HOVERAir AQUA guide](https://colinmichaels.com/blog/hoverair-aqua-waterproof-drone-clever-or-1299-overkill), for example, states that it is a researched pre-buy analysis rather than a hands-on review.

Authority and citation gaps:

- 42 articles include a Sources/References-style heading, but 33 of those have no clickable external source.
- 60 of 81 articles have no external source link.
- 80 of 81 initial article bodies contain no contextual link to another article; none link to a `/topics/` hub.
- 74 articles have a later `dateModified`, but readers usually see only the posted date.
- The author profile is structurally sound but provides limited verifiable career history, qualifications, independent citations, or third-party recognition.

Local remediation in this worktree: the shared public rich-text renderer now converts literal HTTP(S) source text into hardened outbound links without rewriting stored article content, and every genuinely matched article can show one deterministic public-topic continuation after the reading body. A separate inline **Continue this thread** card offers one article only when canonical taxonomy or tags overlap; the primary category dominates broad secondary labels, unrelated recent posts are excluded, the card is deduplicated from the right rail, and its selection reuses the bounded `related_reading` event. Functions initial HTML exposes the strongest matching topic continuation without an extra full-corpus Firestore read. Meaningful post revisions already display a separate Updated date. This removes the render-layer barrier for printed URLs and improves end-of-article discovery; it does not turn source names without URLs into citations, insert editorially explained links into stored article bodies, or re-score the undeployed production corpus.

The recurring `TLDR`, `Final Thought`, and similar closing structures are a moderate templating signal. They are not evidence of low-value scaled content, but future releases should vary structure and add original footage, measurements, screenshots, comparison tables, or field notes.

Local authority remediation in this worktree: an indexable `/editorial-standards` page now defines direct-experience, research-only, manufacturer-supplied, and synthetic-media boundaries; documents source, compensation, AI-assistance, high-stakes, and correction practices; and links the policy through crawler HTML, structured data, sitemap, internal search, author surfaces, footers, and `llms.txt`. The default Colin author graph also aligns YouTube, Instagram, GitHub, and LinkedIn through `Person.sameAs`. This creates transparent policy and entity evidence; it does not manufacture third-party recognition, credentials, backlinks, or compliance for legacy posts.

Local independent-authority preparation now records 50 current exact target pages across two machine-validated research cohorts. The Drones/FPV cohort has 10 release-gated ready rows, 5 relationship or rights decisions, and 10 holds. The new gadget/creator-tech cohort has 8 release-gated ready rows, 7 relationship or evidence decisions, and 10 holds. All 50 remain uncontacted. The gate prevents support-only, paid dofollow, commercial-listing, and self-publication routes from being presented as earned authority; live public asset checks, same-day route checks, editorial fit, and explicit authorization remain mandatory. Moz and Bing provider data are unavailable, and Common Crawl supplies too few scoring factors, so the backlink health result remains **INSUFFICIENT DATA** rather than a fabricated number.

Local corpus-remediation infrastructure in this worktree: an optional typed editorial object carries one reviewed evidence basis, its article-specific explanation, source-review date, relationship/AI/synthetic-media disclosures, and a substantive update note. A visible evidence card and matching crawler fallback expose reviewed values or an honest **Not yet classified** state. Explicit external source links become deduplicated `BlogPosting.citation` URLs in Angular and Functions; same-site links, media destinations, duplicates, and unsafe protocols are excluded. The protected editor and trusted publishing Function preserve and validate the contract without requiring a Firestore backfill. No live post was classified, rewritten, imported, or deployed, so the original corpus findings and scores remain the production baseline.

Local editorial-operations remediation in this worktree: protected CMS Posts now exposes a separate read-only **Discovery & trust review queue** alongside the evidence queue. It derives required review for unclassified/incomplete evidence and missing usable sources on source-dependent articles, then keeps missing contextual article links and supporting artifacts advisory. Published rows are filtered and sorted with required work first. The projection never mutates Firestore, changes status, assigns evidence, or turns an automatic continuation into editorial context; each actual change still requires opening and reviewing the individual post.

## Architecture and Index Quality

- Category and tag pages currently overlap heavily. “Cat Corner” duplicates “Cats & Pets”; “Health,” “Recovery,” and “Health & Recovery” divide one broader intent; the `Recovery` and `Personal Growth` tag routes overlap same-named category destinations. Consolidate only with an explicit redirect and migration-safe content plan.
- Five feed entries use relative article links in both RSS and JSON Feed. Normalize all published feed item URLs to canonical absolute URLs.
- `/blog/` returns `200` with canonical `/blog`; a redirect would make the slash contract clearer.
- CSP remains report-only and currently records Firebase Auth iframe violations. Do not enforce it until those legitimate flows are covered.
- Function-generated 404 pages should receive the same security-header baseline as Hosting responses.

Local feed remediation in this worktree: both feed formats now use one tested item-URL normalizer. Relative stored canonicals become absolute, valid HTTP(S) canonicals remain intact, and missing, malformed, or non-HTTP values fall back to the absolute `/blog/{slug}` route. Stored posts were not rewritten, and production feeds remain unchanged until the matching Functions release is explicitly approved and deployed.

Local response-header remediation in this worktree: `renderSeoHtml`, `sitemapXml`, `rssFeed`, and `jsonFeed` now apply the exact global Hosting policy before any request branch. Focused tests exercise all four wrapped Functions' early 405 responses and a generated static-asset 404, compare the complete policy with `firebase.json`, and prove no enforcing CSP header was added. CSP remains report-only, and production remains unchanged until the reviewed Functions release is approved and deployed.

Local Firebase Auth CSP remediation in this worktree: `frame-src` now adds only the current `https://colinmichaels.firebaseapp.com` helper origin and explicitly rejects a broad Firebase Hosting frame wildcard in regression coverage. CSP remains report-only pending authenticated Google/Facebook/email and embed verification on the exact deployed origins. A future switch to the custom `colinmichaels.com` Auth domain must be coordinated with provider authorized-domain and callback configuration rather than hidden in this code change.

Local trailing-slash remediation in this worktree: Firebase Hosting now permanently redirects only `/blog/` to `/blog` before the catch-all Function rewrite. The real local Hosting/Functions router returned one `301` hop and final `200`, left `/blog` at `200`, did not redirect an article path, preserved both feeds at `200`, and preserved a true unknown-route `404`. Two configuration contracts prevent broad `/blog/**` matching and a canonical `/blog` loop. Production remains unchanged until an approved Hosting deployment.

Local taxonomy remediation in this worktree: the five duplicate category/tag URLs now have exact permanent redirect contracts to `Cats & Pets`, `Health & Recovery`, or category-owned `Personal Growth`. Angular and Functions share mirrored canonical rules for links, archive membership, article metadata, related-post signals, sitemap/feed output, and crawler fallbacks. Posts that used only a legacy overlapping tag remain visible in the canonical category, aliases are counted once per post, and no Firestore content was rewritten. The complete inventory and rollback contract are in [TAXONOMY-CONSOLIDATION.md](./TAXONOMY-CONSOLIDATION.md).

Local title/description review in this worktree: the current 131-URL sitemap produced 26 unique length candidates. Twenty-three are articles already represented by stable-slug recommendations in the protected CMS optimization manifest; three are accurate author/topic pages whose small overages do not justify weaker copy. No metadata was imported or shortened solely to satisfy a character heuristic. See [TITLE-DESCRIPTION-REVIEW.md](./TITLE-DESCRIPTION-REVIEW.md).

## What Already Works

- All sitemap URLs were reachable and canonicalized in the audit crawl.
- Unknown public routes return a true `404` with `noindex,follow`.
- HTTPS, HSTS, content-type protection, referrer policy, frame protection, and a report-only CSP are present.
- Search, skip navigation, keyboard alternatives, target sizing, article typography, reactions, comments, continuation modules, and Daily Discovery give the publication a strong interaction foundation.
- First-person boundaries and sponsorship/testing disclosures are unusually clear for a personal publication.

## Measurement Limits

- Search Console and YouTube values in the creator-growth plan are low-volume, time-bound snapshots; no claim equates them with “real people.”
- No backlink-provider dataset was available.
- Field INP was not available because the performance API was rate-limited.
- No production write, CMS import, Hosting/Functions deployment, Google recrawl, analytics receipt, or YouTube change was performed during this audit.

The release order is defined in [ACTION-PLAN.md](./ACTION-PLAN.md).

## Local Validation Result

- `npm run build`: passed; production initial total 1.52 MB raw and 345.47 kB estimated transfer.
- `npm run lint`: passed.
- `npm run build:functions`: passed.
- `npm run prepare:functions-seo` and `npm run test:seo-shell`: passed for the source, built Hosting index, and prepared Functions shell.
- Focused reader-invitation, analytics, and topic identity contracts: 31/31 passed; focused Functions topic/fallback/header contracts: 15/15 passed.
- Latest complete Angular suite after the reader-invitation analytics and Functions topic-identity contract: 936/936 passed on supported Node.js 24.15.0.
- Focused topic/membership tests: 19/19 passed.
- Pure Functions hosting/feed/taxonomy/header/fallback/image tests: 22/22 passed through `npm --prefix functions run test:seo`.
- Complete Angular suite: 886/886 passed.
- Complete Angular suite: 880/880 passed with the compact reporter after stabilizing one homepage timing contract; all 23 focused homepage/hero contracts also passed.
- Clean anonymous mobile render at 390×844: no timed modal, no body scroll lock, all three inline invitation actions within one viewport, no relevant console warning/error, and dismissal preserved the reaction/related-reading flow.
- Stable homepage render: one evergreen H1, rotating article H2, immediate gadget/FPV/YouTube/About paths, no horizontal overflow, mobile CLS `0.0031`, and desktop CLS `0.0097` in local Chromium.
- `git diff --check`: passed.

No production behavior changed during this validation.
