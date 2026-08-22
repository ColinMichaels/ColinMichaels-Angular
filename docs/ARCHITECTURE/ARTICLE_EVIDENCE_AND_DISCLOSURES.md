# Article Evidence and Disclosures

## Purpose

Every public article now has an explicit evidence surface near its opening. Reviewed posts can state what kind of evidence supports the story, when sources were checked, what relationships or AI assistance affected the work, and what materially changed. Legacy posts remain readable, but the page clearly says when that review has not happened yet.

This is a transparency contract, not an automatic quality score. A label does not prove that a claim is accurate, a source is authoritative, media is original, or a relationship is conflict-free.

## Public Contract

- `BlogEditorialEvidenceComponent` appears after the excerpt and before the article body.
- Reviewed posts display an evidence label, its plain-language meaning, an editor-written evidence summary, the source-review date, the number of explicit external references, relevant disclosures, and the latest substantive update note.
- Unreviewed legacy posts display **Not yet classified**. They do not imply that an item was owned, tested, supplied, sponsored, or independently verified.
- Every evidence surface links to `/editorial-standards` for the full sourcing, disclosure, correction, and high-stakes policy.
- The Functions crawler fallback emits the same reviewed or unclassified state in initial HTML.
- Explicit external HTTP(S) references are emitted as `BlogPosting.citation` URLs in both Angular and Functions metadata. Same-site links, media/embed destinations, duplicate URLs, and unsafe protocols are excluded.

## Data Model

`BlogPost.editorial` is optional and contains only optional fields so existing documents remain valid:

| Field | Meaning |
| --- | --- |
| `evidenceBasis` | One of `hands-on`, `first-person`, `researched`, `manufacturer-supplied`, or `mixed` |
| `evidenceSummary` | Article-specific explanation of what was used and what was not verified |
| `sourceReviewedAt` | Real calendar date in `YYYY-MM-DD` form |
| `relationshipDisclosure` | Sponsorship, loan, purchase, affiliate, gift, or no-material-relationship context when relevant |
| `aiAssistanceDisclosure` | Material AI assistance and the human verification boundary |
| `syntheticMediaDisclosure` | Editorial illustration or synthetic-media context |
| `updateNote` | Reader-visible explanation of a substantive correction or revision |

The shared normalizer trims blank values and removes an empty metadata object. Read-time validation accepts posts without `editorial`; trusted write validation rejects unsupported evidence values, invalid dates, unknown editorial keys, oversized text, and unsafe shapes.

## Evidence Labels

- **Hands-on / tested** means Colin personally used or tested the subject under the conditions explained in the article.
- **First-person / field notes** means the story is grounded in Colin's own project, flight, recovery, footage, or workflow experience without generalizing that experience to everyone.
- **Researched / pre-buy** means the article relies on public evidence and does not claim a hands-on test.
- **Manufacturer-supplied** means material information or media came from the company and is attributed as such, not treated as independent proof.
- **Mixed evidence** means more than one of those bases materially supports the article and the summary must explain the boundary.

These meanings align with `EDITORIAL_STANDARDS_AND_CORRECTIONS.md`. The short labels and descriptions are mirrored in Angular and Functions because the build targets are isolated; parity is maintained through focused tests and rendered verification.

## CMS Workflow

The post editor includes an **Evidence & Disclosures** module with one control for every field above. The Discovery & Trust Checklist adds an advisory evidence-classification item:

- missing evidence basis is surfaced before publication;
- a basis without an article-specific summary remains incomplete;
- a basis plus summary passes the checklist.

The check does not block publication because a truthful legacy or first-person post may require editorial judgment rather than filler. Save, backup, loose import, social workspace, SEO checklist, and recovery paths all preserve normalized metadata. Recovery fields remain optional under schema version 1 so existing local recovery drafts still load.

