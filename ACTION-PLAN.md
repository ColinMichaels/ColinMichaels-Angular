# SEO Action Plan: colinmichaels.com

## Implementation Status

Started on July 03, 2026:

- Completed homepage and `/labs` server-rendered fallback HTML in the Firebase SEO renderer.
- Completed baseline security headers in Firebase Hosting with CSP in report-only mode.
- Completed `/llms.txt`.
- Completed homepage meta description tightening and homepage ProfilePage/WebPage JSON-LD enrichment.
- Completed sitemap cleanup to remove `changefreq` and `priority`.
- Started CMS metadata guardrails by tightening title/description checklist warnings.
- Started mobile fixed-social-bar mitigation with extra homepage bottom padding.

## Critical

1. Add homepage fallback HTML in `renderSeoHtml`.
  - Include one H1, a concise 134-167 word answer-first profile summary, links to Blog/Labs/Topics, and visible author/profile trust signals.
  - Target files: `functions/src/index.ts` and, if needed, shared SEO metadata helpers.

2. Add `/labs` fallback HTML.
  - Include an H1, short project/lab descriptions, durable links, and language that reinforces experiments are isolated from production page logic.
  - Target files: `functions/src/index.ts`, labs route metadata if needed.

3. Add baseline security headers.
  - Add `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and a report-only CSP first.
  - Target file: `firebase.json`.

4. Add `/llms.txt`.
  - Summarize the site, author, topic hubs, best blog guides, project/labs areas, feeds, and preferred citation URLs.
  - Target file: `public/llms.txt`.

## High

5. Tighten long titles and meta descriptions.
  - 6 title tags exceed 60 characters; 18 meta descriptions exceed 160 characters.
  - Add CMS checklist warnings for `seoTitle` and `seoDescription` lengths.
  - Target files: CMS SEO checklist utilities and blog post metadata handling.

6. Shorten the homepage meta description.
  - Current description is 193 characters.
  - Keep the positioning but aim for 150-160 characters.

7. Enrich homepage schema.
  - Add WebPage or ProfilePage connected to existing Person/WebSite graph.
  - Avoid Organization unless there is a real business entity to represent.

## Medium

8. Remove low-value sitemap `changefreq` and `priority` tags.
  - Keep accurate `lastmod`.
  - Target file: `functions/src/index.ts`.

9. Add mobile bottom spacing for fixed social/navigation controls.
  - Verify 390px-wide viewport does not obscure card titles or CTAs.

10. Improve topic-hub extractability.
  - Add short answer-first blocks to topic hubs and consider FAQ-style H2s where natural.

## Low

11. Consider IndexNow only if Bing/Yandex fast discovery becomes important.

12. Add PageSpeed/CrUX/GSC credentials for future audits.
  - This would replace heuristic performance and indexation estimates with field data.

## Validation Checklist

- Run `npm run build`.
- Run `npm run lint`.
- Verify live/raw HTML for `/`, `/labs`, `/blog`, one topic hub, and one blog post.
- Verify `robots.txt`, `/sitemap.xml`, `/llms.txt`, `/feed.xml`, and `/feed.json`.
- Re-run SEO audit scripts for technical, content, schema, sitemap, performance, GEO, and images.
- Re-capture desktop/tablet/mobile screenshots.
