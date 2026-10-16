# Homepage sharing artwork

The default site card uses `src/assets/social/colin-michaels-discoveries-v3.jpg`, a 1200 × 630 JPEG. Its oversized Colin Michaels name and “Interesting tech. Unexpected discoveries.” copy connect the site's mountain imagery and creative-workspace atmosphere with its dark palette and cyan accent. The composition keeps the main copy readable at sharing-preview sizes. This revision supersedes the earlier “Stay curious.” gadget still life; the unused v2 image remains available for comparison.

The artwork is an AI-generated editorial illustration, created with the built-in imagegen tool on 2026-09-09. The existing `colinmichaels-hero-background.webp` and `colin-editorial-workspace.webp` assets were supplied as visual references. Depicted equipment and landscape are illustrative, not documentation of products owned, places visited, or equipment tested by Colin. The generated PNG master remains in the local Codex generated-images archive; the deployable JPEG is self-contained in this repository.

Static HTML, Angular site identity, and Functions site identity share the versioned filename. Homepage fallback alt text describes the new artwork. Existing featured-post social selection and individual article images remain unchanged; this is the default brand card, not an override of the CMS selection policy.

Deploy Hosting and the SEO Functions together for full coverage, preparing the Functions SEO shell from the tested build with `npm run prepare:functions-seo`. No content or data migration is needed. Existing platform-cached previews may require a fresh scrape. Roll back by restoring the previous metadata references to `colin-michaels-og.jpg`, which remains available.

Cleanup validation (2026-10-16, Node 24.15.0): `npm run build`, `npm run lint`, `npm --prefix functions run test:seo` (99 tests), `npm run test:content-packages` (9 packages), `npm run test:seo-shell` (3 shells), and `npm run test:docs` passed. The build required an unsandboxed retry after the sandboxed Angular process aborted. The historical WebMCP release record is preserved as supplied; this cleanup does not reverify production operations.
