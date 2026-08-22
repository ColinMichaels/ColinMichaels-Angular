# Full SEO Audit Report: colinmichaels.com

> Historical baseline: this report records the July 3, 2026 audit evidence and scores. Several findings below have since been resolved. See the [August 2026 audit](docs/SEO/AUDITS/2026-08-15/FULL-AUDIT-REPORT.md), its [current action plan](docs/SEO/AUDITS/2026-08-15/ACTION-PLAN.md), and the [project roadmap](docs/FUTURE_FEATURES/ROADMAP.md); do not treat the original issue list as the live backlog.

- **Audit date:** July 03, 2026
- **Homepage:** https://colinmichaels.com/
- **Business type detected:** personal portfolio, blog, and project/labs site
- **Industry/theme:** software development, Angular/Firebase architecture, AI workflow guides, personal recovery writing, project demos
- **Language / country:** en / US
- **SEO Health Score:** **61/100** after manual verification
- **Automated baseline score:** 53/100 from the deterministic SEO runner

## Executive Summary

colinmichaels.com has a strong SEO foundation: HTTPS is working, `www` redirects to the canonical root, robots.txt is open, the sitemap is discoverable, all 74 unique sitemap URLs checked returned `200`, the blog and topic pages expose meaningful crawler-visible fallback HTML, structured data is present, and heuristic performance is good.

The main weakness is not classic indexability. It is **extractable, server-rendered content on key shell pages**, especially the homepage and `/labs`. In raw HTML, both pages return metadata but an empty `<app-root>`, so non-JS crawlers and AI extraction tools see almost no visible copy. Google can render JavaScript, but this still weakens AI search readiness, no-script resilience, and confidence for lightweight crawlers.

The generated sitemap report flagged 73 canonical mismatches to `/feed.json`; manual raw HTML checks on `/blog`, `/labs`, `/topics/ai-setup`, and a representative blog post confirmed this is a parser false positive. The live canonical tags are self-referential on those sampled URLs.

## Score Breakdown

| Category                 | Score | Notes                                                                                                                |
|--------------------------|------:|----------------------------------------------------------------------------------------------------------------------|
| Technical SEO            |    83 | Strong crawlability and redirects; missing security headers and JS-content exposure gap.                             |
| Content Quality          |    32 | Automated score was 9 because homepage raw HTML has almost no visible body text; blog posts themselves are stronger. |
| On-Page SEO              |    58 | Metadata exists; 6 long titles and 18 long descriptions should be tightened.                                         |
| Schema / Structured Data |    84 | Person, WebSite, BlogPosting, and CollectionPage detected; add WebPage and richer profile graph.                     |
| Performance              |    89 | Heuristic CWV: LCP 1.83s, INP 158ms, CLS 0.030; field/PageSpeed data unavailable.                                    |
| AI Search Readiness      |    23 | AI crawlers allowed, but no `llms.txt` and weak answer-first homepage content.                                       |
| Images                   |   100 | No homepage raw HTML image issues; rendered cards look visually strong.                                              |
| Visual / UX              |    78 | Rendered homepage is responsive; mobile bottom social bar may overlap card content near viewport bottom.             |

## Evidence Gathered

- Live homepage fetch returned `200` with HTTPS and HSTS.
- `https://www.colinmichaels.com` redirects to `https://colinmichaels.com/`.
- robots.txt allows crawling and references `https://colinmichaels.com/sitemap.xml`.
- Sitemap contains 74 unique live URLs; all checked URLs returned `200`.
- Raw HTML samples verified correct canonicals:
  - `/blog` -> `https://colinmichaels.com/blog`
  - `/labs` -> `https://colinmichaels.com/labs`
  - `/topics/ai-setup` -> `https://colinmichaels.com/topics/ai-setup`
  - `/blog/how-to-set-up-chatgpt-for-better-ai-chats` -> matching post URL
- Raw HTML fallback word counts:
  - Homepage: 0 words inside `<app-root>`
  - `/labs`: 0 words inside `<app-root>`
  - `/blog`: 454 words inside `<app-root>`
  - `/topics/ai-setup`: 141 words inside `<app-root>`
  - Representative blog post: 3,224 words inside `<app-root>`
- Screenshots captured:
  - `screenshots/colinmichaels-home-desktop.png`
  - `screenshots/colinmichaels-home-tablet.png`
  - `screenshots/colinmichaels-home-mobile.png`

## Critical Issues

### 1. Homepage Raw HTML Has No Visible Body Content

The homepage has good title, description, canonical, Open Graph tags, and Person/WebSite JSON-LD, but raw HTML exposes an empty `<app-root>`. This makes the homepage look thin to non-JS crawlers and weakens AI-search citability.

**Impact:** AI search readiness, content quality scoring, lightweight crawler confidence, no-JS resilience.

**Recommended fix:** Add server-rendered fallback HTML for the homepage in the Firebase SEO renderer, similar to the blog and topic fallback paths. Include one H1, two or three H2 sections, a short author/profile block, links to blog/labs/topics, and a concise answer-first summary.

### 2. `/labs` Raw HTML Also Has Empty `<app-root>`

