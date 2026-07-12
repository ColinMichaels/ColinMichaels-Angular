# Focused AI Search and `llms.txt` Analysis

Reviewed: July 12, 2026.

## Scope and Sources

This is a focused implementation review of `llms.txt`, crawler access, and delivery for `https://colinmichaels.com/`; it is not a measurement of rankings or citation share. The review used the repository, the live `/llms.txt` response, cached site context from July 3, and current primary guidance:

- [The llms.txt proposal](https://llmstxt.org/)
- [Google's generative AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [OpenAI publisher and developer guidance](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity crawler guidance](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Robots Exclusion Protocol, RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)

## 1. GEO Readiness Score: 82/100

This score describes technical readiness for discovery and extraction, not whether an AI product will cite the site. The site has crawlable public HTML, canonical discovery files, structured identity data, permissive crawler access, and a correctly delivered `llms.txt`. The remaining uncertainty is external: no supported vendor documents automatic consumption of arbitrary sites' `llms.txt`, and this review did not measure citations or off-site brand mentions.

## 2. Platform Breakdown

| Platform | Technical readiness | Basis |
| --- | ---: | --- |
| Google AI Overviews / AI Mode | 84/100 | Crawlable HTML, sitemap, canonical metadata, and structured data are present. Google explicitly says it does not use `llms.txt`, so the file adds no Google ranking benefit. |
| ChatGPT Search | 83/100 | `OAI-SearchBot` is allowed by the site's wildcard `robots.txt` rule and public pages have crawler-visible fallbacks. OpenAI documents `robots.txt`, not `llms.txt`, as the eligibility control. |
| Perplexity | 83/100 | `PerplexityBot` is allowed and the same public HTML is available. Perplexity publishes its own `llms.txt`, but does not document automatic use of third-party files. |

## 3. AI Crawler Access Status

`public/robots.txt` uses `User-agent: *` with `Allow: /`, so `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, and other standards-compliant crawlers are currently allowed. No crawler-specific change is needed.

Search crawling and model training are separate policy choices. This review intentionally does not add crawler-specific training rules or an invented `LLMs:` directive.

## 4. `llms.txt` Status

Status: present and correctly delivered in production; the local source is revised to match the proposal's structure for the next deployment.

The live file returned HTTP 200 with `Content-Type: text/plain; charset=utf-8`. Angular copies `public/**` to the browser build root, Firebase Hosting serves the exact static file before its catch-all rewrite, and the Angular service worker does not intercept it.

The revision:

- uses the required H1 plus an optional blockquote summary;
- keeps explanatory and citation guidance before the link sections;
- formats every section item as `- [Name](URL): description`;
- removes `/labs`, which now redirects to `/blog`;
- adds the published Gadgets and Toys topic;
- keeps representative articles under the proposal's specially recognized `## Optional` heading;
- uses absolute canonical URLs; and
- avoids claims that the file controls crawling, licensing, indexing, or rankings.

All six representative article URLs and the newly added Gadgets and Toys hub returned HTTP 200 during the review.

No `llms-full.txt` is recommended. A full export of a changing personal blog would be large and easy to stale unless it is generated automatically from published CMS content.

## 5. Brand Mention Analysis

The site's Person structured data connects Colin Michaels to GitHub and LinkedIn, and the public homepage exposes a YouTube presence. Wikipedia, Reddit, and third-party citation frequency were not audited in this focused review; no absence is inferred. Those signals should be measured separately before making brand-visibility recommendations.

## 6. Passage-Level Citability

The homepage identity copy and topic-hub descriptions are concise, self-contained summaries. The verified ChatGPT setup article leads with a direct description, author, publication date, and descriptive headings, which supports passage extraction.

`llms.txt` itself should remain an index rather than a duplicate article corpus. There is no need to pad entries to a target word count. Article-level passage optimization should be reviewed per post and should prioritize clear answers, source attribution, dates, and accurate headings.

## 7. Server-Side Rendering Check

Public homepage, blog, article, and topic routes receive visible fallback HTML from the Firebase SEO renderer for crawlers and no-JavaScript readers. `/llms.txt` is a static Hosting asset and does not depend on Angular or JavaScript. The direct `/labs` route is a redirect and is therefore intentionally excluded from the index.

There is separate pre-existing route-policy drift: the Functions renderer and sitemap still classify `/labs` as a public page while Angular redirects it to `/blog`. This change follows the user-facing route behavior in `llms.txt`; reconciling the sitemap and server fallback policy should be handled as a dedicated route cleanup.

## 8. Top Five Highest-Impact Changes

1. Keep the revised proposal-conformant `llms.txt` deployed at the domain root. Completed.
2. Keep the index limited to public, canonical, evergreen destinations and review it when routes or topic hubs change. Completed for the current routes.
3. Preserve standards-based `robots.txt` access for search crawlers unless the site owner makes a separate policy decision. No change needed.
4. Validate HTTP 200, `text/plain`, and build-copy parity after deployment. Local build-copy validation is part of this change; live validation is required after the revised file is deployed.
5. Reconcile the pre-existing `/labs` redirect with the Functions sitemap and fallback policy in a dedicated route cleanup. Deferred from this file-only behavior change.

## 9. Schema Recommendations

No schema change is required for `llms.txt`. Continue using the existing connected Person, WebSite, and ProfilePage graph on the homepage and article-level author/date metadata on posts. Structured data, canonical HTML, sitemap discovery, and crawler policy remain independent of `llms.txt`.

## 10. Content Reformatting Suggestions

No site-wide article rewrite is justified by this focused review. For future posts, keep the useful pattern already present in the verified AI guide: an answer-first description, named author, publication/update date, descriptive H2 sections, and primary-source links for time-sensitive product claims. Update `llms.txt` only when a canonical hub or intentionally curated representative article changes.
