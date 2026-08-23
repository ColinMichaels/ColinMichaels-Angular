# Blog Editor Production-Readiness Roadmap

## Outcome

The CMS should become a dependable visual article editor whose saved Editor.js document, CMS preview, and public article agree without breaking existing posts. The work extends the current typed block system and public renderer; it does not replace Editor.js, rewrite stored posts, or add a large plugin catalog.

Production readiness is a program-level claim. Completing one phase means that phase's acceptance gates passed; it does not make the complete editor production-ready. The final claim requires every phase below, a production-content compatibility audit, repository validation, responsive and accessibility verification, and an explicit deployment review.

## Current Foundation

The repository already provides:

- one synchronized WYSIWYG and JSON Article Content document;
- typed CMS-to-blog block adaptation and a separate public renderer;
- headings, paragraphs, images, multi-image galleries, lists, quotes, code, Markdown, typography, stats, charts, polls, embeds, HTML, and Cat Corner blocks;
- four migration-safe image layouts: `fullWidth`, `contained`, `inlineStart`, and `inlineEnd`;
- image URLs, alternative text, captions, dimensions, borders, backgrounds, and Media Library selection;
- drafts, scheduled and published states, temporary draft previews, metadata controls, and role-aware CMS access.

This foundation should be preserved. New presentation fields must be optional, have legacy defaults, and be understood by both the editor adapter and public renderer before authors can save them.

The additive `gallery` extension supplies manual slideshow, responsive grid, and mosaic layouts for two to twenty images while reusing the trusted media pipeline and public lightbox. Its server allowlist, canonical hydration boundary, deployment sequence, and rollback requirements are documented in `EDITORJS_IMAGE_GALLERIES.md`.

### Generated post packages

The New Post editor accepts a single selected folder as a **post package**. It combines one normal CMS post JSON document, one image manifest, and the generated image files without bypassing the existing Storage staging/finalization path. Each declared image is uploaded first; the editor then replaces only the matching `media://…` placeholders in known media fields—cover, background, thumbnail, Open Graph, social image, image blocks, and gallery items. Article prose and external links are never rewritten. The imported draft remains unsaved and unpublished until the editor reviews and explicitly chooses **Save Post**.

The manifest can be embedded as `imageManifest` or `mediaManifest` in the post JSON, or supplied as a separate JSON file in the selected folder. Its portable v1 shape is:

```json
{
  "images": [
    {
      "file": "images/cover.webp",
      "reference": "media://images/cover.webp",
      "role": "cover",
      "altText": "Describe the image for readers"
    },
    {
      "file": "images/intro.webp",
      "role": "inline-image",
      "altText": "Describe the inline image"
    }
  ]
}
```

`reference` defaults to `media://` plus `file`. The post JSON must use that exact placeholder in a supported media field. The import fails before it uploads anything if a path is unsafe, a declared image is absent or ambiguous, a placeholder has no manifest entry, or the manifest includes an image with no supported post-media target. If an individual upload fails after earlier uploads succeeded, the post remains unchanged and already-finished images remain available in the Media Library for a safe retry.

The New Post editor exposes this asynchronous work through `PostPackageImportProgressComponent`. Package discovery and validation use an indeterminate state because there is no honest byte total yet. Once file matching succeeds, the bar combines the number of finalized images with the current image's real Storage transfer percentage. Reaching 100 percent transfer explicitly changes the visible status to **Processing media** while trusted signature validation and web-variant creation continue; it does not claim that the image is ready until the finalizer returns a canonical URL. The panel then reports draft preparation, completion, cancellation, or failure and remains visible after the busy state clears. A persistent empty polite live region receives bounded import-start, upload-start, first-processing, and cancellation milestones; high-frequency transfer percentages remain on the labelled progressbar, while success and error use the existing single toast announcement instead of
duplicating a terminal result. Completion means the imported draft is loaded but still unsaved and unpublished. A partial failure names how many finalized images remain in the Media Library, and pre-manifest failures remain indeterminate rather than presenting a false zero-percent total.

One shared JSON/package import operation owns the New Post editor until it settles. Workspace controls and post actions become inert, all save/delete/import/export/preview entry points reject re-entry in either direction, browser unload receives the ordinary unsaved-work warning, and the route guard refuses in-app navigation. The import chooser also remains unavailable while preview creation, JSON export, canonical/recovery state application, thumbnail generation, form-media upload, or Editor.js image upload can still write to the editor. Recovery restoration, canonical reload, and Firestore hydration use one serialized editor-state queue, so a remote snapshot cannot render over an in-flight recovery document; a queued hydration re-evaluates dirty state and revision after it obtains ownership, preserving the restored copy at the same revision and surfacing a conflict for a newer revision. Canonical reload rechecks the live Firestore snapshot and conflict after Recovery persistence,
applies the newest available revision, and aborts without clearing the conflict if the post was deleted during that wait. Counted ownership keeps imports blocked until every queued writer settles. Repeated thumbnail requests are rejected, and thumbnail generation is mutually exclusive with the cover-image uploader in both start orders. Visible import, export, preview, and thumbnail launch buttons remain focusable with guarded `aria-disabled` state so focus survives the native picker and long-running operations. Destroying the editor detaches the Firebase listener, cancels unfinished package and Editor.js resumable transfers before their upload-complete boundary, invalidates the import continuation, and prevents a late draft application; after upload completion, an already-started trusted finalization remains server-owned. Any images already finalized before an interruption remain available in the Media Library. Focused integration tests cover transfer-to-processing-to-finalized
progress, reverse JSON/package overlap, pending preview/export exclusion, state-application/thumbnail/form-media exclusion, queued recovery/hydration re-evaluation, reload-time remote advance/deletion, cover-writer exclusion, repeated thumbnail and reload serialization, focus-preserving thumbnail exclusion, direct mutation guards, partial failure accounting, duplicate-slug cancellation, save/navigation blocking, busy-state release, focus/live-region persistence, indeterminate validation errors, component teardown for both upload paths, and the real Firebase resumable-task cancellation contract.

Each upload is fingerprinted by the trusted finalization service with SHA-256. When an identical image has already been finalized, the package import reuses its existing immutable Storage variants and download URLs instead of creating copies. Different source bytes always receive a new immutable asset; imports never overwrite a previously finalized image.

Package import is intentionally a **New Post** workflow. It preserves the current new-post identity and revision, always stages the package as a draft, and never updates an existing post. If its requested slug already belongs to a post—especially a published article—the editor asks for explicit approval before uploading media and clearly states that continuing creates a separate draft with a unique slug.

Folder discovery uses post structure rather than treating every JSON document with a `slug` as an article. A standalone provenance sidecar with fields such as `slug`, `generatedAt`, and `assets` is therefore ignored as a post candidate. When zero or multiple real post documents remain, the error names the inspected or conflicting files. Import progress is reactive and always resets after success or failure, so an error cannot leave the chooser stuck on **Importing package...**.

Generated source packages should keep research notes, provenance manifests, source artwork, and unused derivatives in the article root, then place the upload-ready material in a dedicated `cms-import/` subfolder. That portable subfolder contains exactly one post JSON document, one literal `image-manifest.json`, and only the final referenced images. The post uses `media://` placeholders; the manifest uses the portable top-level `images` contract above. Operators select only `cms-import/` in New Post.

This hardening and its progress panel change only the Hosting client and require no Firestore backfill, Function, Rule, index, Storage migration, or secret. Rolling back the Hosting artifact removes the progress presentation and restores the earlier broad folder classifier and non-reactive busy flag; already-correct portable packages remain compatible with either build, and finalized assets or post documents are not changed by the rollback.

## Discovery And Trust Authoring Review

The post editor's existing metadata checklist is now the **Discovery & Trust Checklist**. It preserves all ten search/share checks and adds four advisory content checks over the current canonical Editor.js blocks and optional post metadata:

