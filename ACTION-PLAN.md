# SEO Action Plan: colinmichaels.com

## Current Status

Updated July 19, 2026. The July 3 audit recommendations and deterministic July 19 article-report fixes are closed in
local code unless listed under Remaining Work.

## Completed

1. Added crawler-visible homepage fallback HTML with identity, trust, blog, and topic links.
2. Resolved the later `/labs` product decision: Labs code remains preserved, while Hosting and Angular temporarily redirect `/labs` to `/blog`; the server fallback and sitemap no longer advertise the paused route, and `/topics/labs-projects` is the public discovery surface.
3. Added `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and report-only CSP headers in Firebase Hosting.
4. Added and subsequently proposal-aligned `/llms.txt` with canonical public destinations.
5. Added CMS title and description length warnings while keeping article display titles independent from SEO overrides.
6. Shortened the homepage description to the intended search-snippet range.
7. Connected homepage ProfilePage/WebPage structured data to the existing Person and WebSite graph.
8. Removed sitemap `changefreq` and `priority` output while retaining meaningful `lastmod` values.
9. Added mobile bottom/safe-area spacing for fixed public controls.
10. Expanded topic hubs with answer-first summaries, linkable guide sections, public post discovery, and crawler-visible fallback content.
11. Aligned `BlogPosting.url` and `mainEntityOfPage` with route-derived article canonicals in both browser and server rendering.
12. Added non-empty crawler-fallback alt text for legacy image blocks that do not store image-specific alternatives.
13. Raised indexable taxonomy thresholds to three category posts and five tag posts while preserving low-count routes as `noindex,follow`.
14. Added a metadata-only 26-post CMS optimization manifest from the July 19 report without changing slugs, display titles, body content, or taxonomy.

## Remaining Work

1. Deploy the latest Hosting and Functions route policy, then verify `/labs` returns the temporary redirect and is absent from `/sitemap.xml`.
2. Review `docs/SEO/SEO_PERFORMANCE_2026_07_19_OPTIMIZATION_MANIFEST.json` in Bulk Post Editor and apply approved SEO title/description changes through the canonical CMS workflow; the Bulk Editor remains intentionally dry-run only.
3. Replace generic legacy image fallbacks with image-specific stored alt text when the source image can be identified confidently.
4. Consolidate near-duplicate taxonomy labels in CMS content only after redirect/canonical review; the higher thresholds reduce crawl exposure without silently renaming routes.
5. Run live/raw HTML checks for `/`, `/blog`, one topic hub, and one blog post after deployment.
6. Run Lighthouse/PageSpeed and inspect representative URLs in Search Console; field and indexation conclusions require the relevant account access.
7. Connect Search Console and GA4 landing-page exports before interpreting clicks, impressions, CTR, rankings, sessions, engagement, or conversions.
8. Re-crawl titles and descriptions after deployment and refine pages that still show truncation or weak click-through rate.
9. Consider IndexNow only if Bing/Yandex discovery becomes an operational priority.
10. Continue the separate outreach and measurement queue in `docs/SEO/90_DAY_SEO_PLAN.md` after the target assets are live.

## Validation Checklist

- Run `npm run build`.
- Run `npm run lint`.
- Verify live/raw HTML for `/`, `/blog`, one topic hub, and one blog post; verify `/labs` returns the temporary redirect without a crawler fallback page.
- Verify `robots.txt`, `/sitemap.xml`, `/llms.txt`, `/feed.xml`, and `/feed.json`.
- Re-run SEO audit scripts for technical, content, schema, sitemap, performance, GEO, and images.
- Re-capture desktop/tablet/mobile screenshots.
