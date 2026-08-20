# 90-Day Highest-Impact SEO Plan

## Summary

This plan starts with technical SEO fixes in July 2026, improves crawler-visible content and trust signals in August 2026, then moves into authority building and measurement in September 2026. The cadence is weekly sprints. No reminders or automations have been created yet; this document is the source schedule for later setup.

Primary domain: `https://colinmichaels.com`.

## Current Implementation Snapshot

Updated: August 15, 2026.

The cross-channel growth baseline, current editorial decision, measurable 90-day targets, and blog/YouTube operating cadence now live in `docs/SEO/CREATOR_GROWTH_OPERATING_SYSTEM.md`. That plan extends this technical SEO foundation without replacing completed route, sitemap, fallback-rendering, or topic-hub work.

Completed in code and documentation:

- August creator-growth refresh: sharper gadget/tech/internet-find homepage identity, YouTube/Instagram entity links, Captain Colin channel positioning, and privacy-bounded site-to-YouTube selection measurement.
- YouTube archive gateway: live-audited the `14,920`-view Hurricane Milton video and prepared a local accuracy-and-continuation package that preserves its earned URL/title, replaces the unsupported tornado claim, adds twelve evidenced chapters and official safety paths, rejects another synthetic thumbnail, and requires source-video frames before any image change. Review this package before channel-layout mutation; no live YouTube edit has occurred.
- YouTube archive gateway selection: scored the `55K` Hurricane Wilma clip, `6K` Stuart Inlet story, `2.7K` BetaFPV 95X flight, and `2,328`-view Ace Pro FPV test on evidence and continuation instead of views alone. Selected Ace Pro at `46/50`; its local package converts visible settings, stabilization, raw-footage, low-light, and weight questions into an honest field-test entry point with transcript-grounded chapters, a staged title test, related next watch, official references, and the Gadget Usefulness Scorecard path. No title, description, thumbnail, comment, playlist, card, end screen, or production surface changed.
- Ace Pro reciprocal article: created the missing canonical site destination as one zero-warning CMS draft with the exact public video, a mixed-evidence disclosure, direct answers to the audience's settings questions, three real in-body frames, separate cover/card/social crops, an eight-step controlled-retest checklist, official Insta360/FAA paths, and a non-sensitive test-priority poll. A read-only production preflight now records an unpublished `404`/`noindex,nofollow` route, zero public published-slug matches, sitemap exclusion, and the exact `OFeCTH2LP9s` Captain Colin oEmbed identity; protected import-time reservation remains required because anonymous direct-document reads are denied. The staged YouTube link remains gated behind editorial approval, authenticated Production Preview, publication, and exact public `200`/canonical verification; no CMS import or external mutation occurred.
- Release sequencing: scored all eight evidence-ready packages on one 50-point audience/evidence/promise/readiness/continuation/utility/risk model and separated score rank from release order. Ace Pro is the strongest new flagship at `47/50`; the first operational action is the existing Temu stable-ID refresh because it repairs the clearest measured site/search leak, followed by Ace Pro and the non-drone Laundry Chair audience-expansion test. A live preflight found that HOVERAir AQUA already has a complete indexed article under a different canonical, so its staged package is consolidation-only. Repository gates confirm package coverage, score math, duplicate-topic handling, Temu public identity preservation, activation gates, measurement windows, and zero external actions.
- BetaFPV reciprocal continuation: converted the selected Ace Pro next watch into a second zero-warning Captain Colin Flies draft using Colin's own public ISO 100, automatic-settings, Log/DaVinci, 450mAh 4S, windy 2.5-3-minute, and VelociDrone answers. The package distinguishes the cinematic flight from a controlled review, range test, waterproofing claim, complete build record, and retrospective legal verdict; adds current official BETAFPV/FAA context, nine retest steps, a poll, disclosed editorial illustrations, and a separately measurable YouTube title/description/comment draft with no invented chapters. It remains entirely local.
- Editorial runway: four complete local practical-curiosity article/video packages now cover a waterproof follow-drone, current passenger-aircraft purchase evidence, the Unitree R1's $4,900 tier-versus-developer-feature catch, and Simone Giertz's $1,100 Laundry Chair preorder. The Laundry Chair package adds a non-drone, non-AI **One Annoying Problem, One Useful Fix** subject with a dated preorder boundary, cheaper-alternative test, six original assets, and a complete companion-video rollout. The staged records remain drafts pending editorial review and explicit publication approval; the HOVERAir topic itself already has a live article, so that draft must be merged into the live record or retired rather than published separately.
- High-opportunity page refresh: audited the live Temu mega-drone article, prepared a stable-ID title/description/content update with two inline editorial images and clearer evidence/regulatory framing, and added intrinsic image dimensions plus fetch priority to the crawler fallback. The package remains local and requires a fresh production-state check and explicit import approval.
- Fresh demand decision: the July 18-August 14 GA4 table now shows the Temu story leading with `159` views and `142` active users versus the homepage's `138` views and `57` active users, so its reviewed stable-ID refresh is staged as `featured: true` for the existing automatic homepage policy.
- Channel consolidation history: a signed-in Studio recheck exposed a separate eight-subscriber **Colin Michaels** channel alongside the established Captain Colin archive. The owner subsequently selected Colin Michaels as the primary general-creator channel; Captain Colin remains intentionally limited to FPV/drone work. No redirect, duplicate upload, or cross-post is authorized by that decision.
- Trust authority: added a crawlable `/editorial-standards` page with explicit experience, research, source, synthetic-media, relationship, AI-assistance, high-stakes, and correction boundaries; linked it from author and reader journeys; aligned `Person.sameAs` with Colin's four canonical public profiles; and kept the change additive and migration-free.
- Corpus operations: added a protected read-only Discovery & trust queue that makes the audit's missing-source, contextual-continuation, supporting-artifact, and evidence-adoption work filterable and published-first without bulk content writes or inferred claims.