1. **Usable references** recognizes external HTTP(S) links in rich text, lists, Markdown, HTML, and chart source fields. It deduplicates the same destination and warns more specifically when a Sources or References heading has no usable link. Embed destinations are not silently counted as citations.
2. **Contextual next read** recognizes a non-self ColinMichaels `/blog/{slug}` link in the article body. Automatic topic and Read next rails remain useful fallbacks but do not replace an editor explaining why a particular story advances the reader's question.
3. **Supporting evidence** recognizes in-body images, gallery items, embeds, charts, stats, code samples, and HTML or Markdown tables. A passing signal does not prove that an artifact is original, accurate, rights-cleared, or material; the operator guidance requires human confirmation.
4. **Evidence classification** asks the editor to choose a supported article-level evidence basis and explain its boundary. Missing classification or explanation stays visible without creating a false automatic quality score.

These checks are warnings rather than publishing blockers. A first-person journal entry can legitimately be source-free, and weak filler should never be added to satisfy a counter. The analysis itself remains local; the separate optional `BlogPost.editorial` object preserves editor-reviewed evidence and disclosures through the trusted publishing boundary. The protected Posts screen projects a read-only Evidence review queue over those existing records, prioritizes published incomplete articles, and routes every decision through the individual editor; it adds no bulk mutation or automatic classification. No backfill occurs. `CMS_ACCESS_ROLES` remains the route and guide boundary. Rollback removes the queue projection, additive checklist item, authoring controls, reader evidence card, and matching Functions support; existing posts without metadata remain unaffected. The complete contract is documented in `ARTICLE_EVIDENCE_AND_DISCLOSURES.md`.

## Findings And Risk Register

The investigation identified the following boundaries. Phases 1–7 are implemented in source and have the phase-specific automated evidence recorded below. Their authenticated CMS, production-corpus, exact-release, and deployment checks remain separate gates; source completion alone is not a production-live claim.

| Risk                                                                                                                 | Consequence                                                                      | Program response                                                                                                      |
|----------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| Legacy flat lists and modern recursive Editor.js lists need one durable schema                                       | Opening and saving a nested or checklist list can otherwise flatten meaning      | Phase 1 preserves recursive items, checked state, and legacy strings                                                  |
| Unsupported block types need a lossless boundary                                                                     | A valid JSON block can otherwise disappear during adaptation                     | Phase 1 retains opaque type/data payloads and safely omits them from public rendering                                 |
| JSON document validation is broader than per-tool semantic validation                                                | Structurally valid but unusable block data can reach save or preview             | Phase 1 establishes compatibility validation; later publishing work adds complete server-side readiness validation    |
| Editor body changes need the same recovery/concurrency boundary as metadata                                          | Navigation, refresh, or concurrent editors can lose work                         | Phase 2 now includes unified dirty state, leave protection, private recovery drafts, revisions, and conflict handling |
| The visual editing canvas is not the actual production renderer                                                      | Authors can approve a draft that wraps or lays out differently after publication | Phase 3 adds an unsaved-document Production Preview using the public renderer and shared tokens                       |
| Heading, list, and reader-preference styles previously lacked one coherent type system                               | Hierarchy, sticky headings, markers, and large reader scales could conflict      | Phases 4 and 5 align type scale, sticky metrics, table of contents, and list presentation                             |
| Image layouts are useful but have limited responsive sizing and crop control                                         | Floats, captions, and wide images can behave inconsistently across viewports     | Phase 6 improves the existing block before adding bounded optional sizing                                             |
| Client save/publish and scheduled publishing previously lacked one complete trusted validation and revision boundary | Invalid or stale content could be published through a different path             | Phase 7 centralizes backend validation, revision checks, publishing, scheduling, and media integrity                  |

## Phase 1: Content Safety And Compatibility

### Purpose

Phase 1 prevents the editor adapter and public renderer from silently deleting or flattening content. It changes the compatibility contract, not the public layout design.

### Canonical compatibility contract

- Existing list blocks with `items: string[]` plus `ordered` remain valid and render as they did before this phase.
- Recursive lists use `listStyle`, optional `listMeta`, and `listItems`. Each canonical recursive item retains `content`, a `meta` object, and its child `items`; missing metadata/children normalize to empty values, and checklist state is stored as `meta.checked`.
- Legacy standalone Editor.js `checklist` blocks normalize into the same recursive `list` plus `listStyle: 'checklist'` contract.
- Ordered, unordered, and checklist styles remain explicit. Missing recursive fields continue to use the legacy flat-list behavior.
- Reading-time, search, and CMS-assistant plain-text projections traverse recursive items in visual reading order.
- Supported blocks preserve JSON-object Editor.js tune metadata through the canonical `editorTunes` field; unsupported blocks retain it inside `originalTunes`.
- Unsupported or unrecognized Editor.js blocks become canonical `type: 'unsupported'` blocks whose `data.unsupportedBlock` retains `originalType`, opaque `originalData`, and optional opaque `originalTunes`.
- When reopened in Editor.js, the registered `unsupported` tool shows an inert **Compatibility protection** block with a **View preserved JSON** disclosure. The payload is preservation data and cannot be visually edited.
- Unsupported blocks are not treated as trusted public HTML. The public renderer omits them rather than executing or interpolating arbitrary payload markup.
- On editor load, an opaque list or chart envelope is promoted back to its original Editor.js type only when its preserved data and tunes pass the current known-block validator without a preservation warning. Canonical portable-package lists are also recoverable when their `ordered`, `listStyle`, `listPresentation`, `listMeta`, `items`, and `listItems` data can be converted to a valid Editor.js list without semantic loss. This repairs previously protected supported lists and charts in WYSIWYG and Production Preview while unknown, ambiguous, or malformed payloads remain opaque.
- Recovery is completed by an explicit **Save Post**. There is no background Firestore migration, and the public renderer continues to omit the old envelope until the trusted publishing path stores the recovered typed block. Rollback restores the earlier editor behavior without rewriting posts; any unsaved envelope remains intact.
- Block IDs remain stable when supplied. Generated IDs are only for inputs that did not provide one.
- All new fields are optional, so no Firestore backfill is required and existing post documents remain readable.
- `validateEditorDocumentForBlog()` reports block-indexed errors with `isValid: false` for malformed known blocks and warnings for valid unknown blocks preserved through the unsupported compatibility path. The editor uses this result to block JSON-to-WYSIWYG conversion and save on errors. As defense in depth, direct adapter conversion preserves a malformed known block as `unsupported` instead of dropping it.
- A compatibility fixture must prove that an existing supported document survives the round trip without semantic loss.

### Scope completed in code

Phase 1 code covers the typed recursive-list and opaque-block contracts, adapter round trips, and safe public-renderer behavior. Focused unit tests are the source of truth for exact supported shapes.

Browser rendering keeps legacy flat lists on their unchanged ordered/unordered branch. Structured lists render recursive semantic `<ol>` or `<ul>` elements; nested levels receive depth metadata, and checklist state renders as disabled native checkboxes. The crawler fallback follows the same ordered/unordered/checklist semantics. Both public paths omit `unsupported` blocks completely and never interpret or emit their original type, data, or tunes.

Phase 1 does **not** itself:

- export or modify the live production post collection;
- approve malformed documents for publication;
- add autosave, revision history, or concurrent-edit protection;
- make unsupported blocks visually editable;
- change typography, list decoration, or image layout;
- create production image derivatives;
- make the complete CMS production-ready.

### Production-data gate

Before deploying Phase 1 to production, an authorized operator must export the canonical posts and record:

- post count and IDs/slugs;
- block counts grouped by type;
- list styles and maximum nesting depth;
- blocks with missing IDs or non-object data;
- unsupported block types and their locations;
- source artifact checksum and export timestamp.

The export is a read-only evidence artifact. It must not be committed if it contains unpublished content or private data. Representative, redacted shapes should become checked-in regression fixtures. The deployment reviewer must compare pre- and post-change round-trip reports and accept zero missing blocks, zero reordered blocks, zero lost child items, and zero changed checklist states.

### Published-corpus audit snapshot — 2026-08-03

