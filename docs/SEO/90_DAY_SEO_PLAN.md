# 90-Day Highest-Impact SEO Plan

## Summary

This plan starts with technical SEO fixes in July 2026, improves crawler-visible content and trust signals in August 2026, then moves into authority building and measurement in September 2026. The cadence is weekly sprints. No reminders or automations have been created yet; this document is the source schedule for later setup.

Primary domain: `https://colinmichaels.com`.

## Current Implementation Snapshot

Updated: July 2, 2026.

Completed in code and documentation:

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
- `npm run build` passed with existing bundle/CommonJS warnings.
- Focused SEO specs passed.
- Changed-file lint passed.
- Full `npm run lint` still fails with `262` existing game/OS/Firebase and accessibility errors (`0` warnings), reconfirmed under Node `24.15.0` on July 13, 2026.

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
- Longer downloadable or printable assets remain optional future content work.

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
- Seed prospect collection started with `48` researched candidates: `12` per pillar.
- Remaining target: expand each pillar from `12` candidates to `25-40` qualified prospects after deployment checks confirm the target assets are live.

### Week 11, Sep 14-20: Outreach

- Send personalized pitches for the strongest assets.
- Ask for editorial inclusion only where the resource genuinely helps the target audience.
- Do not request exact-match anchor text.
- Do not use paid, exchanged, or automated backlink tactics.
- Sponsored placements, if ever used, must use `rel="sponsored"` or `nofollow`.

Implementation status:

- Outreach templates and guardrails are documented in `docs/SEO/LINK_BUILDING_OUTREACH.md`.
- Sending outreach remains pending until named prospects are collected and live URLs are verified.

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

1. Deploy the SEO changes.
2. Run the live-style checks listed in the test plan.
3. Recheck contact paths and fit for the 48 seed prospects in `docs/SEO/LINK_BUILDING_OUTREACH.md`.
4. Expand the prospect tracker to 25-40 qualified prospects per pillar.
5. Send personalized pitches only where the live asset genuinely helps that audience.
6. Review Search Console after indexing and update titles, descriptions, and internal links for pages with impressions but weak CTR.
