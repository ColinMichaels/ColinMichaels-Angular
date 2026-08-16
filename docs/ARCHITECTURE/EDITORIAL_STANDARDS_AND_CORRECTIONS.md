# Editorial Standards and Corrections

## Purpose

The public `/editorial-standards` page explains how ColinMichaels.com distinguishes direct experience from research, attributes claims, labels synthetic media and relationships, handles high-stakes boundaries, and corrects material errors. It strengthens reader and crawler trust without adding credentials, test history, ownership claims, or independent verification that the publication cannot prove.

The policy is an accountability surface, not a claim that every legacy article already satisfies every standard. It explicitly says that older work is reviewed when meaningfully updated rather than silently presented as newly verified.

## Component Inventory

- `src/app/features/public/pages/editorial-standards.component.ts`
  - Standalone, indexable policy page.
  - Defines hands-on, first-person, researched/pre-buy, manufacturer-supplied, and synthetic-media evidence boundaries.
  - Documents sourcing, relationship, AI-assistance, health/safety, correction, and author-accountability practices.
- `src/app/features/public/public.routes.ts`
  - Lazy-loads the page under the existing public route boundary.
- `src/app/shared/seo/seo.metadata.ts`
  - Owns client title, description, canonical path, preview image, and `WebPage` structured data.
- `functions/src/editorial-standards.ts`
  - Keeps the crawler-facing policy constants and readable fallback sections out of the large Functions entrypoint so they can be tested directly.
- `functions/src/index.ts`
  - Renders the matching initial HTML, canonical metadata, JSON-LD, and sitemap entry.
- `src/app/shared/author/author-bio.component.ts`
  - Links both homepage and article author surfaces to the policy.
- `src/app/features/authors/pages/author-page/author-page.component.ts`
  - Links the canonical author profile to the policy and exposes the author's public identity URLs through `Person.sameAs`.
- `src/app/features/search/services/site-search.service.ts`
  - Indexes the policy as a static public page for queries about corrections, sources, testing, disclosure, and synthetic media.
- `src/app/components/main/main.component.html`, `src/app/features/blog/pages/blog-detail/blog-detail.component.ts`, and `src/index.html`
  - Expose the policy from the hydrated homepage footer, article footer, and physical homepage fallback.
- `public/llms.txt`
  - Identifies the canonical policy for AI tools without replacing HTML, robots, sitemap, or feed contracts.

## Public Contract

- Canonical path: `/editorial-standards`.
- Public title: `Editorial Standards & Corrections | ColinMichaels.com`.
- The page is indexable and appears in normal and fallback sitemap output.
- Angular and Functions use the same heading, description, path, public author identity, and major policy sections.
- The Function fallback replaces the physical homepage `<app-root>` contents, so the route returns one meaningful H1 rather than inheriting homepage copy.
- The route does not match protected, OS, submission, or dynamic blog paths and does not change any existing canonical URL.

## Evidence and Language Boundaries

The policy uses labels as evidence boundaries:

- **Hands-on or tested** requires personal use and named conditions or limitations.
- **First-person or field notes** identifies direct project, flight, recovery, photo, footage, or workflow experience without generalizing it to every reader.
- **Researched or pre-buy analysis** says the item was not tested for the article and separates current public evidence from availability or marketing.
- **Manufacturer claim or demonstration** attributes the result to the company and does not call it independent proof.
- **Editorial illustration or synthetic media** cannot be presented as documentary evidence, a product photograph, test result, or proof of an event.

The policy does not infer that a product was owned, supplied, sponsored, or tested when no supported disclosure says so. It does not make an AI system a source and does not turn personal recovery experience into medical advice.

## Per-Article Adoption

The policy is now backed by optional typed article metadata and a visible evidence surface. Reviewed posts can identify their evidence basis, explain the boundary, show when sources were checked, disclose material relationships or AI/synthetic-media assistance, and explain substantive updates. Explicit external references also populate `BlogPosting.citation` for search engines and AI systems.

Legacy posts remain valid but show **Not yet classified** until an editor reviews them individually. No label is inferred from prose, imagery, category, or publication date, and no bulk migration is performed. See `ARTICLE_EVIDENCE_AND_DISCLOSURES.md` for the model, CMS workflow, crawler parity, migration, and rollback contract.

## Corrections

The page gives readers two direct correction paths: the existing public `/contact` form and `colin@colinmichaels.com`. A useful report includes the article URL, disputed statement, and supporting source. Clear factual errors should be corrected promptly; substantive revisions preserve the existing visible Updated date, and a conclusion-changing correction should be explained in the article rather than silently rewritten.

No new database collection, moderation queue, or email system is introduced. Correction messages reuse the existing protected public-submissions boundary and privacy policy.

## Author and Cross-Channel Identity

The default Colin author profile now carries the same canonical YouTube, Instagram, GitHub, and LinkedIn URLs as the shared homepage identity. Article author cards and the author page link to the standards page, while Angular `ProfilePage` metadata emits those URLs through `Person.sameAs`. Functions already emit stored canonical author profile URLs in its author graph.

Firestore remains authoritative when a published author document exists. This change does not overwrite a remote author profile, migrate posts, or claim that a third-party profile independently verifies a credential. The links establish entity consistency and give readers direct places to inspect Colin's work.

## Migration and Compatibility

- No Firestore document, rule, index, authentication claim, analytics event, environment value, or secret changes.
- No article, author, category, tag, feed item, or route is rewritten.
- Existing posts remain readable if the policy route is rolled back.
- The public search addition is a static page record and does not change blog or topic scoring.
- The policy is informational. It does not block CMS saves or retroactively mark legacy content compliant.

## Deployment

Deploy Angular Hosting and the matching Functions renderer from the same reviewed commit:

1. Run the Angular, Functions, SEO-shell, and complete regression suites.
2. Verify `/editorial-standards` returns `200`, one H1, a self-referencing canonical, indexable robots, `WebPage` JSON-LD, and readable initial HTML.
3. Confirm `/sitemap.xml` includes the canonical policy URL once.
4. Verify homepage, article, author, internal-search, `/llms.txt`, and no-JavaScript entry paths.
5. Test the correction form destination separately; the policy page itself sends no data.

Production remains unchanged until that explicit deployment is approved.

## Rollback

Restore Angular and Functions together so navigation, sitemap, canonical metadata, and crawler fallback behavior remain aligned. Remove the additive route, policy links, static search record, sitemap entry, and `llms.txt` listing. Do not delete author profiles, posts, submissions, analytics history, or media. No data rollback is required.

## Validation Contract

- Focused policy, author-bio, author-page, search, and route tests.
- Pure Functions policy and crawler-rendering tests.
- `npm run build`
- `npm run lint`
- `npm run build:functions`
- `npm run prepare:functions-seo`
- `npm run test:seo-shell`
- `npm --prefix functions run test:seo`
- Complete Angular test suite.
- Desktop and 390px rendered checks for hierarchy, readable evidence labels, direct correction actions, footer/profile discovery, no horizontal overflow, and clean console state.
- `git diff --check`