A read-only Firestore audit covered all 72 anonymously readable published posts and 5,703 blocks. The corpus contained 954 headers, 3,976 paragraphs, 28 embeds, 475 lists, 83 quotes, 156 images, 2 polls, 8 delimiters, 4 Cat Corner unlocks, 11 code blocks, and 6 charts. All 475 stored lists use the legacy flat shape (471 unordered and 4 ordered), so recursive/checklist behavior is covered by regression fixtures rather than current published content.

All 72 posts passed the runtime post/block validator. Every generated Editor.js document passed schema validation, no unsupported-block warning was present, and the normalized document-to-blog-to-document comparison reported zero semantic round-trip differences. The deterministic source checksum was `dbf21e2bcdabae56102ebcbd8f243a9207995cdde07c8baf0f44cd2bd75de26c`; the ordered ID/slug identity checksum was `89a92e608cad06a739a0849a23245eae24cb75b1cff00f980d5f0713ec06f100`.

This is strong published-content evidence, not the complete production-data gate. Anonymous access correctly returned **Missing or insufficient permissions** for the full collection, so drafts, scheduled posts, archived posts, and other non-public records were not inspected. An authorized CMS export of the complete collection, retained as a private rollback artifact, remains mandatory before Step 1 deployment approval.

### Step 1 validation snapshot — 2026-08-03

Validation used the repository-supported Node.js 24.15.0 runtime. `npm run lint`, `npm run build`, and `npm run build:functions` passed, as did the focused compatibility, editor, renderer, runtime-validation, and role-aware Admin Guide tests.

The complete Angular suite reached 682 of 691 passing tests. The nine remaining failures are quantified baselines outside the Phase 1 compatibility paths: two existing chart-series metadata/rendering expectations, six Publishing Calendar expectations, and one admin-route-boundary expectation. Phase 1 must not be described as making the repository-wide suite green.

A live-data browser run on desktop Chromium and a Pixel 7 viewport confirmed that the published collection loads, a real article renders through `BlogBlockRendererComponent`, semantic headings and lists are visible, no page exception occurs, and the tested page has no horizontal overflow. It also exposed two existing production-readiness blockers:

- anonymous article entry calls `https://us-east1-colinmichaels.cloudfunctions.net/recordPostRead`, which returns HTTP 401 and writes a browser-console error;
- the sticky-heading scenario reaches the real article but the active section heading does not settle at its documented sticky offset (`-220` observed versus `124` desktop and `108` mobile expected).

The browser scenario was also stale before this review: it targeted the retired `app-blog-post-card` listing host, did not allow for a cold live Firestore query, did not dismiss the optional reader campaign, and selected both the article and rail renderers. Those setup defects are corrected so the scenario now reaches the actual sticky-heading assertion.

Accordingly, the Phase 1 compatibility implementation was validated in isolation at that checkpoint. The later phases and repository baselines have since advanced as documented below, while the authorized complete-post export and authenticated production review remain program-level release gates.

### Phase 1 acceptance gates

1. Legacy flat unordered and ordered lists round trip without content or order changes.
2. Recursive ordered/unordered lists retain every child and nesting level.
3. Checklist items retain checked, unchecked, and unspecified state.
4. Supported blocks retain IDs, type, normalized supported data, and JSON-object tune metadata.
5. Unsupported blocks retain ID, original type, opaque data, and optional tunes without public execution.
6. Malformed known block shapes produce blocking, block-indexed validation errors; valid unknown blocks produce warnings; direct adapter conversion never silently drops either shape.
7. Focused adapter, model, renderer, and Admin Guide tests pass.
8. `npm run build` and `npm run lint` pass, or any unrelated baseline failure is quantified exactly.
9. The authorized production-corpus inventory and round-trip report show no semantic data loss before deployment approval.

## Phase 2: Editing Reliability And Recovery

### Reliability contract completed in code

- The unified dirty state includes Angular form fields, Social Shares, WYSIWYG Editor.js changes, image insertion, reset, and raw JSON input. Programmatic hydration and WYSIWYG/JSON synchronization do not create false dirty events.
- `beforeunload` protects browser refresh/close, while `pendingPostChangesGuard` protects both new and existing Angular editor routes. The warning is conservative: a recovery write may still be in flight or waiting for its 1.5-second debounce.
- Firestore collection refreshes never replace a dirty editor. A same-revision refresh preserves the local surface; a newer revision or remote deletion opens an explicit conflict state.
- Recovery autosave is separate from Save Post. It writes the active form, Social Shares, and either the valid visual document or the exact raw JSON source—including invalid/incomplete JSON—to the private `postDrafts` boundary.
- Recovery copies cannot create or update `/posts`, issue previews, change status, schedule, or publish. Restoring a recovery copy marks the editor dirty and still requires an explicit canonical Save Post action.
- A stable non-security FNV-1a fingerprint supports comparison of recovery payloads. Canonical concurrency authority is the numeric post `revision`, not the fingerprint.
- Every canonical Angular post save, preview issue/revoke, bulk status change, and JSON import requires the expected revision inside a Firestore transaction. First writes commit revision 1; missing legacy revisions normalize to 0; every accepted write increments once.
- Scheduled publishing and Cat Corner social reconciliation increment canonical revisions with `FieldValue.increment(1)`, so backend changes are visible to an open editor.
- A stale or deleted save retains local state and offers canonical reload when a remote post exists, plus **Save as new draft**. Reload first flushes the private recovery copy, then rechecks the current remote revision before applying it; a newer revision wins and a deletion aborts the reload without clearing the conflict. It never silently discards the only recoverable local representation.

### Recovery document and authorization contract

Recovery paths are deterministic: `/postDrafts/{ownerUid}/recoveries/{encodedPostId}`. The document stores schema version 1, owner UID, stable post identity, new/existing state, base revision/update time, save/expiry times, comparison fingerprint, form data, Social Shares, and the Editor.js recovery snapshot. A local-storage key keeps an unsaved new post's generated ID stable across reloads and is removed after the first canonical save.

Security Rules require a CMS content role and exact path owner `ownerUid == request.auth.uid` for create/get/update/delete; writes also validate the stored owner field. Collection listing is denied. Recovery documents expire after 30 days. Opening an expired copy deletes it opportunistically; successful canonical save, canonical delete, explicit discard, and conflict-copy completion also request deletion. `expiresAtTimestamp` is included so an operator may additionally enable a Firestore TTL policy for the `recoveries` collection group without changing the client schema.

### Migration, deployment, and rollback

No post backfill is required. Legacy posts without `revision` are revision 0 and receive revision 1 on their next accepted canonical write. Existing optional fields and block documents are unchanged.

Deploy in this order:

1. Back up the complete authorized `/posts` collection and record its checksum.
2. Deploy Functions so scheduled and reconciliation writes increment `revision`.
3. Deploy Firestore Rules so recovery documents are owner-scoped before the UI can create them.
4. Deploy Hosting, then verify an authenticated create/edit/recover/conflict workflow with a CMS content-role account.
5. Optionally enable Firestore TTL on the `recoveries` collection group's `expiresAtTimestamp`; client-side expiry remains the fallback.

Rollback can restore the earlier Hosting and Functions builds without rewriting posts: the optional revision field is ignored by old readers. Retain owner-scoped Rules and recovery documents during the rollback window so recoverable work is not exposed or destroyed. An authorized operator may delete `postDrafts` only after the retention window and user confirmation.

### Phase 2 acceptance evidence — 2026-08-03

Focused tests cover first revision save, repeat save, simultaneous writers, stale revisions, remote deletion, failed storage writes, first hydration, dirty same-revision refresh preservation, dirty newer-revision conflict, route-guard delegation, invalid raw-JSON recovery, expiry, fingerprints, Editor.js dirty events, safe recovery document IDs, runtime post revision validation, and role-aware operator guidance. The focused Phase 2/Admin Guide set passes 68 of 68 tests, and all 34 Functions tests pass. TypeScript application/spec compilation, the Angular production build, lint, the Functions build, and Firestore Rules compilation in the local emulator pass on Node.js 24.15.0.

Local Firestore emulator probes with synthetic claim sets passed the recovery authorization matrix: the CMS owner could create/get/delete and repeat a missing-document delete; an anonymous caller, another CMS editor, and a signed-in viewer were denied; changing the stored owner was denied. Observed HTTP statuses were 200 for allowed operations and 403 for each denial.

