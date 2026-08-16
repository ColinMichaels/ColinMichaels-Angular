# Public Blog Taxonomy Consolidation

Audit date: August 15, 2026  
Scope: public category/tag archives, article taxonomy links, sitemap generation, feed metadata, and crawler fallback HTML

## Live Duplicate Inventory

The production sitemap exposed 21 category archives and 14 tag archives before this local remediation. The overlapping public intents were:

| Legacy or overlapping URL | Canonical public URL | Evidence and decision |
| --- | --- | --- |
| `/blog/category/cat-corner` | `/blog/category/cats-and-pets` | Both archives exposed the same three indexed cat stories and the same latest modification date. `Cats & Pets` remains the descriptive public archive; the separate `/cat-corner` experience stays a gated, `noindex` hub. |
| `/blog/category/health` | `/blog/category/health-and-recovery` | Legacy health posts and current recovery writing belong to the broader active archive. |
| `/blog/category/recovery` | `/blog/category/health-and-recovery` | The newer archive already owns the current health/recovery corpus. |
| `/blog/tag/recovery` | `/blog/category/health-and-recovery` | Category and tag represented the same reader intent. Posts that used only the tag remain included through render-time alias matching. |
| `/blog/tag/personal-growth` | `/blog/category/personal-growth` | The category owns this exact intent. Tag-only legacy membership remains included through render-time alias matching. |

The public special route `/cat-corner` is deliberately not a replacement for an indexable category archive. It keeps its existing authentication and indexing boundary.

## Implementation Contract

- Firebase Hosting issues exact `301` redirects for the five legacy archive URLs before the catch-all Functions rewrite.
- Angular defines the same five redirects before its dynamic archive routes, covering installed-app and service-worker navigation; archive filtering, category counts, article metadata, article/listing labels, related-post ranking, and tag links use the same canonical identity map.
- Firebase Functions sitemap generation, archive matching, article metadata, feeds, and fallback HTML mirror that identity map for crawler and no-JavaScript responses.
- Sitemap tag generation omits `Recovery` and `Personal Growth` tag routes because their public destinations are categories.
- Category sitemap counts are per post after alias deduplication, so one post carrying both `Cat Corner` and `Cats & Pets` cannot inflate the threshold count.
- Stored Firestore categories and tags are not rewritten. Legacy posts are projected into canonical archives at render time, preserving rollback and avoiding a destructive content migration.

## Validation

- `npm --prefix functions run test:seo`: 22/22 passed, including canonical identity, tag-to-category routing, exact Hosting redirects, redirect-loop prevention, and bounded Firebase Auth CSP coverage.
- Focused Angular taxonomy, related-post, listing, and article-metadata suite: 22/22 passed.
- Complete Angular suite: 886/886 passed.
- Firebase Hosting/Functions emulator: all five legacy URLs returned one `301` hop to the expected destination and final `200`; canonical category pages, `/blog`, and both feeds stayed `200`, while an unknown route stayed `404`.
- Production behavior is unchanged until the reviewed Angular Hosting and Functions release is explicitly approved and deployed.

## Deployment and Rollback

Deploy Hosting and Functions from the same reviewed commit so redirects, sitemap output, and crawler metadata change together. After deployment, verify each old URL returns one `301` hop, each destination returns `200` with a self-referencing canonical, the sitemap contains only canonical archives, and legacy-tag-only posts remain visible in the destination collection.

Rollback must restore the matching Hosting redirect configuration and both Angular/Functions taxonomy maps together. No Firestore rollback is required because this change does not mutate stored posts.