The rendered `/labs` route looks fine in the browser and has correct metadata, but the raw HTML has no headings or text.

**Impact:** Project/lab discovery, AI extraction, crawler understanding of experimental systems.

**Recommended fix:** Add a `/labs` fallback renderer with an H1, summary, durable project links, and short descriptions of the Core OS/labs boundary.

### 3. Missing Security Headers

Only HSTS was detected. Missing baseline headers include:

- `content-security-policy`
- `x-frame-options`
- `x-content-type-options`
- `referrer-policy`

**Impact:** Security posture and best-practice scoring.

**Recommended fix:** Add conservative headers in Firebase Hosting. Start with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a report-only CSP before enforcing.

### 4. AI Search Readiness Is Underdeveloped

AI crawlers are allowed, and structured data exists, but no `/llms.txt` was detected and the homepage lacks self-contained answer blocks.

**Impact:** ChatGPT Search, Perplexity, Bing Copilot, and Google AI Overview extraction readiness.

**Recommended fix:** Add `/llms.txt`, answer-first homepage sections, clear author/date signals, and concise summaries for topic hubs.

## High-Priority Issues

### 5. Long Titles and Descriptions

The crawl found:

- 6 URLs with title tags longer than 60 characters.
- 18 URL instances with meta descriptions longer than 160 characters.

Example long-title URLs include:

- `/blog/digital-hoarding-when-saving-everything-means-finding-nothing`
- `/blog/weekly-recovery-update-still-healing-still-working-still-a-big-kid`
- `/blog/florida-medical-planning-guide`
- `/blog/medical-disaster-checklist-10-things-every-adult-should-have`
- `/blog/new-design-branch-update-blog-cms-media-library-labs`
- `/blog/from-staph-infection-to-open-heart-surgery-2`

**Recommended fix:** Add CMS validation or checklist warnings for SERP title and description lengths. Prefer concise `seoTitle` and `seoDescription` fields while preserving expressive article H1s.

### 6. Homepage Description Is Too Long

The homepage meta description is 193 characters. It may truncate in SERPs.

**Recommended fix:** Shorten to roughly 150-160 characters while keeping the portfolio/blog/recovery/project positioning.

### 7. Schema Could Be Richer

Detected homepage schema is Person and WebSite. The schema analyzer recommends WebPage and Organization; for a personal site, `ProfilePage` or `WebPage` connected to the existing Person is likely a better fit than generic Organization unless there is a business entity to represent.

**Recommended fix:** Add a WebPage/ProfilePage node for the homepage and connect it to `#person` and `#website` with `mainEntity`, `isPartOf`, and `publisher`.

## Medium-Priority Issues

### 8. Sitemap Uses `changefreq` and `priority`

The sitemap includes deprecated or low-value `changefreq` and `priority` tags for all 74 URLs.

**Impact:** Low. Search engines largely ignore these.

**Recommended fix:** Keep `loc` and accurate `lastmod`; remove `changefreq` and `priority` unless there is a deliberate legacy reason.

### 9. Mobile Bottom Overlay May Obscure Content

The mobile screenshot shows the fixed bottom social/action bar sitting over the first blog card near the viewport bottom.

**Recommended fix:** Add bottom padding/safe-area spacing for mobile content when the fixed bar is present, and verify scroll positions on 390px-wide screens.

### 10. Visual Helper Timed Out on Network Idle

The bundled visual helper timed out waiting for `networkidle`, but a custom Playwright pass using `domcontentloaded` captured desktop/tablet/mobile screenshots successfully with visible H1s.

**Recommended fix:** For future audits, use DOM-ready plus short settle waits on pages with analytics or long-lived network activity.

## Positive Findings

- HTTPS works and HSTS is present.
- `www` redirects to the canonical non-www root.
- robots.txt allows crawling and includes the sitemap location.
- All checked sitemap URLs returned `200`.
- Blog index and blog posts expose substantial fallback HTML.
- Blog posts include BlogPosting JSON-LD.
- Topic hubs expose fallback HTML and CollectionPage JSON-LD.
- Open Graph and Twitter card metadata are present.
- Heuristic performance is strong: LCP 1.83s, INP 158ms, CLS 0.030.
- Rendered homepage is visually polished on desktop and mobile.

## Tool Limitations

- Google/PageSpeed/CrUX/GSC/GA4 credentials were not configured, so performance and indexation use heuristic/live-fetch data rather than Google field data.
- Moz/Bing backlink credentials were not configured; only basic backlink readiness was checked.
- The automated sitemap canonical mismatch finding was manually rejected as a parser false positive after raw HTML verification.
- The bundled screenshot helper hung on `networkidle`; screenshots were captured with a custom Playwright DOM-ready script instead.
- DataForSEO was not used.

## Raw Artifact Locations

- Deterministic runner output: `colinmichaels-com-audit-20260703-150233/`
- Corrected report: `FULL-AUDIT-REPORT.md`
- Corrected action plan: `ACTION-PLAN.md`
- Screenshots: `screenshots/`
- Shared cache summary: `.seo-cache/site-meta.json`, `.seo-cache/audit-scores.json`