The complete Angular suite reaches 698 of 707 passing tests. The same nine quantified baselines from Phase 1 remain: one admin-route expectation, six Publishing Calendar tests missing their Firestore test provider, and two chart series expectations. No Phase 2-focused test fails.

Browser control was available in both the in-app browser and Chrome. The local `/admin/cms/new` route correctly redirected to `/login?redirectUrl=%2Fadmin%2Fcms%2Fnew`, but neither local browser origin held an authenticated CMS session; no credentials were requested or entered. Authenticated reload recovery, route-leave, responsive recovery-panel rendering, and two-session conflict flows therefore remain the deployment gate. Phase 2 must not be described as deployed or as making the whole program production-ready until that environment evidence exists.

### Phase 2 acceptance gates

1. First and repeat canonical saves increment revisions exactly once.
2. Only one writer from a shared base revision can commit; the other retains local state and receives an actionable conflict.
3. Dirty WYSIWYG, JSON, metadata, and Social Shares state survives Firestore refresh and is offered after reload through the owner-scoped recovery copy.
4. Angular navigation cancellation and browser unload warnings trigger for the unified dirty state.
5. Remote deletion cannot recreate or overwrite the canonical ID implicitly; duplicate-as-new is an explicit draft action.
6. Failed recovery writes do not block local editing or canonical Save Post; failed canonical writes do not mutate local canonical state.
7. Recovery restore, comparison, reload, discard, expiry, successful-save deletion, and duplicate-as-new are verified with an authenticated CMS account.
8. Firestore emulator tests prove owner isolation and denial for unauthorized roles before deployment approval.
9. `npm run build`, `npm run lint`, Functions build/tests, the relevant Angular tests, and browser checks pass or unrelated baselines are quantified exactly.
10. No recovery path publishes, schedules, issues a preview, or overwrites `/posts` implicitly.

## Phase 3: Production Preview Parity

### Production-preview contract completed in code

Article Content now has three views over one synchronized Editor.js document:

1. **WYSIWYG** authors the canonical Editor.js document.
2. **Production Preview** renders the current unsaved document locally.
3. **JSON** provides validated source diagnostics and controlled editing.

Changing view does not mark content dirty by itself. Entering Production Preview captures the visual document or validates the current JSON source, normalizes it through the canonical adapter, and retains the same document for subsequent Save Post, recovery, JSON, or WYSIWYG actions. Invalid JSON and malformed known blocks cannot enter preview. Entering JSON from Production Preview serializes the previewed document, while returning to WYSIWYG renders that same document back into Editor.js.

`CmsProductionPreviewComponent` renders canonical `BlogContentBlock[]` through the exact public `BlogBlockRendererComponent`; it does not copy block markup or bypass `BlogRichTextComponent` sanitization. The preview frame is inside the existing `public-reader-scope`, so it consumes the same Reader text scale, typography, list, caption, image, theme, and reduced-motion variables as the public article renderer. The contextual preview title, excerpt, and cover image come from the current unsaved form values.

The local toolbar provides light/dark themes, 390px Mobile, 768px Tablet, and 1280px Desktop canvas widths, 100/150/200 percent Reader text, and reduced-motion state. Canvas resizing is an authoring aid; CSS media queries still require final validation at real browser viewport sizes. The Article Content tablist implements roving focus plus Arrow Left/Right, Home, and End behavior, and every preview control is a native button with state announced through `aria-pressed`.

Production Preview is review-only. It cannot write `/posts`, recovery documents, preview tokens, or publish state. Poll blocks use the public component in a read-only mode that performs no result read or vote write; default public article behavior remains interactive. Compatibility-protected blocks remain omitted by the public renderer. An admin-only count explains that omission without exposing original type, data, tunes, or embedded markup.

The existing **Draft Preview** remains separate: it saves the canonical draft and creates a temporary public `/blog/preview/{token}` URL. Production Preview is local, can show unsaved content, creates no token, and must never be described as a shareable link.

### Migration, deployment, and rollback

Phase 3 adds no persisted post/recovery field, Firestore migration, Security Rule, Function, index, secret, dependency, or preview-token change. Existing posts and Editor.js documents are unchanged. The production renderer is deferred with the local preview surface so the additional rendering graph is not part of the initial application bundle.

Deploy Phase 3 as a Hosting change after the Phase 1–2 deployment prerequisites are satisfied. Before approval, verify a complete authorized post export, then exercise WYSIWYG-to-preview, JSON-to-preview, invalid JSON, reset, recovery, and Save Post with a CMS content-role account. Compare representative saved-draft public previews with their local Production Preview block output in both themes and at real mobile/tablet/desktop browser viewports.

Rollback restores the earlier Hosting build. Because no data is written by merely opening or configuring Production Preview, rollback needs no content rewrite or cleanup. Posts saved through the synchronized document retain the Phase 1 compatibility and Phase 2 revision contracts.

### Phase 3 acceptance evidence — 2026-08-03

The Phase 3 fixture contains every supported canonical block type: paragraph, both supported header levels, image, embed, list, quote, code, Markdown, delimiter, typography, stats, chart, poll, Cat Corner unlock, and sanitized HTML. The same fixture verifies that `BlogBlockRendererComponent` receives the original canonical block collection, unsafe script elements are removed, polls are read-only without Firebase reads or writes, compatibility payloads remain opaque, and long content is not truncated.

Focused editor/preview/poll tests cover visual-to-preview, JSON-to-preview, preview-to-JSON/WYSIWYG synchronization, invalid-source rejection, theme, canvas, Reader text, reduced motion, unsupported-block messaging, every supported block fixture, read-only polls, and tab keyboard behavior. The changed-scope set passes 23 of 23 tests. The Phase 3, sanitizer, and role-aware Admin Guide set passes 36 of 36. The renderer-inclusive set reaches 55 of 56, with only the already documented multi-series chart expectation baseline failing; no Phase 3-focused test fails.

`npm run lint` and `npm run build` pass. The production build reports no warnings, keeps the initial transfer estimate at 336.83 kB, and places the public renderer graph in a lazy chunk rather than the initial application graph. The complete Angular suite reaches 706 of 715 passing tests. The same nine quantified baselines remain: one admin-route expectation, six Publishing Calendar tests missing their Firestore test provider, and two chart-series expectations. No Phase 3-focused test fails in the complete run.

Browser control was available in both the in-app browser and Chrome. On each, local `/admin/cms/new` correctly redirected to `/login?redirectUrl=%2Fadmin%2Fcms%2Fnew`, and the tested login surfaces produced no console warning or error. Neither browser origin held an authenticated CMS session, and no credentials or OAuth action were requested or attempted. Real authenticated preview screenshots, actual-viewport mobile/tablet/desktop comparisons, keyboard interaction, local-versus-saved Draft Preview parity, and authenticated console inspection therefore remain the deployment gate. Phase 3 is code- and automated-test-complete but must not be described as deployed, deployment-approved, or as making the whole program production-ready until that evidence exists.

### Phase 3 acceptance gates

1. WYSIWYG, Production Preview, and JSON retain one synchronized document without a save/apply side channel.
2. Production Preview renders blocks through `BlogBlockRendererComponent` and the public rich-text sanitizer.
3. Invalid JSON or malformed known blocks cannot enter Production Preview or Save Post.
4. Every supported block fixture renders through the public component; compatibility payloads remain omitted and undisclosed.
5. Preview polls perform no result reads or vote writes; public poll behavior remains unchanged by default.
6. Light/dark, Mobile/Tablet/Desktop canvas, 100/150/200 percent Reader text, reduced motion, long content, and keyboard controls pass focused tests.
7. Real browser screenshots and console checks cover both themes and representative actual viewports with an authenticated CMS role.
8. Local Production Preview creates no canonical write or public token; Draft Preview remains the explicit saved/shareable workflow.
9. `npm run build`, `npm run lint`, focused tests, and the complete suite pass or unrelated baselines are quantified exactly.