The protected Posts screen adds a read-only **Evidence review queue** over the posts already loaded for CMS administration. It reports published posts needing review, all posts needing review, and reviewed posts; the Evidence filter exposes **Published needs review**, **All needs review**, and **Reviewed** views. A post is incomplete when it lacks a basis or summary, or when source-dependent `researched`, `manufacturer-supplied`, or `mixed` evidence lacks a valid source-review date. `hands-on` and `first-person` evidence do not acquire an unrelated source-date requirement. The queue links to each post's existing Edit workflow and deliberately offers no bulk classification or disclosure mutation.

### Legacy mutation safety

The normal post-editor **Save Post** action remains a complete-document mutation. It collects the active Editor.js document and runs canonical block conversion before calling the trusted publishing Function. A legacy post with malformed, mismatched, or unsupported block JSON can therefore reject a full save before any Firestore update occurs.

Existing posts now expose **Save evidence only** inside **Evidence & Disclosures**. The client sends only post identity, expected revision, a unique request ID, and normalized `editorial` metadata to the dedicated `updateEditorial` operation on `mutateBlogPost`. It never requests an Editor.js document or sends article blocks.

The CMS-role-gated transaction:

- accepts only the seven allowlisted editorial fields or `null`, trims optional text, rejects unknown fields, invalid evidence values, invalid dates, and oversized text;
- requires the current post revision and returns the standard stale-revision conflict rather than overwriting a newer document;
- updates only `editorial`, `revision`, `updatedAt`, and `syncedAt`; blocks, title, slug, status, publication dates, media, taxonomy, authorship, preview state, and unknown legacy fields are not validated or rewritten;
- records a `blogPublishingAudit` event and a seven-day idempotency receipt, so the same uncertain request can replay without a second revision or audit event;
- returns a bounded metadata result that the client merges into its already-loaded post instead of requiring the server to round-trip or revalidate legacy content.

The button marks only the evidence controls as saved. Unsaved body, metadata, and Social Shares work remains dirty and stays in Recovery against the new revision. **Save Post** is still required for an intentional full-document change. Do not delete, normalize, reorder, or rewrite legacy blocks merely to make evidence metadata pass.

## Reference and Schema Contract

`collectBlogReferenceUrls()` is the browser/CMS authority for explicit reference extraction. It recognizes literal URLs, Markdown links, safe HTML anchors, recursive list content, stats, chart points, and `sourceUrl` fields. It excludes same-site links from the external citation list, article self-links, images, galleries, embeds, and unsafe protocols.

`functions/src/blog-citations.ts` mirrors that contract for crawler metadata. Both paths deduplicate references in source order. The reader-visible reference count and the `BlogPosting.citation` array therefore describe explicit linked sources only; a source name without a URL is not silently upgraded into a citation.

## Component Inventory

- `src/app/features/blog/models/blog-post.model.ts`: optional editorial schema and evidence-basis values.
- `src/app/features/blog/utils/blog-editorial-metadata.util.ts`: normalization, labels, descriptions, and strict date checks.
- `src/app/features/blog/utils/blog-reference-urls.util.ts`: shared browser/CMS reference extraction.
- `src/app/features/blog/components/editorial-evidence/blog-editorial-evidence.component.ts`: reader-facing reviewed and legacy states.
- `src/app/features/blog/pages/blog-detail/blog-detail.component.ts`: article placement.
- `src/app/admin/cms/pages/post-editor/post-editor.component.ts`: full-document authoring plus the evidence-only control and selective dirty-state handling.
- `src/app/admin/cms/pages/post-list/post-list.component.ts`: read-only counts, filters, evidence state, and individual Edit routing.
- `src/app/admin/cms/utils/blog-evidence-review.util.ts`: deterministic unclassified, incomplete, reviewed, and published-priority projection.
- `src/app/admin/cms/utils/blog-seo-checklist.ts`: advisory evidence review.
- `src/app/admin/cms/models/post-recovery.model.ts`: backward-compatible local recovery shape.
- `src/app/shared/seo/seo.service.ts` and `src/app/features/blog/services/blog-open-graph.service.ts`: Angular `BlogPosting.citation` output.
- `src/app/features/blog/services/blog-publishing.service.ts`, `blog-storage.service.ts`, and `blog-repository.service.ts`: bounded editorial-update request and local merge without block serialization.
- `functions/src/blog-publishing.ts`: trusted full-write validation plus the revisioned, audited, idempotent `updateEditorial` transaction operation.
- `functions/src/blog-citations.ts` and `functions/src/index.ts`: crawler citation extraction and visible fallback evidence.
- `src/app/features/search/services/site-search.service.ts`: article evidence and disclosure text in internal search.

