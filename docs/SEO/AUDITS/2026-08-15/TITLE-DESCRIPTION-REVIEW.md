# Search Title and Description Review

Review date: August 15, 2026  
Scope: the 131 URLs in the live production sitemap

## Result

The fresh crawl found 26 unique URLs where the HTML title exceeded 60 characters or the meta description exceeded 160 characters. Length is a review signal, not an error: Google can truncate or rewrite snippets, and cutting a clear promise can hurt more than keeping a few extra characters.

No runtime title or description was shortened automatically.

## Candidate Decisions

### 23 blog posts: keep the existing CMS review boundary

All 23 article candidates already have stable-slug recommendations in `docs/SEO/SEO_PERFORMANCE_2026_07_19_OPTIMIZATION_MANIFEST.json`. The manifest proposes separate SEO titles/descriptions without changing the article slug or deleting the editorial headline. It remains `cms-review` material for the protected Content Operations workflow.

The review did not import the manifest because current Search Console evidence is too sparse to claim that all 23 changes would improve qualified clicks. Apply a recommendation only after confirming that it preserves the article’s actual promise and target query. Record the production before/after metadata and wait for enough new impressions before judging CTR.

### Three public non-post pages: retain current copy

| URL | Heuristic | Decision |
| --- | --- | --- |
| `/authors/colin-michaels` | 169-character description | Keep. It compactly names Colin’s location, professional role, FPV/creative identity, technical work, media projects, and patient-perspective recovery boundary. |
| `/topics/angular-firebase-architecture` | 61-character title including site suffix | Keep. “Angular & Firebase Architecture Notes” is the exact hub intent; the site suffix creates the one-character overage. |
| `/topics/recovery-planning` | 61-character title including site suffix | Keep. “Recovery & Medical Planning Resources” accurately distinguishes the patient-perspective resource hub; the site suffix creates the one-character overage. |

## Search Console Boundary

The captured July 17–August 13 Search Console snapshot is low volume: 472 impressions and 5 clicks across the property. It identified the homepage and Temu full-size-drone article as the only clear page-level packaging opportunities. Those two already have separate local remediation packages and are not part of this long-metadata queue.

The Google SEO package installed in this workspace lacks its documented API scripts, so a fresh authenticated query/page export could not be run in this review. Candidates without current query-level evidence remain unchanged.

## Deployment and Measurement

- The review itself requires no deployment.
- Any article recommendation must be explicitly reviewed in Content Operations and saved through the existing CMS workflow.
- Do not change slugs as part of metadata cleanup.
- After an approved metadata change is live, verify title, description, canonical, H1, and structured data on the public URL, then compare impressions, clicks, CTR, and position over a genuinely comparable period.
- A shorter snippet is not evidence of better search performance, and a low-count CTR swing is not evidence of popularity.