## Phase 4: Article Typography And Heading Structure

### Heading and layout contract completed in code

The shared reader theme now defines responsive `--blog-*` title, H2, H3, line-height, measure, rhythm, letter-spacing, rule, and contrast tokens. The public article title, public block renderer, Production Preview, and WYSIWYG heading surface consume that contract. Level-two headings use a restrained top rule with a short accent; level-three headings retain a quieter subheading treatment. Long copy balances and wraps inside bounded measures while inline rich text remains sanitized and intact.

Active and flowing level-two headings now have identical font size, line height, padding, measure, rule, and markup. Sticky state changes only positioning and a non-layout shadow, eliminating the previous type and padding reflow. Stable anchor generation, duplicate-anchor suffixing, `TLDR` aliases, historical fragment URLs, natural-position table-of-contents scrolling, reduced-motion behavior, and stored level 2/3 values are unchanged.

Below the desktop breakpoint, `BlogTableOfContentsComponent` starts collapsed behind a native button with `aria-expanded` and `aria-controls`; selecting a section collapses it again. At `xl`, it remains visible and sticky. `BlogDetailComponent` selects one of four desktop grids from actual content: article only, contents/article, article/related, or all three columns. Missing rails no longer leave empty tracks.

Editor document validation adds two non-blocking, block-indexed author diagnostics. The first Heading block warns when its normalized visible text repeats the current post title. Markdown blocks warn when ATX or Setext headings outside fenced code will render visually but remain absent from the generated contents rail. Authors are directed to use Heading level 2 for sections and level 3 for subsections; neither warning rewrites or rejects content.

Reader text scaling now gives explicit responsive sizes to lead, section intro, pull quote, key takeaway, eyebrow, attribution, aside, and caption variants. This preserves their intended hierarchy at 100, 150, and 200 percent instead of allowing the generic paragraph rule to flatten them.

### Migration, deployment, and rollback

Phase 4 changes no persisted heading, Markdown, post, recovery, rail-placement, or preview field. It requires no Firestore migration, Rule, Function, index, secret, dependency, or anchor redirect. Existing posts receive the new presentation and diagnostics without being opened or resaved.

Deploy Phase 4 as a Hosting change after the Phase 1–3 prerequisites are satisfied. Before approval, compare representative long-title, long-heading, inline-formatting, duplicate-heading, Markdown-heading, typography-variant, one-rail, two-rail, and no-rail posts at real 390, 768, 1280, and 1440 CSS-pixel viewports in both themes. Verify Reader text at 100/150/200 percent, browser zoom, reduced motion, forward/backward contents navigation, sticky handoffs, overflow, and console health.

Rollback restores the previous Hosting artifact. Stored blocks and historical anchors need no rewrite. The earlier build will return to fixed three-column tracks, always-open narrow contents, smaller active sticky headings, and generic Reader scaling for typography variants; authors may temporarily stop receiving the two advisory heading warnings.

### Phase 4 acceptance evidence — 2026-08-03

Focused validation covers all four grid-track selections, default-collapsed and keyboard-native contents disclosure, natural-position backward navigation, stable anchors, long inline-formatted headings, identical flowing/sticky metrics, Reader-aware variant classes, repeated-title warnings, Markdown-heading warnings, fenced-code exclusion, Production Preview theme scoping, and the role-aware Admin Guide copy. The expanded Phase 4 set reaches 79 of 80 tests, with only the already documented multi-series chart expectation baseline failing; no Phase 4-focused test fails.

`npm run lint` and `npm run build` pass on Node 24.15.0. The production build reports no warnings, an initial bundle of 1.48 MB raw / 337.16 kB estimated transfer, and a 49.20 kB raw / 12.00 kB estimated-transfer lazy blog-detail chunk. The initial transfer estimate increases by 0.33 kB from the Phase 3 record. The complete Angular suite reaches 713 of 722 passing tests. The same nine quantified baselines remain: one admin-route expectation, six Publishing Calendar tests missing their Firestore test provider, and two chart-series expectations. No Phase 4-focused test fails in the complete run.

Rendered QA used the current local code with a read-only production-Firestore article at `/blog/how-i-built-my-auto-blog-workflow`. At 1280 CSS pixels the article selected the three-column grid, heading anchors navigated forward and backward with the active contents item following the fragment, sticky article navigation remained usable, and the fresh-tab console was clean. At 390 by 844 CSS pixels, Contents started collapsed, exposed accurate native disclosure state, collapsed again after a section selection, and the selected fragment navigated without horizontal overflow. Light-theme Reader text at 200 percent preserved the article hierarchy at both widths with zero document or heading overflow; the browser preferences were restored to the original 100-percent dark state after the check.

The real article's first H2 repeats its post title, providing a representative stored-content case for the new advisory diagnostic without modifying the post. `/admin/cms/new` correctly redirected an anonymous session to `/login?redirectUrl=%2Fadmin%2Fcms%2Fnew`. Phase 4 is therefore code-complete and public-reader validated, but deployment approval remains withheld until an authorized account completes WYSIWYG, Production Preview, warning, and save/reload checks in the authenticated CMS.

### Phase 4 acceptance gates

1. H1/H2/H3 tokens produce a clear responsive hierarchy in WYSIWYG, Production Preview, and public articles.
2. Flowing and sticky H2 metrics are identical; sticky handoff causes no measurable layout reflow.
3. Existing heading levels, IDs, duplicate suffixes, aliases, and backward fragment navigation remain unchanged.
4. Long headings and inline formatting wrap without clipping, overflow, or sanitizer regression.
5. Narrow contents start collapsed, expose native disclosure state, and collapse after selection; desktop contents remain visible and sticky.
6. Article-only, left-only, right-only, and both-rail layouts use only the tracks their content requires.
7. Repeated-title and Markdown-heading diagnostics are accurate, advisory, and block-indexed.
8. Typography variants remain intentionally distinct at 100/150/200 percent Reader text, browser zoom, and both themes.
9. Reduced motion, keyboard navigation, screen-reader semantics, build, lint, focused tests, the complete suite, and browser checks pass or unrelated baselines are quantified exactly.

## Phase 5: Lists And Structured Sequences

Phase 1 preserves list meaning. Phase 5 improves author control and presentation without another list plugin.

The existing `@editorjs/list` package remains the only list authoring tool. Its Editor.js `maxLevel` rises from two to three so Tab and Shift+Tab retain the package's native keyboard nesting and outdenting behavior at a documented bound. A small block tune supplies **Standard list** and **Step sequence** instead of introducing a competing list schema or dependency. Step sequence is enabled only for ordered lists; changing list meaning removes the incompatible tune on save.

The Editor.js representation stores the optional tune at `tunes.listPresentation.presentation`. The canonical adapter extracts it into `BlogBlockData.listPresentation`, round-trips it independently from unrelated opaque tunes, and rejects values outside `standard | steps`. Missing presentation stays absent through editor round trips and resolves to `standard` only at render time. Existing flat `items: string[]`, recursive items, checklist state, ordered `start`, and supported numeric, Roman, and alphabetic counter types remain intact.

Public and Production Preview rendering share the same recursive semantic template. Ordered, unordered, and checklist roots expose explicit list semantics even where custom markers remove native browser list styling. Ordered starts and counter types remain native attributes as well as visual counters. Step sequences are restricted to the root ordered list so nested instructions remain readable standard lists. Disabled native checkboxes retain mixed checked state without becoming interactive reader controls.

Marker width, hanging indent, item gap, checkbox size, and nested indentation scale with Reader text. Ordered counters use tabular numerals. Logical properties support right-to-left layout, long rich-text links may break within their content box, and mobile nesting clamps indentation instead of widening the document. The WYSIWYG surface mirrors the restrained Step sequence treatment while leaving the official List tool responsible for editing, paste, and keyboard behavior.

### Migration, deployment, and rollback

Phase 5 adds one optional canonical block field and one optional Editor.js tune. It requires no Firestore backfill, Rule, Function, index, secret, package, or media migration. Legacy posts without the field keep Standard presentation, original list meaning, and original content without being opened or resaved. Invalid tune values and incompatible Step/style combinations follow the Phase 1 compatibility-protection path rather than being silently discarded.