- Week 1 route classification and soft-404 behavior.
- Week 2 sitemap pruning with taxonomy thresholds.
- Week 3 regression specs for route order and metadata threshold policy.
- Week 4 local build documentation and architecture/changelog updates.
- Week 5 server-rendered blog and article fallback content.
- Week 6 priority topic hubs and homepage internal links.
- Week 7 author/trust improvements and health-content disclaimers.
- Week 9 first-pass linkable public assets on each topic hub.
- Week 10 outreach/prospecting operating document and 48-prospect seed list.

Validated locally:

- `npm --prefix functions run build` passed.
- `npm run build` passed with a `1.52 MB` raw / `345.42 kB` estimated-transfer initial bundle and no Angular optimization warnings on August 15, 2026.
- Focused SEO, Functions, and content-package validation passed, including the Unitree and Laundry Chair imports with zero warnings.
- Full `npm run lint` passed on August 15, 2026.

Still pending outside local code:

- Deploy and run live-style `curl` checks against production URLs.
- Run Lighthouse/PageSpeed checks on representative pages.
- Inspect representative URLs in Search Console.
- Expand the named prospect list from 12 to 25-40 qualified prospects per pillar and begin personalized outreach.
- Review Search Console performance after deployment and iterate titles, descriptions, and internal links.

## Month 1: Technical Foundation, July 2026

### Week 1, Jul 6-12: Route Classification And Soft 404s

- Unknown routes return HTTP `404` with `noindex,follow`.
- Missing published blog posts return HTTP `404` with missing-post metadata.
- Valid OS routes such as `/login`, `/boot`, `/sleep`, `/os`, and `/os/:app` stay valid but emit `noindex,nofollow` metadata unless promoted later.
- Admin and profile-style protected routes remain `noindex,nofollow`.

Implementation status:

- Done in `functions/src/index.ts` through explicit route classification.
- Client missing-post metadata remains `noindex,nofollow` for hydrated Angular states.

### Week 2, Jul 13-19: Sitemap Bloat Pruning

- Keep static pages, topic hubs, published posts, and high-value taxonomy pages.
- Include category/subcategory URLs only when they have at least `2` published posts.
- Include tag URLs only when they have at least `3` published posts.
- Low-count taxonomy pages stay accessible but emit `noindex,follow`.
- Log when sitemap URL count exceeds the review threshold so taxonomy growth gets noticed early.

Implementation status:

- Done in `functions/src/index.ts` for sitemap generation.
- Mirrored in `src/app/shared/seo/seo.metadata.ts` and blog category/tag pages for client-rendered metadata.

### Week 3, Jul 20-26: SEO Regression Coverage

- Test route order for public/blog/topic/lab/admin/OS boundaries.
- Test category and tag robots thresholds.
- Test missing-blog-post noindex metadata.
- Keep build-level coverage over server SEO rendering with the Functions TypeScript build.

Implementation status:

- Added route and metadata specs.
- Future extraction target: move pure Functions SEO policy helpers out of `functions/src/index.ts` for direct unit coverage of status codes and sitemap XML.

### Week 4, Jul 27-Aug 2: Validate And Document

- Run `npm run build`.
- Run `npm run lint`.
- Run `npm --prefix functions run build`.
- After deployment, verify with live-style checks:
  - `curl -I https://colinmichaels.com/nonexistent-seo-test`
  - `curl -I https://colinmichaels.com/blog/missing-slug`
  - `curl -s https://colinmichaels.com/blog | grep "/blog/"`
  - `curl -s https://colinmichaels.com/sitemap.xml`
- Update changelog and architecture/service docs.

Implementation status:

- This document plus architecture and changelog updates cover the documentation requirement.
- Local validation results are recorded in the current implementation snapshot above.
- Production `curl`, Lighthouse/PageSpeed, and Search Console checks remain pending until deployment.

## Month 2: Crawler-Visible Content And Trust, August 2026

### Week 5, Aug 3-9: Server-Rendered Blog Fallback Content

- For `/blog`, inject crawlable article links, dates, and summaries into the initial HTML shell.
- For `/blog/:slug`, inject semantic article fallback with title, date, author, excerpt, category/tag links, cover image, and sanitized body blocks.
- Fallback content must match the visible Angular content and must not be hidden, cloaked, or keyword-stuffed.

Implementation status:

- Done in `functions/src/index.ts` with visible fallback shells inside `<app-root>`.

### Week 6, Aug 10-16: Priority Topic Hubs

- Add indexable hub pages for:
  - AI setup guides
  - Recovery and medical planning resources
  - Angular and Firebase architecture notes
  - Labs and project demos
- Link hubs from the homepage and include them in the sitemap.
- Each hub links back to related posts, tags, categories, labs, or resource paths.

Implementation status:

- Added route-backed topic hubs under `src/app/features/topics`.
- Added homepage "Topic guides" internal links.
- Added sitemap entries through the Functions SEO renderer.

### Week 7, Aug 17-23: E-E-A-T And Trust Signals

- Strengthen the author bio/profile with experience, topic scope, and external profiles.
- Add clear disclaimers and authoritative framing to health/recovery and medical-planning content.
- Rename language that sounds like formal medical advice into personal experience and resource framing.

Implementation status:

- Expanded `COLIN_AUTHOR_PROFILE` with writing focus and external profiles.
- Added health/recovery disclaimers to homepage sections and article pages that match health-related taxonomy.
- Renamed the homepage medical section from formal advice language to patient-perspective resource language.

### Week 8, Aug 24-30: Rendered Content Validation

- `curl` article pages and confirm body text appears before JavaScript execution.
- Run Lighthouse/PageSpeed checks on homepage, blog index, one article, and one hub.
- Confirm Search Console can inspect representative URLs.