## Migration and Compatibility

- No Firestore bulk rewrite or content import is required or performed.
- Legacy posts remain valid and display an honest unclassified notice until reviewed individually.
- Older recovery drafts continue loading because the new fields are optional and restore uses partial form patching.
- Existing Editor.js blocks, routes, slugs, authors, dates, comments, points, media, analytics, and publication states are unchanged.
- Classification requires human review. The system must not infer testing, ownership, sponsorship, supply, or verification from prose or media.
- The queue is a client projection over existing CMS posts. It introduces no Firestore field, index, write path, route, or migration and disappears safely if the Hosting artifact is rolled back.
- The evidence-only operation is additive and narrowly allowlisted. It must not accept general post fields or become a bypass around canonical block validation or trusted full-post publishing.

Priority migration should start with high-impression articles, product comparisons, health/safety material, and posts paired with a YouTube video. Each review should add only supportable metadata and working source URLs; it should not bulk-label the corpus.

The first adoption batch is prepared locally in four source-led content packages: HOVERAir AQUA, passenger drones for sale in 2026, Unitree R1, and the exact-ID Temu mega-drone refresh. All four use `researched`, state the no-hands-on boundary, preserve their dated source checks and relationship limits, disclose AI assistance and synthetic media, and contain at least two explicit non-media external references. The Temu refresh also carries a substantive update note because it targets an existing published record. None of these packages has been imported, saved to Firestore, or published.

`scripts/validate-content-package-evidence.mjs` discovers every `*-import.json` content package and fails when the editorial shape drifts from the trusted server contract, a researched summary hides the hands-on boundary, source dates are invalid, a relevant relationship disclosure is absent, generated article media lacks a synthetic-media disclosure, a researched package has fewer than two explicit non-media external references, or a published exact-record refresh lacks an update note.

## Deployment and Rollback

Deploy Angular Hosting and the matching Functions renderer from the same tested commit. Verify reviewed and unclassified examples in hydrated HTML, initial crawler HTML, and JSON-LD before approving production.

For the evidence-only workflow, deploy the updated `mutateBlogPost` Function before or with Hosting. It requires no Firestore rewrite, index, Rules change, Storage change, secret, or environment value. Verify one authorized update, one unauthorized rejection, one stale-revision rejection, and preservation of a legacy article body before using it for editorial migration. Local implementation does not prove that the Function or button is live.

Rollback removes the reader component, CMS controls, citation output, and trusted-write validation together. Stored optional metadata can remain safely ignored by the prior reader. Do not delete or rewrite post documents during rollback.

The queue itself can be rolled back independently by removing its Posts-screen projection and guide entry. Because it is read-only and stores no queue state, no data cleanup is required.

The evidence-only control can be rolled back independently by removing the Hosting button first and then reverting the `updateEditorial` Function operation. Existing `editorial` metadata and audit records remain valid; no cleanup or reverse migration is required.

## Validation Contract

- Focused model, normalizer, reference extractor, evidence component, CMS checklist, recovery, Open Graph, and SEO schema tests.
- Functions publishing and citation tests, including invalid editorial shape, stale revision, idempotent replay, and malformed legacy-block preservation.
- `npm run build`
- `npm run lint`
- `npm run build:functions`
- `npm run prepare:functions-seo`
- `npm run test:seo-shell`
- `npm run test:content-packages`
- `npm --prefix functions run test:seo`
- Complete Angular test suite.
- Desktop and 390px article checks for evidence placement, readable legacy state, policy navigation, one H1, no horizontal overflow, no timed membership interruption, clean console state, and crawler parity.
- `git diff --check`

Local validation does not prove that production has been deployed, recrawled, reindexed, or editorially classified.