Deploy Phase 5 as a Hosting change after the Phase 1–4 prerequisites are satisfied. Before approval, verify legacy flat lists, three-level recursive lists, ordered starts and counter styles, mixed checklists, long inline links, rich inline formatting, Standard/Step switching, Tab/Shift+Tab, copy/paste, save/reload, both themes, Mobile/Tablet/Desktop preview widths, real narrow viewports, and 100/150/200 percent Reader text.

Rollback restores the previous Hosting artifact. Stored `listPresentation` data stays inert and can be understood again when the Phase 5 client returns; no post rewrite is necessary. Authors should temporarily avoid resaving Step sequences through an older editor build because that build does not expose the tune.

### Phase 5 acceptance evidence — 2026-08-03

Focused validation covers implicit Standard behavior, ordered-only Step sequences, incompatible-style removal, real Editor.js initialization, canonical and unrelated-tune round trips, invalid-tune compatibility protection, recursive semantics through four rendered levels, ordered starts and Roman counters, long sanitized rich-text links, mixed checklist state, Production Preview parity, canonical validation, and role-aware Admin Guide search. The expanded set reaches 112 of 113 passing tests; its only failure is the already documented multi-series chart-renderer expectation, and no Phase 5-focused test fails.

`npm run lint`, both application and spec TypeScript checks, and `npm run build` pass on Node 24.15.0. The production build reports no warnings, an initial bundle of 1.48 MB raw / 337.19 kB estimated transfer, a 49.20 kB raw / 12.00 kB estimated-transfer lazy blog-detail chunk, and the existing 49.68 kB raw / 11.49 kB estimated-transfer Editor.js List lazy chunk. The initial transfer estimate increases by 0.03 kB from Phase 4, and no second list library or dependency was added.

The complete Angular run reaches 726 of 735 passing tests. All nine failures match the quantified baseline: one admin-route expectation, six Publishing Calendar tests missing their Firestore test provider, and two chart-series expectations. No Phase 5-focused test fails in the complete run.

Rendered QA used the current local code with the read-only production-Firestore article at `/blog/how-i-built-my-auto-blog-workflow`. Its ten legacy root lists all resolved to Standard, every rendered list exposed explicit list semantics, and neither the lists nor the document overflowed at 1280 CSS pixels. At 390 by 844 CSS pixels with Reader text at 200 percent, markers and content wrapped inside the viewport with zero list or document overflow; the original 100-percent dark preference and default viewport were restored after the check. The fresh-tab console reported no errors or warnings.

`/admin/cms/new` correctly redirected the anonymous session to `/login?redirectUrl=%2Fadmin%2Fcms%2Fnew`. Phase 5 is therefore code-complete and public-reader validated, but deployment approval remains withheld until an authorized account verifies Standard/Step switching, Tab/Shift+Tab, copy/paste, Production Preview at all three canvas widths, save/reload, and exact raw-JSON round trips in the authenticated CMS.

### Phase 5 acceptance gates

1. Legacy flat, recursive, and checklist blocks render and round-trip without data loss or forced migration.
2. Missing presentation is Standard; only ordered lists can save or render Step sequence.
3. Ordered starts and supported numeric, Roman, and alphabetic counter types remain semantic and visually aligned.
4. Three-level authoring, recursive public rendering, long links, rich inline formatting, and mixed checklist state remain readable without horizontal overflow.
5. List and checkbox semantics remain available to assistive technology while Step sequence remains presentational.
6. Marker, counter, gap, checkbox, and indentation metrics remain usable at 100/150/200 percent Reader text, both themes, and narrow viewports.
7. Existing List-tool keyboard editing and paste behavior remain intact; the presentation tune does not replace or intercept those controls.
8. WYSIWYG, JSON, Production Preview, public rendering, search/reading projections, build, lint, focused tests, the complete suite, and browser checks pass or unrelated baselines are quantified exactly.

## Phase 6: Image Layout And Media Presentation

Phase 6 improves the existing `CmsImageBlockTool`, canonical image block, Production Preview, and public `BlogBlockRendererComponent`; it does not add another image editor or rendering dependency. Existing `fullWidth`, `contained`, `inlineStart`, and `inlineEnd` layout values retain their meaning. The optional `imageSize` field accepts only `small | medium | large | wide`. The editor labels a missing field **Automatic** and omits it again on save, so legacy image blocks do not gain size metadata merely by being opened.

Responsive `clamp()` widths replace the former fixed inline width. Small, Medium, and legacy Automatic inline figures wrap beside text only from 800 CSS pixels upward; they stack when the viewport is narrower or Reader text reaches 150, 175, or 200 percent. Large and Wide always remain in normal article flow. Wide consumes the safe article-column width rather than breaking into a rail or viewport. Figure, optional frame, media button, rendered image, unavailable state, and caption share one bounded logical width. Known positive intrinsic dimensions stay as native width/height attributes to reserve aspect-ratio space; missing dimensions remain accepted. Portrait, landscape, and extreme aspect ratios use `object-fit: contain` without crop or distortion. A failed body image becomes a visible non-interactive status fallback while retaining its accessible description and caption.

The gallery dialog now stores the invoking image control, marks the article and surrounding page branches inert, locks body scroll with scrollbar compensation, moves focus to Close, traps Tab and Shift+Tab, supports Left/Right navigation and Escape, restores previous inert/style values, and returns focus to the original trigger. A failed lightbox request remains inside the operable dialog as an accessible unavailable state. Destroying the renderer also restores any outstanding page state.

Raw Editor.js validation, the canonical validator, adapter round trips, the custom block, media-library replacement flow, public rendering, and Production Preview all share the same bounded size contract. Arbitrary pixel-size strings, custom CSS, non-positive intrinsic dimensions, and malformed known image data cannot silently enter the canonical renderer; direct adapter conversion retains invalid known data in the Phase 1 compatibility envelope.

Phase 6 is an additive Hosting-only data contract. It requires no Firestore backfill, Function, Rule, index, Storage migration, secret, or package change. Rollback restores the previous Hosting artifact; optional stored size values remain inert. Authors should avoid resaving explicitly sized images through an older editor build because the older custom tool does not expose or preserve the new field. Crop ratios, focal points, art direction, responsive `srcset`/`picture` variants, signature validation, and durable media records remain intentionally deferred to Phase 7, where the backend can generate and own those artifacts.

### Phase 6 acceptance gates

- legacy missing-size images remain field-free through editor/canonical round trips;
- all four layouts and all four optional sizes render without arbitrary inline pixel widths or horizontal overflow;
- known positive dimensions are preserved and missing dimensions remain valid;
- portrait, landscape, and extreme aspect ratios remain contained and uncropped;
- broken editor/public/lightbox URLs expose recoverable status rather than a dead control;
- keyboard focus is trapped and restored, background content is inert, body scrolling is restored, Escape closes, and arrow navigation remains bounded to an open gallery;
- WYSIWYG, raw JSON, Production Preview, public reader, both themes, real responsive viewports, and Reader scaling agree;
- the authenticated CMS save/reload and authorized production-post corpus checks pass before deployment approval.

### Phase 6 acceptance evidence — 2026-08-03

The Node 24 production gate passed `npm run lint`, `npm run build`, application TypeScript, and spec TypeScript. The production build completed without warnings at 337.22 kB estimated initial transfer; the lazy blog-detail chunk was 12.02 kB and the existing Editor.js list chunk was 11.50 kB. The complete Node 24 suite reported 736 successes from 745 tests with exactly nine quantified pre-existing failures: six Publishing Calendar tests missing the Firestore provider, one existing admin-route expectation, and two existing multi-series chart expectations. A focused 122-test editor/adapter/validator/preview/renderer/Admin Guide run reported 121 successes and the same pre-existing renderer chart expectation; it produced no Phase 6 failure.