Implementation status:

- Local code supports the checks. Search Console validation requires deployed URLs and account access.

## Month 3: Authority, Links, And Measurement, September 2026

### Week 9, Aug 31-Sep 6: Outreach Assets

- Create one linkable asset per pillar:
  - AI setup checklist
  - Recovery/emergency planning checklist
  - Angular/Firebase architecture note
  - Labs/demo showcase
- Add internal links from each asset to relevant posts and hub pages.

Implementation status:

- Public topic hubs now include fuller linkable asset sections:
  - `/topics/ai-setup`
  - `/topics/recovery-planning`
  - `/topics/angular-firebase-architecture`
  - `/topics/labs-projects`
- Firebase SEO fallback content now exposes the same asset summaries before JavaScript runs.
- The Drones & FPV lane now includes the first full printable artifact at `/downloads/captain-colin-drone-flight-field-notes.pdf`. The source-controlled builder produces one US Letter field sheet, the hydrated hub treats it as a same-origin download, and Functions fallback HTML exposes the same download plus official FAA recreational-flyer and airspace references.
- The Temu/passenger-aircraft cluster now has a source-controlled printable at `/downloads/captain-colin-personal-aircraft-buyer-verification.pdf` and a substantive landing page at `/resources/personal-aircraft-buyer-verification`. The two-page PDF organizes seller identity, deposits, exact configuration, legal-category claims, operating reality, support, and evidence; the crawlable guide adds current official starting points and descriptive article/topic continuations. Both related CMS packages and the hub link the guide, Angular and Functions share its canonical identity, sitemap/search/`llms.txt` expose it, and PDF choices emit a privacy-bounded `resource_page` selection event.
- The Gadgets & Toys lane now has a source-controlled one-page scorecard at `/downloads/captain-colin-gadget-usefulness-scorecard.pdf` and a substantive landing page at `/resources/gadget-usefulness-scorecard`. The framework connects the hub, HOVERAir AQUA, Unitree R1, Laundry Chair, and their staged Captain Colin descriptions around the same evidence-led verdict loop; the route has matching Angular/Functions content, sitemap/search/`llms.txt` discovery, and bounded `resource_page` download measurement.
- Longer downloadable assets for the remaining broad legacy topics stay optional; gadgets and drone/FPV resources are the active outreach priorities.

### Week 10, Sep 7-13: Prospect Lists

- Collect 25-40 relevant prospects per pillar.
- Prospect types:
  - newsletters
  - resource pages
  - community roundups
  - patient/caregiver resources
  - developer showcases
  - GitHub or project pages
- Exclude paid link placements, low-quality directories, irrelevant forums, and automated link farms.

Implementation status:

- Outreach/prospecting operating doc created at `docs/SEO/LINK_BUILDING_OUTREACH.md`.
- The July seed collection of `48` candidates is retained as legacy research, but its four broad pillars no longer lead outreach.
- The active queue now contains `25` qualified drone/FPV target pages for the printable field sheet and Drones hub plus `25` gadget/creator-tech target pages for the scorecard and flagship series.
- The two exact-page cohorts total `18` release-gated ready rows, `12` relationship, rights, reporting, or evidence decisions, `20` holds, and `0` contacted. Paid dofollow placement, commercial product listing, and self-publication remain holds rather than authority wins.
- Every prospect still requires exact-page fit, current contact-path review, and live verification of both the landing page and supporting asset before outreach.

### Week 11, Sep 14-20: Outreach

- Send personalized pitches for the strongest assets.
- Ask for editorial inclusion only where the resource genuinely helps the target audience.
- Do not request exact-match anchor text.
- Do not use paid, exchanged, or automated backlink tactics.
- Sponsored placements, if ever used, must use `rel="sponsored"` or `nofollow`.

Implementation status:

- Outreach templates and guardrails are documented in `docs/SEO/LINK_BUILDING_OUTREACH.md`.
- Sending outreach remains pending until the relevant public landing/PDF URLs are verified, each current route is rechecked, the exact ready rows are approved, and personalized pitches are authorized.

### Week 12, Sep 21-27: Measure And Iterate

- Review Search Console:
  - indexed pages
  - impressions
  - clicks
  - queries
  - CTR
  - page experience
  - sitemap status
- Identify pages with impressions but weak CTR for title/description refinement.
- Identify pages with links or impressions that should receive stronger internal linking.

Implementation status:

- Not started. Requires deployed code and Search Console access.

## Interfaces And Behavior Changes

- SEO rendering changes from homepage fallback metadata for unknown paths to explicit route classification.
- Sitemap output is policy-driven:
  - categories/subcategories are indexable at `>= 2` published posts.
  - tags are indexable at `>= 3` published posts.
- Taxonomy pages below threshold remain navigable but emit `noindex,follow`.
- Blog/index HTML responses include non-hidden, sanitized fallback content for crawlers and no-JS users.
- Topic hubs are first-class public routes under `/topics/:slug`.
- Health content is framed as personal experience and resource sharing, not medical advice.

## Test Plan

- Unit tests:
  - route order for public/topic/lab/admin/OS boundaries
  - category robots threshold
  - tag robots threshold
  - missing-blog-post robots metadata
- Build-level checks:
  - `npm --prefix functions run build`
  - `npm run build`
  - `npm run lint`
- Deployment checks:
  - `/nonexistent-seo-test` returns `404`.
  - `/blog/missing-slug` returns `404`.
  - `/login`, `/boot`, `/sleep`, `/os`, and `/os/:app` return `200` with `noindex,nofollow`.
  - `/blog` returns indexable metadata and article links in initial HTML.
  - `/blog/:slug` returns article metadata and body fallback in initial HTML.
  - `/sitemap.xml` excludes low-count tag and category pages.

## Monthly Implementation Schedule

- July 2026:
  technical route behavior, sitemap policy, regression coverage, build/lint validation, documentation.
- August 2026:
  visible fallback content, topic hubs, internal links, author/trust improvements, health-content framing.
- September 2026:
  linkable assets, prospect list building, editorial outreach, Search Console measurement, CTR and internal-linking iteration.

## Next Execution Queue

1. Use `docs/CONTENT_PACKAGES/RELEASE_RUNWAY.md` for final source, voice, imagery, rights, and duplicate-topic review. The first operational sequence is the Temu stable-ID refresh, the Ace Pro reciprocal article/video loop, and the Laundry Chair audience-expansion test; stop or reorder only with newly recorded evidence. Treat HOVERAir AQUA as an existing-live-record consolidation, never a second URL.
2. Deploy the SEO changes.
3. Run the live-style checks listed in the test plan.
4. Publish only the approved article first, verify its public URL, and then add that canonical URL to the companion YouTube package.
5. Deploy and verify `/topics/drones-fpv`, `/topics/gadgets-toys`, both crawlable resource pages, and all three supporting PDFs before using any worksheet in outreach.
6. Review both validated 25-page research cohorts. Drone/FPV has 10 ready after the public release gate, 5 relationship or rights decisions, and 10 holds; gadget/creator-tech has 8 ready after the public release gate, 7 relationship or evidence decisions, and 10 holds. All 50 remain uncontacted. Expand either cohort only with pages that clear the same exact-page, contact-route, evidence, and earned-authority standard; treat the 48 July prospects as legacy research unless deliberately requalified.
7. After explicit authorization, prepare personalized pitches only for approved ready rows where the live asset genuinely helps that audience; preserve relationship, rights, and hold blockers instead of treating them as volume targets.
8. Review Search Console after indexing and update titles, descriptions, and internal links for pages with impressions but weak CTR.
