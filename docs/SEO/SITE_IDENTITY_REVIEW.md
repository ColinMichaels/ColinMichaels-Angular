# Site Identity SEO Review

## Context

- Reviewed with the `seo` skill using `.seo-cache/site-meta.json` and `.seo-cache/audit-scores.json` from `2026-07-03T15:09:14Z`.
- Positioning choice: full personal site, keeping portfolio, writing, media, recovery, labs, and technical work visible.
- Scope: identity plus schema only.
- External guidance used:
  - Google Search snippets: https://developers.google.com/search/docs/appearance/snippet
  - Google title links: https://developers.google.com/search/docs/appearance/title-link
  - Google site names: https://developers.google.com/search/docs/appearance/site-names
  - Google structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  - Google generative AI search: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

## Fit Assessment

- What worked: the previous homepage title was concise, brand-forward, and accurate for the public site. The prior description also avoided keyword stuffing and already named the main personal identity signals.
- What was weak: the description led with identity labels before explaining the actual site surfaces. It also made Angular/Firebase and labs less visible than the current topic hubs and audit positioning.
- What should not change: health and recovery copy should remain patient-perspective and avoid implying medical advice. The site should continue to use one preferred site name, `ColinMichaels.com`, with `Colin Michaels` as an alternate signal rather than a competing site name.

## Description Candidates

1. `Portfolio, blog, media, recovery notes, and project labs from Colin Michaels, a Florida applications developer, FPV pilot, and creative technologist.` (149 characters)
2. `Colin Michaels shares a personal portfolio, blog, media work, recovery notes, and Angular/Firebase project labs from a Florida developer's perspective.` (151 characters)
3. `Personal site of Colin Michaels: portfolio, blog, media, recovery notes, and Angular/Firebase project labs from a Florida creative technologist.` (144 characters)

Selected: candidate 2. It keeps the full personal-site shape while making the technical/labs content explicit and staying concise enough for typical search-result snippets.

## Schema Additions

- Added `alternateName` to the homepage `WebSite` node with `Colin Michaels` and `colinmichaels.com` as backup site-name signals.
- Added `knowsAbout` to the homepage `Person` node using the visible site topic pillars.
- Added `publisher` to the homepage `ProfilePage`/`WebPage` node so the page, site, and person graph are connected consistently.
- Kept the homepage structured data focused on visible page content and did not add unrelated organization, local business, FAQ, or HowTo schema.