Rendered browser QA used the local production-shaped article route at the default 1280 x 720 viewport and at 390 x 844 with Reader text set to 200 percent. The authorized public article's two legacy images rendered as `data-image-size="automatic"`, loaded at their native 1600 x 900 dimensions, retained their 1600 x 900 width/height attributes, used `object-fit: contain`, and stayed inside the article column. At the mobile 200-percent state, the tested figure, image, and caption shared the same 346-pixel bounded content width, floated `none`, and produced no document, body, or article-content horizontal overflow. Reader preferences and the temporary viewport override were reset after the check.

The rendered gallery moved focus inside the labelled dialog, exposed its caption through `aria-describedby`, marked 27 surrounding page branches inert, locked body scroll, retained focus through forward and reverse Tab, closed with Escape, restored every inert and body-style value, preserved scroll position, and returned focus to the invoking image. The same viewer remained bounded and operable at 390 x 844 and 200-percent Reader text. The article and login-gate console contained no warning or error, no framework error overlay appeared, and screenshots confirmed the desktop article image, desktop gallery, mobile article, and mobile gallery states.

Anonymous `/admin/cms/new` correctly redirected to `/login?redirectUrl=%2Fadmin%2Fcms%2Fnew`; no credential or OAuth action was requested or attempted. Authenticated selection of every explicit size, save/reload parity, raw-JSON and Production Preview comparison, both authenticated themes, and the authorized production-post corpus audit therefore remain the deployment gate. Phase 6 is code-, documentation-, automated-test-, and public-renderer-QA-complete, but it is not deployed or deployment-approved and the full blog-editor program is not yet production-ready. Phase 7 is now implemented as recorded below; the final authenticated production audit remains required.

## Phase 7: Trusted Publishing And Media Backend

### Trusted publishing contract completed in code

`mutateBlogPost` is the only canonical browser write boundary for post save, Draft Preview issue/revoke, and post deletion. It accepts a CMS-role-authenticated actor, one complete post for save operations, a required expected revision, and an opaque request ID. The Function validates the complete typed post and every block, checks bounded counts and serialized size, rejects unsafe URL protocols, then commits through one Firestore transaction. Canonical `/posts`, `/postPreviews`, slug reservations, mutation receipts, and audit documents deny client writes in Rules.

Every accepted transaction advances the post revision exactly once. A stale or remotely deleted revision returns an actionable conflict without writing. Slugs are reserved under `/blogSlugs/{slug}` and legacy posts are checked before a new reservation is accepted, so one post cannot take another post's route. Draft Preview tokens are generated with cryptographic randomness by the backend; issue, replacement, and revocation update the canonical post and preview document atomically. Request receipts are keyed from actor plus request ID, retain the result for seven days, and make a retry after an uncertain response idempotent rather than a second mutation.

`publishDueScheduledPosts` shares the same trusted post validator, revision behavior, slug reservation, and audit model. Each due post is handled in its own transaction, retains its scheduled publication time, becomes published exactly once, and records failures individually so one malformed post cannot block the rest of the schedule. The existing scheduled social reconciliation runs only after this authoritative transition result.

URL enforcement is intentionally expand-and-contract. Read-time Angular structural validation remains permissive so an existing legacy post is not dropped merely because it contains an old URL representation. New Angular saves and the Function boundary require HTTP(S) for external links and embeds, allow only bounded site paths for local navigation/media, and reject protocol-relative, `javascript:`, `vbscript:`, and `data:` destinations. Server-rendered SEO and embed fallbacks now omit unsafe values rather than emitting them.

### Trusted media contract completed in code

New CMS image uploads use the actor-owned create-only staging path `/cms/blog-media-staging/{uid}/{mediaId}/{file}`. Storage Rules require a CMS/media role, the caller's exact UID, an allowed declared image type, and an eight-megabyte maximum; clients cannot read, update, or delete staged objects. Upload completion is therefore signaled directly from the successful write without resolving a staging download URL, and the client passes only the private Storage path to `finalizeBlogMedia`. The Function then verifies the object owner and staging identity, compares declared and stored content types, detects JPEG/PNG/WebP/GIF/AVIF from the actual bytes, reads dimensions with Sharp, and rejects images above forty megapixels.

Accepted images receive bounded 480, 960, and 1600 pixel variants without enlargement. Each available width is encoded as AVIF, WebP, and JPEG with immutable caching, dimensions, byte size, checksum, Storage path, and download identity. The durable record's primary URL remains the largest WebP, preserving the existing delivery contract for cover and article media. The client selects the largest JPEG sibling specifically for `open-graph` uploads. For older published posts that retain a finalized Firebase Storage WebP in an Open Graph field, the crawler renderer safely extracts the trusted media ID, reads only that immutable media record, and selects its widest HTTPS JPEG sibling without rewriting Firestore content. A missing, malformed, or non-managed record keeps the branded fallback image. A durable `/blogMediaAssets/{mediaId}` record and `/blogMediaAudit` entry are written before staging cleanup; an idempotent replay returns that record even after staging has gone. A failed
transformation removes partial generated objects and the staging input instead of leaving an attachable orphan.

`deleteBlogMedia` separates inspection from destruction and is restricted to `admin`, `cmsAdmin`, and `mediaManager`; `contentEditor` retains actor-owned upload/finalize access but cannot destroy canonical media. The default dry run reports all canonical post references by media identity, variant path, or URL. Physical deletion requires an explicit confirmation flag and is rejected while a post reference remains. The reference scan and transition to a ten-minute `deleting` lease occur in one Firestore transaction. Trusted post writes read the same media record and accept only `ready` assets, so a concurrent attach/delete race resolves by retrying and rejecting whichever operation lost the transaction ordering. Partial object-deletion failure is recorded as `delete-failed` without deleting the canonical record, making cleanup observable and safely retryable. Existing public `cms/blog-media` objects remain readable so no historical post image breaks; new finalized variants are public-read/backend-write.

Sharp is installed only in the Functions package. No second editor, client-side image-layout package, arbitrary CSS/pixel control, or Angular production dependency was added.

### Authorization, audit, and emulator evidence

Firestore Rules make posts, recoveries, previews, slug reservations, mutation receipts, publishing audits, and media records backend- or owner-controlled while retaining the existing public published-post and unexpired single-preview reads. Every explicit backend-only collection—including older social-delivery, connection, share, push, comment, poll, and point-event surfaces—is excluded from the legacy recursive administrator fallback so overlapping Rule matches cannot re-enable denied reads or browser writes. CMS roles may read the operational records they need; recovery access stays bound to the exact owner; media roles may read media records; anonymous, viewer, and unrelated authenticated writes are denied. Storage Rules likewise exclude the complete `cms` subtree from their recursive fallback, leaving private staging and public final-media behavior under the specific CMS matches only. Storage emulator coverage verifies staging owner/type/size/create-only behavior, final-asset backend ownership, public final reads, compatibility reads for the legacy media path, and denial of administrator staging reads or CMS-path mutations.

Focused pure and emulator-backed tests cover first save, exact retry replay, stale revision, duplicate slug, Preview issue/revoke, scheduled/manual validation parity, scheduler publication, audit creation, transactional delete, signature mismatch, real Sharp variant generation, durable media replay, reference inspection, referenced-delete denial, explicit unreferenced deletion, and staging/orphan cleanup. The exact Phase 7 command counts and complete-suite baselines are recorded below; this phase is not a deployment claim.

### Phase 7 acceptance evidence — 2026-08-03

The supported Node 24.15.0 implementation gate passed `npm run lint`, `npm run build`, the Functions TypeScript build, all 755 Angular tests, and all 44 non-emulator Functions tests. One initial Angular run reported one transient failure after 754 successes; the assertion was not retained by the truncated runner output and the failure did not reproduce in either of two complete immediate reruns, each of which passed 755/755. The production Angular build completed without warnings at 336.02 kB estimated initial transfer, compared with the Phase 6 baseline of 337.22 kB; the lazy blog-detail chunk remained 11.99 kB and the Editor.js list chunk remained 11.51 kB.

The transactional publishing emulator passed its complete scenario as 1/1, including rejection of non-ready canonical media. The real Sharp 0.35.3 media finalization/deletion emulator passed 1/1 and proved the durable `deleting` state exists before object removal. The Firestore/Storage Rules suite passed 6/6, including administrator-claim denial for private staging reads and backend-only CMS mutations. The Storage emulator emitted only the Firebase-distributed Java runtime's `sun.misc.Unsafe` deprecation warning; no application assertion or rule failed. Root and Functions `npm audit` each reported zero vulnerabilities across their complete production and development dependency trees. The audited dependency repair retained Angular 22.0.7, updated PostCSS to 8.5.25 and the Angular CLI toolchain's transitive Undici to 6.28.0, updated other compatible vulnerable transitives, upgraded Sharp to 0.35.3, hardened Functions `body-parser`, and narrowly overrides Angular CLI's MCP SDK to the compatible patched 1.30.0 path.

Phase 7 is therefore complete in source, documentation, automated tests, local production build, bounded dependency/authorization/rule checks, and Firebase emulators. A separately started exhaustive Codex Security diff scan was paused during discovery at the user's direction and is not counted as completed evidence; its frozen snapshot also predates the final bounded remediations. No Firebase project, live post, Storage object, TTL policy, or public deployment was changed. Authenticated deployed-environment create/edit/retry/conflict/preview/schedule/publish/upload/delete testing, the authorized production-post corpus comparison, coordinated deployment, live monitoring confirmation, and operator sign-off remain explicit gates for the final production-readiness audit.

### Migration, deployment, monitoring, and rollback

No post or media backfill is required. Existing posts keep their IDs, slugs, routes, status, blocks, URLs, and absent optional fields. Legacy revisions still normalize to 0. New slug, receipt, audit, and media collections are additive. The `deleting`, `delete-failed`, lease, actor, and failed-path fields are transient/additive states on new canonical media records and require no rewrite of ready records. Existing legacy media URLs remain public and valid; only new uploads use the staging/finalization pipeline. Before deployment, export the complete authorized post collection plus canonical media records and record checksums.

Deploy Phase 7 in this order:

1. Deploy Functions and verify all new callable and scheduled exports are healthy while the old client-write Rules remain temporarily compatible.
2. Deploy Hosting so authenticated CMS clients use the trusted callable boundary and finalized media pipeline.
3. With a CMS-role account, smoke-test create, edit, retry, stale conflict, preview issue/revoke, schedule, publish, image upload, and canonical reload against the deployed environment.
4. Deploy Firestore and Storage Rules last, converting canonical post/preview/final-media writes to backend-only after the new client is proven.
5. Enable Firestore TTL on `blogMutationReceipts.expiresAt`; receipts remain semantically safe without immediate TTL deletion, but monitoring should alert on accumulation.
6. Monitor callable error rate/latency, scheduled-publish failures, audit creation, media finalization duration, `delete-failed` media records, Storage growth, and unexpected legacy direct-write denials.

Rollback must preserve data access order. First restore the previous permissive Rules required by the old Hosting client, then restore the prior Hosting and Functions artifacts. Keep additive slug, receipt, audit, and media records during the rollback window; they are inert to old readers and are needed for diagnosis/retry. Do not delete new variants or rewrite posts during code rollback. If any post was saved with a Phase 1 compatibility shape, retain the earlier Phase 1 rollback restriction against resaving it in an editor that does not understand that shape.

Phase 7 is code- and emulator-complete only after its full gates pass. It is not deployed or deployment-approved until the coordinated order, authenticated smoke tests, monitoring, and operator sign-off are complete.

## Final Production-Readiness Audit

The final audit occurs only after every phase is implemented. It must not be replaced by a green check for one phase.

Required evidence:

- zero semantic changes across the authorized production-post round-trip corpus;
- unit and integration coverage for every block type and compatibility fallback;
- browser coverage for create, edit, recover, conflict, preview, schedule, publish, and rollback paths;
- visual snapshots at 390, 768, 1280, and 1440 CSS pixels in light and dark themes;
- reader-scale checks at 100, 150, and 200 percent plus browser zoom and reduced motion;
- keyboard and screen-reader checks for editor modes, lists, images, dialogs, table of contents, errors, and recovery;
- Core Web Vitals and bundle-size comparison against the recorded baseline;
- clean browser console for tested routes, with any known unrelated baseline quantified;
- passing `npm run build`, `npm run lint`, Angular tests, Functions build/tests, Firebase emulator rules tests, and browser tests;
- validation on the repository-supported LTS Node.js runtime without an odd-version production warning;
- security review of sanitization, URL validation, authorization, untrusted opaque payloads, uploads, preview access, and destructive media operations;
- documented Hosting/Functions/Firestore/Storage deployment order, backup, rollback, monitoring, and named operator sign-off.

Only after this evidence is reviewed should release notes describe the editor as production-ready.

### Source release-candidate audit — 2026-08-03

All seven implementation phases are complete in the working source. The final local audit passed the warning-free production build, lint, Functions build, 755/755 Angular tests on two complete final reruns, 44/44 non-emulator Functions tests, 1/1 publishing emulator scenario, 1/1 media emulator scenario, 6/6 Firestore/Storage Rules cases, and zero-vulnerability root and Functions dependency audits. Six Playwright cases passed against the current local source at Desktop Chrome 1280 x 720 and Pixel 7 412 x 839 while reading the public live post corpus through the read-only live configuration. Those checks covered the site search drawer, reduced-motion/media reveal behavior, sticky post controls, comments jump, table-of-contents navigation, desktop/mobile responsive behavior, and their tested console surfaces. No live write or deployment occurred.

This commit is a source release candidate, not a live production-readiness sign-off. The following release gates require an authorized environment and therefore remain open:

- checksum-backed export and semantic round-trip comparison of the complete authorized production post/media corpus;
- authenticated create, edit, recovery, stale-conflict, Preview, schedule, publish, upload, reference inspection, and delete exercises in the deployed CMS;
- the complete 390/768/1280/1440 light/dark visual matrix, Reader scale 100/150/200, browser zoom, keyboard, screen-reader, and reduced-motion sign-off across editor and public surfaces;
- Core Web Vitals measurement against the recorded baseline in a deployment-shaped environment;
- coordinated Functions, Hosting, Firestore Rules, and Storage Rules rollout, TTL enablement, backups, monitoring verification, rollback rehearsal, and named operator approval;
- completion or explicit risk acceptance of the paused exhaustive security scan against a fresh post-remediation snapshot.

## Migration

Phase 1 is additive and lazy:

- no bulk Firestore write or required backfill;
- existing flat list strings remain accepted;
- recursive list and opaque-block fields are read when present;
- absent new fields use legacy behavior;
- stored post IDs, slugs, routes, dates, and publication status are unchanged.

Later phases must follow the same expand-and-contract pattern: deploy readers before writers, keep fields optional through at least one stable release, inventory production values, and remove compatibility paths only after evidence shows they are unused.

## Deployment And Rollback

Phase 1 requires coordinated deployment of the Angular Hosting artifact and Firebase Functions because crawler fallback rendering must understand recursive/checklist lists and omit unsupported payloads just like the browser renderer. It does not require a Firestore/Realtime Database/Storage rule, index, secret, or data migration. Before deployment, create the authorized post export and compatibility report. After deployment, open representative legacy, nested-list, checklist, supported-block, and opaque-block posts in the CMS, browser renderer, and crawler fallback without resaving first; then perform controlled round trips on non-production copies.

Rollback restores the previous Functions and Hosting artifacts as one compatibility unit. Because older code does not understand recursive or opaque compatibility data safely, rollback must also disable editing for any post saved with those shapes or restore the pre-deployment post export. Do not resave affected posts with the older editor. Stored content should not be deleted as part of code rollback.

Later backend phases require their own Functions/rules/index deployment order and backward-compatible rollback plan before implementation approval.

## Deliberately Excluded Bloat

The roadmap does not add a second editor framework, arbitrary layout CSS, arbitrary pixel sizing, a broad plugin marketplace, direct AI writes, or presentation-only HTML as the primary content model. New controls must solve a demonstrated authoring need, remain typed and bounded, work in the public renderer, and carry tests and migration behavior in the same change.
