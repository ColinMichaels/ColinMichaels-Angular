# Admin

Administrative tools belong here.

This boundary is reserved for authenticated content management, dashboards, and future CMS routes. Admin-only dependencies should be lazy-loaded from this area.

## Shared Admin Shell

All protected admin pages render inside `AdminShellComponent` instead of rebuilding global navigation per feature.

Component inventory:

- `AdminShellComponent` provides the fixed desktop sidebar, responsive navigation drawer, 64px utility header, environment/account footer, and persistent CMS `New Post` action. Desktop users can collapse the sidebar to a 72px icon rail; labels remain available through hover/focus tooltips and the preference persists locally. The shell also owns the browser-tab title while active, using the same URL-derived section label shown in the utility header so navigation cannot retain stale metadata from a previous admin page.
- `admin-navigation.config.ts` defines grouped destinations, icons, exact/prefix matching, page titles, and role visibility for Overview, Publishing, Site Content, Assets, and Administration.
- `AdminEnvironmentBadgeComponent` supports the compact shell-footer treatment while preserving the detailed badge for feature surfaces that need it.
- `AdminPageHeaderComponent` provides the shared page identity, description, and projected action layout adopted by Homepage Hero, Topics, and Recommended Links. It changes presentation only; routes, forms, and persistence remain owned by each manager.
- `AdminEditorActionBarComponent` provides a shared inline or panel save surface with live status, busy semantics, and projected feature-owned actions. Homepage Hero, Topics, and Recommended Links retain their existing submit/delete handlers while reporting saving and unsaved states consistently.
- `AdminStatCardComponent` standardizes the compact metric cards used by Homepage Hero, Topics, and Recommended Links while accepting the managers' existing computed values as inputs.
- `AdminAlertComponent` and `AdminEmptyStateComponent` standardize assertive load-error announcements and polite empty-list feedback while preserving each manager's feature-owned message.
- `AdminSearchFieldComponent` standardizes the labeled search control used by Topics and Recommended Links while each manager continues to own its local filtering state.
- `AdminControlModuleComponent` provides a compact disclosure row for secondary or infrequently changed settings. Its projected content remains mounted while hidden so forms, uploads, and in-progress edits are preserved when a module is collapsed.
- `AdminOverviewComponent` is an operations dashboard backed by `BlogRepositoryService`, with publishing counts, the next scheduled post, recent drafts, recently published posts, and role-aware management links.
- `AdminGuidePageComponent` provides the searchable `/admin/guide` operating manual with stable fragment links, clipboard sharing, direct protected-route actions, a desktop contents rail, and a mobile jump menu.
- `admin-guide.content.ts` is the typed instruction source. It filters entries by the shared route-role constants before search, Common tasks, categories, and result counts are derived, so unauthorized workflows are absent rather than disabled.
- `UserManagementPageComponent` keeps role changes and the admin-only **View as User** entry in one protected account workflow. The preview confirmation states that role/profile UI is simulated while Firebase requests retain the actor's admin identity.
- `PublicSubmissionsPageComponent` provides the CMS-role-gated `/admin/submissions` master-detail inbox with status counts, full-text local filtering, private contact/proposal detail, alert health, reversible review actions, and a real response composer.
- `PublicSubmissionService` listens to the read-only Firestore review collection and routes status changes plus email responses through trusted callable Functions.
- Shared `UserViewBannerComponent` remains fixed above route content while a preview is active, identifies the target and roles, reports disabled accounts, and provides the recovery-safe **Exit View** action.

The public `SiteHeaderComponent` is intentionally not rendered on `/admin/**`. Existing routes and guards remain unchanged; the shell only reorganizes navigation and page composition.

The Admin Guide currently covers the shared shell plus Posts, scheduling, Bulk Editor, Social Connections, Authors, Homepage, Daily Discovery, Topics, Recommended Links, Media Library, Submissions, Comments, and Users. The checked-in `agents/skills/update-admin-guide` skill and its local `$update-admin-guide` installation define the required source, permission, test, documentation, and rendered-validation workflow after future blog or admin features change. See `docs/ARCHITECTURE/ADMIN_GUIDE.md` for the complete contract and rollback notes.

The post editor uses compact control modules to keep the writing surface visible: Post Details stays open while Publishing, Cover Image, Search & Sharing, Draft Preview, SEO, AI suggestions, Recovery & Conflicts, and Last Saved details start collapsed. Each closed module exposes a live summary or status badge, and validation opens the module containing a field that needs attention. At the desktop `xl` breakpoint, the right-side inspector stays pinned beneath the 64px admin header and scrolls within a viewport-bounded region above the fixed action bar. The sticky mobile command bar keeps status and Save visible, with View/Delete actions in a compact contextual menu, so it does not obscure the editor.

## Daily Discovery Administration

Daily Discovery is available at `/admin/cms/daily-discovery` for CMS roles (`admin`, `cmsAdmin`, and `contentEditor`). The screen uses `getAdminDailyDiscoveryQuestionSet` to inspect one dated canonical set and `saveAdminDailyDiscoveryQuestionSet` to validate and create or replace a complete generated JSON set. Question sets remain private backend records because they include accepted answers.

The page accepts a dated `.json` file, drag-and-drop, or pasted JSON; provides structured editing for prompts, hints, type, difficulty, estimated time, choices, correct answers, explanations, and source evidence; and can load an existing imported multiple-choice set back into the editor. Automatic title-gap sets remain view-only and require a complete generated JSON replacement. An edited draft can be downloaded without writing Firestore.

The save boundary verifies every source against a published non-Cat-Corner post, requires explicit approval for draft/manual-review input, blocks past Eastern dates, uses optimistic revisions for replacements, and records an audit event plus an idempotent retry receipt. Replacing the current live date also requires explicit confirmation and the same ordered question IDs so completed reader progress and point awards stay stable. Firestore Rules deny direct browser access to the question, receipt, and audit collections. The guarded `npm run import:daily-discovery` command remains available as a create-only recovery/operator path. See `docs/ARCHITECTURE/DAILY_DISCOVERY.md` for the JSON contract, local testing, deployment, and rollback requirements.

## Authors And Post Assignment

The author manager is available at `/admin/cms/authors` for CMS content roles. It owns canonical profiles stored in
Firestore `/authors`; post forms reference those profiles rather than maintaining independent free-text author data.

Component inventory:

- `CmsAuthorManagerComponent` provides the author list plus create and edit controls for canonical profile fields and publication status; its avatar control reuses the Media Library picker/uploader and stores the resulting Firebase URL.
- `AuthorRepositoryService` owns default Colin fallback, normalization, published/admin projections, lookup, and reference checks.
- `AuthorStorageService` owns auth-aware Firestore reads and writes for `/authors`.
- `CmsPostEditorComponent` provides an author selector and inline add-author form, defaults new posts to Colin Michaels, and refreshes the embedded byline snapshot when saving.
- `CmsPostListComponent` includes an Author column and author-aware text search/sorting without changing the post route or pagination contract.

Safety and migration notes:

- A published post must reference a published canonical author.
- Existing posts without `authorId` resolve to Colin and can be backfilled without changing their routes or content.
- Author deletion remains unavailable while posts reference that profile; reassignment must be explicit.
- The homepage continues to use Colin's shared profile regardless of author assignments.
- See `docs/ARCHITECTURE/AUTHORS_AND_BYLINES.md` for the public route, snapshot, search, SEO, deployment, and rollback contracts.

## Content Operations Bulk Editor

The Bulk Post Editor is available at `/admin/cms/content-operations` for CMS content roles. It is the first dry-run slice of the future content-operations service and does not write to canonical posts.

Component inventory:

- `ContentOperationsPageComponent` provides a dense audit table, filters, selection, local manifest import, safe candidate editing, validation, and responsive desktop/mobile review layouts.
- `content-operations.models.ts` defines capability, artifact descriptor, diff, guard, validation, and CMS-local working-item contracts.
- `cms-post-artifact.adapter.ts` owns opaque current-post JSON serialization, SHA-256 descriptor generation, allowlisted diffs, and protected-field validation.
- `post-optimization-manifest.adapter.ts` validates the existing optimization manifest and converts matched rows into metadata/taxonomy candidates without changing canonical fields.
- `content-operations-audit.ts` reuses the existing CMS SEO checklist for compact per-post issue filtering.

Safety and migration notes:

- Only SEO title, meta description, categories, and tags can change in a candidate.
- Post ID, slug, display title, body, status, dates, canonical URL, and media stay protected.
- Redirect-required recommendations are blocked.
- The imported manifest is read-only migration input, not the future API contract.
- Apply and publish stay locked until authenticated revisions, approval, concurrency, audit, and idempotent apply boundaries exist server-side.
- AI providers may propose candidate artifacts in a later phase but may not write posts directly.

See `docs/ARCHITECTURE/CONTENT_OPERATIONS_BULK_EDITOR.md` for the full data flow and deferred service design.

## CMS AI Assistant

The blog editor includes a CMS-local writing assistant for metadata drafting:

- Suggested titles
- Suggested excerpts/descriptions
- Suggested SEO title and description
- Suggested categories and tags
- Thumbnail generation prompt ideas

The editor calls Firebase callable functions first and falls back to the deterministic local provider when the backend is unavailable. The OpenAI key must stay in Firebase Secret Manager, not Angular environment files.

## CMS Editor.js Tools

Reliability component inventory:

- `CmsPostEditorComponent` combines form, Social Shares, and Editor.js dirty state; owns recovery/conflict controls; and never treats recovery as canonical Save Post.
- `EditorJsComponent` keeps WYSIWYG, Production Preview, and JSON synchronized; emits authoring/source changes; and can snapshot/restore exact recovery state, including invalid raw JSON.
- `CmsProductionPreviewComponent` supplies local light/dark, Mobile/Tablet/Desktop canvas, 100/150/200 percent Reader text, and reduced-motion review controls while rendering blocks through the public `BlogBlockRendererComponent` and keeping polls read-only.
- `CmsPostRecoveryService` stores schema-versioned recovery documents under `/postDrafts/{ownerUid}/recoveries/{encodedPostId}`, applies 30-day expiry, and deletes copies on explicit cleanup paths.
- `pendingPostChangesGuard` protects both editor routes; `beforeunload` covers browser refresh and close.
- `BlogPublishingService` sends canonical post save/delete and Draft Preview issue/revoke operations through the CMS-role-gated `mutateBlogPost` callable. `BlogStorageService` remains the read/serialization adapter and no longer writes `/posts` or `/postPreviews` directly. The Function owns complete-schema validation, expected revisions, slug reservation, idempotent receipts, atomic preview state, and audit records; scheduled publishing reuses the same validator and transaction contract.

The CMS editor extends the base Editor.js toolset with custom `code`, `markdown`, `typography`, `stats`, `chart`, `poll`, `sunoEmbed`, and `html` blocks. Structured blocks store typed data rather than presentation-only HTML, so public blog rendering and assistant prompts can consume the content consistently. Chart blocks accept flat `chartPoints` rows or standard Chart.js `labels`/`datasets` JSON, preserve optional series labels during editing, and render each line series independently on public posts. Markdown blocks preserve their source and are parsed through the sanitized public renderer. Editor blocks are styled with hover/focus block-type hints and preview-oriented rendering so drafts better resemble the published post while editing.

The content-safety compatibility layer accepts the original flat `items: string[]` list contract and the recursive Editor.js list contract without requiring a Firestore migration. Recursive list items preserve their content, child items, and checklist state through editor round trips; reading time, search, and assistant text projections include nested content in visual order. An Editor.js block that is not supported by the canonical renderer is retained as an opaque compatibility payload containing its original type, data, and optional tunes instead of being discarded. It reopens in the visual editor as an inert **Compatibility protection** block with **View preserved JSON**, and is omitted from public rendering; authors should not remove it unless they intend to remove or separately migrate the original block. Valid unknown blocks raise a preservation warning. Structurally malformed known blocks raise block-indexed validation errors and cannot leave JSON mode or save; direct adapter conversion still envelopes them instead of dropping data.

Lists continue to use the existing `@editorjs/list` tool, with authoring nesting bounded to three levels. The custom `listPresentation` block tune adds only **Standard list** and **Step sequence**; Step sequence is available for ordered lists and is removed if the block changes to unordered or checklist. The raw Editor.js shape is `tunes: {listPresentation: {presentation: 'steps'}}`, while canonical blog data stores `data.listPresentation`. Missing presentation stays implicit and renders as `standard`, so opening and saving a legacy flat, recursive, or checklist list does not add a field or change meaning. Public ordered lists preserve `start` and counter type, all list variants keep native list/checklist semantics, and marker size, hanging indent, nested spacing, long-link wrapping, and checklist controls follow Reader text scale without mobile overflow.

Images continue to use the existing `CmsImageBlockTool` and media-library picker. Layout meaning remains `fullWidth`, `contained`, `inlineStart`, or `inlineEnd`; the optional canonical `data.imageSize` and raw Editor.js `data.imageSize` accept only `small`, `medium`, `large`, or `wide`. **Automatic** is the editor representation of a missing size and deliberately omits the field, so legacy images are not rewritten merely by opening and saving a post. Responsive `clamp()` widths replace the former fixed inline width, Large/Wide media stays in normal article flow, and inline media stacks below 800 CSS pixels or at 150/175/200 percent Reader text. Figures, media, frames, and captions share one bounded width and never accept arbitrary pixels or CSS. Positive intrinsic dimensions are preserved when known; missing dimensions remain valid. Broken public images become a visible, non-interactive fallback without dropping their captions. The public lightbox traps focus, restores the triggering control, makes background content inert, locks page scroll, supports Escape and arrow navigation, and retains an accessible failure state.

The Article Content toolbar switches one synchronized Editor.js document among WYSIWYG, Production Preview, and editable formatted JSON. Production Preview converts the current unsaved document through the canonical adapter and passes the resulting blocks to the exact public `BlogBlockRendererComponent` and sanitized rich-text boundary; it does not save, issue a public preview token, or create canonical data. It offers local light/dark, Mobile/Tablet/Desktop canvas, 100/150/200 percent Reader text, and reduced-motion review controls. Canvas widths are convenient surface checks rather than replacements for real browser viewport validation. Preview polls are read-only so author review cannot write reader votes. Compatibility-protected blocks remain omitted exactly as they are publicly, with an admin-only count that never exposes opaque payload data.

Entering JSON mode captures the current visual or preview document. JSON edits are validated live for the Editor.js document and block shape, remain in source mode when invalid, and must validate successfully before entering Production Preview or WYSIWYG. Save Post consumes the active view directly, so valid source edits do not require a separate apply step. Reset restores the document that was initially loaded into the editor. Phase 3 adds no persisted field, Firestore migration, Function, Rule, dependency, or public-preview-token change; the production renderer is deferred until the local preview is opened.

The heading audit keeps the post title as the page’s only H1, recommends Heading level 2 for major sections and level 3 for subsections, warns when the first Heading block repeats the current post title, and warns when a Markdown block contains a heading that will not enter the generated table of contents. These are non-destructive author warnings: stored heading levels, heading text, Markdown source, and historical anchor IDs remain unchanged. Production Preview uses the same responsive title/H2/H3 tokens as the public article, including restrained rules, bounded heading measure, stable sticky metrics, both themes, and Reader text scaling.

Phase 2 adds one unified dirty state across the form, Social Shares, WYSIWYG, image insertion, and raw JSON; browser and Angular route-leave protection; a 1.5-second debounced owner-scoped recovery copy under `/postDrafts`; 30-day recovery retention; and transactional monotonic post revisions. Recovery retains invalid JSON source, can be compared/restored/discarded, and is deleted after successful canonical save when possible. Stale revisions and remote deletion never overwrite local work: the operator can reload the remote post or explicitly save local content as a new draft. Recovery never publishes, schedules, issues a preview, or writes `/posts` by itself.

Phases 1–7 now cover compatibility, editing recovery/concurrency, local production-renderer parity, article heading structure/typography, semantic list presentation, responsive image/lightbox presentation, and trusted server-owned publishing/media processing. Phase 7 automated and emulator evidence is complete, but the coordinated Functions/Hosting/Rules deployment, authenticated deployed-environment smoke tests, monitoring confirmation, and final cross-surface audit remain. See `docs/ARCHITECTURE/BLOG_EDITOR_PRODUCTION_READINESS.md` for acceptance, migration, deployment, and rollback gates. Do not describe the complete editor as production-ready until those gates and the final audit pass.

Markdown persists as `{ type: 'markdown', data: { markdown: string } }`. The public renderer parses that source with `marked`, passes the resulting HTML through Angular's HTML sanitizer, removes unsafe link destinations, and normalizes a block-local level-one heading to `<h2>` so a post never gains a second document `<h1>`. Search, reading-time estimates, and local metadata suggestions use a lightweight plain-text projection that removes Markdown formatting and link destinations without rewriting the stored source. This is an additive block type with no data migration; rolling back the UI leaves saved Markdown data intact, but an older editor build should not resave a post containing an unsupported block type.

Supported typography variants:

- Lead paragraph
- Section intro
- Pull quote with optional attribution
- Key takeaway with optional label
- Callout with optional label
- Warning / update with optional label
- Aside
- Caption / note
- Eyebrow text

Supported image layouts:

- Full width
- Contained
- Inline left
- Inline right

Optional image sizes:

- Small
- Medium
- Large
- Wide

Missing size remains **Automatic** for legacy compatibility. Crop ratios, focal points, arbitrary pixel widths, and custom CSS remain intentionally unsupported. New trusted image uploads generate bounded responsive AVIF/WebP/JPEG variants server-side without rewriting existing image blocks or legacy media URLs.

Supported custom content blocks:

- Code: multi-line snippets with optional language labels, soft-wrapped CMS previews, and reader-facing copy actions on public posts
- Stats: repeated label/value/caption items for specification snapshots and key metrics, with CSV/JSON file import, pasted comma-separated row import, required-field help, and downloadable examples
- Chart: Chart.js bar or line charts that support the original single-series point editor plus JSON-backed labels and multiple datasets, per-series colors, legends, axis titles and bounds, value formatting, source links, accessible summaries/tables, CSV/JSON point import, required-field help, and downloadable examples
- Poll: two to eight stable answer options, authenticated one-vote-per-account updates, `afterVote`, `always`, or `hidden` result visibility enforced by backend callables, and an author-controlled right-rail or inline article placement; see `docs/ARCHITECTURE/EDITORJS_POLLS.md` and `docs/ARCHITECTURE/BLOG_READING_RAILS.md`
- Suno Song: an exact Suno song/embed URL plus optional caption, normalized into the existing typed blog embed model and rendered with a responsive sandboxed player and direct fallback; see `docs/ARCHITECTURE/EDITORJS_SUNO_EMBEDS.md`
- HTML: sanitized custom markup for one-off sections such as spec tables or static SVG snippets; scripts and unsafe markup are not rendered

Required backend setup:

```bash
firebase functions:secrets:set OPENAI_API_KEY
npm --prefix functions install
npm run build:functions
firebase deploy --only functions,firestore,database,storage
```

## Authentication And Roles

Admins can start a tab-scoped role/profile preview from `/admin/users` with **View as User**. The preview changes Angular navigation, route guards, Profile identity, badges, account projections, and role-filtered guidance without replacing the Firebase Auth session. It is read-oriented: callable Functions and Firebase Security Rules still evaluate the real admin token, so backend denials must be verified with the real account, an emulator account, or dedicated permission tests. See `docs/ARCHITECTURE/ADMIN_USER_VIEW.md`.

Enable Google sign-in in Firebase Console under Authentication > Sign-in method > Google. Make sure the deployed site domain and any local development domain are listed under Authentication > Settings > Authorized domains.

Grant the first admin from a trusted shell with Application Default Credentials or a service account:

```bash
npm --prefix functions run set-admin -- --email user@example.com
```

If Application Default Credentials cannot infer the Firebase project, pass it explicitly:

```bash
npm --prefix functions run set-admin -- --project colinmichaels --email user@example.com
```

Grant a future role:

```bash
npm --prefix functions run set-admin -- --email user@example.com --role contentEditor
```

Revoke access:

```bash
npm --prefix functions run set-admin -- --email user@example.com --revoke
```

Revoke a specific role:

```bash
npm --prefix functions run set-admin -- --email user@example.com --role contentEditor --revoke
```

Optional function params:

- `OPENAI_TEXT_MODEL`, default `gpt-5.5`
- `OPENAI_IMAGE_MODEL`, default `gpt-image-2`

Generated 16:9 thumbnails are written to Firebase Storage under `cms/blog-thumbnails/{slug}/` and the returned download URL is applied to the post Cover Image field.

Manual blog image uploads reuse `BlogMediaUploaderComponent` and `BlogMediaUploadService`, but the trusted storage identity is no longer a client-owned final URL. JPEG, PNG, WebP, AVIF, and GIF inputs are uploaded to the authenticated actor's create-only `cms/blog-media-staging/{uid}/{mediaId}/` path. Because staging reads are intentionally denied, the client treats the successful write callback as completion, skips staging URL resolution, and gives `finalizeBlogMedia` the private Storage path. The Function verifies the stored metadata and actual file signature, enforces the eight-megabyte and forty-megapixel bounds, generates bounded 480/960/1600 AVIF/WebP/JPEG variants without enlargement, records dimensions/checksums/paths in `/blogMediaAssets`, and returns the largest WebP as the canonical selection. Staging and partial variants are cleaned after success or failure, and a repeated finalization request returns the durable record. Existing legacy `cms/blog-media` URLs remain
public/readable and require no backfill. A post can attach a Phase 7 media identity only while its canonical record is `ready`; this check shares the post transaction with the save.

The post editor's Post Images module keeps the cover required, lets selected posts opt into a separate `post-background` asset, and can detach that background without deleting the reusable media item. Inside Editor.js, both the header-level Insert Image action and the inline Image block's Choose Existing action reuse the same media-library stream; the inline action fills the current block instead of inserting a duplicate. The Social Shares composer may still choose existing supported media or use its established generic video path; new image uploads use the trusted finalizer. Client optimization is only an upload-size convenience and never the trust boundary. Physical canonical image deletion is a separate callable restricted to `admin`, `cmsAdmin`, and `mediaManager`; `contentEditor` does not receive destructive media access. Inspection reports post references first, confirmation is explicit, and the backend atomically establishes a ten-minute `deleting` lease before Storage removal. Referenced assets are rejected, concurrent post attachments cannot commit against the non-ready record, and partial failures retain `delete-failed` state for retry. The current Media Library Delete action remains a reversible library-status change and does not invoke this physical deletion boundary.

Draft preview links are generated from the CMS editor only for posts that remain in `draft` status. The backend creates the random token and atomically updates the canonical revision plus `postPreviews/{token}` snapshot; replacement and revocation remove the previous token in the same transaction. Firestore Rules allow public single-document reads only while the embedded post is still a draft and the preview expiry timestamp is in the future; clients cannot create, update, list, or delete preview documents directly.

## Homepage Hero Manager

The homepage hero manager is available at `/admin/cms/homepage`. Automatic selection uses the newest published post
marked Featured while retaining all older feature flags; Selected post remains an explicit manual override. Legacy
Latest settings normalize to this automatic featured policy without a Firestore migration.

The manager includes an explicit `Use featured post background` toggle, which defaults off for existing and new
settings. When enabled and the resolved hero post has a Full-screen Post Background, the public homepage uses that
single image until the option is disabled, the field is removed, a different post resolves, or the image fails to
load. Otherwise the published slideshow plays normally. The post editor owns the reusable background attachment; the
homepage manager does not duplicate it into hero settings.

## Topic Manager

The topic manager is available at `/admin/cms/topics` and is restricted to CMS content roles. It manages Firestore-backed topic hub documents that drive the homepage topic landing section, public topic detail pages, and site search topic entries.

Component inventory:

- `CmsTopicManagerComponent` provides topic list/search, create, edit, delete, refresh, and default seeding controls.
- `TopicHubRepositoryService` owns topic templates, slug uniqueness, ordering, published/admin projections, default seeding, and public fallback behavior.
- `TopicHubStorageService` mirrors the blog storage pattern with auth-aware Firestore listeners: CMS users read all `/topics`, public users read only published topics.
- `topic-hub-validation.util.ts` validates Firestore topic documents before they enter public rendering.

Migration notes:

- Existing topic names and slugs remain unchanged for SEO. The shipped static topics are now the bootstrap/fallback set and can be seeded into Firestore from the manager.
- Public pages continue to show the default topics when Firestore has not been seeded yet. Once `/topics` contains managed documents, published documents control public topic ordering and visibility.
- Firestore rules allow public `get/list` only for published topics and restrict create, update, and delete to CMS content roles.

## Recommended Links Manager

The recommended links manager is available at `/admin/cms/recommended-links` and is restricted to CMS content roles. It manages the homepage links section below the author bio.

Component inventory:

- `CmsRecommendedLinksManagerComponent` provides link list/search, create, edit, delete, refresh, and default seeding controls.
- `RecommendedLinkRepositoryService` owns default links, admin/public projections, normalization, stats, default seeding, and featured-slot conflict resolution.
- `RecommendedLinkStorageService` mirrors the blog/topic storage pattern with auth-aware Firestore listeners: CMS users read all `/recommendedLinks`, public users read only published links.
- `recommended-link-validation.util.ts` validates Firestore link documents before they enter public rendering.

Migration notes:

- The hardcoded homepage links are now the bootstrap/fallback set and can be seeded into Firestore from the manager.
- Public rendering uses published links assigned to featured slots 1, 2, and 3. Saving a link into an occupied slot clears that slot from the previous link, keeping the homepage capped at three featured recommendations.
- Firestore rules allow public `get/list` only for published recommended links and restrict create, update, and delete to CMS content roles.

## Publishing Calendar And Social Plans

The publishing Calendar is available at `/admin/cms/calendar` for CMS content roles. It renders scheduled and published posts on a Monday-first month grid and keeps social announcements attached to their source post.

Component inventory:

- `PublishingCalendarComponent` provides the full scheduling workspace: month navigation, scheduled/published/social filters, day agendas, post lookup, inline post rescheduling, an upcoming queue, and social announcement create/edit/cancel controls.
- `PublishingCalendarMonthComponent` is the shared Monday-first month grid used by both the full Calendar and the post editor. `publishing-calendar.utils.ts` owns the shared event and day projection so both surfaces show the same post schedule.
- `PostScheduleCalendarComponent` embeds that month grid under the post editor's Publish Date field, excludes the post being edited, shows other scheduled posts on the selected day, and offers open 9:00 AM, noon, 3:00 PM, and 6:00 PM suggestions without leaving the draft.
- `BlogSocialPromotion` stores provider-specific messages and delivery times without changing the public blog post rendering contract.
- `publishScheduledPosts` queues due announcements in the protected `socialOutbox` collection after their source article is published.

Migration notes:

- The editor calendar uses the existing `status` and `publishedAt` fields and the existing `BlogRepositoryService` stream. It requires no post backfill, Rules change, Function change, or deployment ordering beyond the normal Hosting release.
- Suggested slots are editorial guidance, not a new backend uniqueness rule. Editors can still type another future time when closely spaced publishing is intentional.
- Existing posts require no backfill because `socialPromotion` is optional.
- Editors can attach multiple later announcements to a post that is already published.
- This release creates durable outbox work but does not call social-provider APIs. Provider OAuth, Secret Manager credentials, media preparation, retries, and delivery workers are the next integration phase.
- See `docs/ARCHITECTURE/PUBLISHING_CALENDAR.md` for the connector matrix and delivery design.

Admin authorization is enforced through Firebase Auth custom claims. The UI, callable functions, Realtime Database rules, Firestore rules, and Storage rules treat these claims as admin-capable:

- `admin: true`
- `cmsAdmin: true`
- `roles.admin: true`

Route guards can also require named roles by setting route data, for example `data: {roles: ['admin', 'contentEditor']}`. The `admin` role is the super-admin override for protected admin routes. `cmsAdmin` only authorizes routes that explicitly list it. Any route-level role must also be enforced in Firebase Functions and Security Rules before it protects real data.

Known account and permission roles are defined in `src/app/shared/user-account/user-account.model.ts`:

- `admin`
- `cmsAdmin`
- `contentEditor`
- `mediaManager`
- `viewer`
- `trustedCommenter`
- `catCornerAddict`

The `/admin` overview accepts only its configured administrative subset and conditionally displays available tools. CMS routes are limited to content-capable roles, media routes are limited to media-capable roles, and user management remains limited to `admin`; reader roles such as `trustedCommenter` and `catCornerAddict` do not enter the admin console.

Signed-in users can inspect their current Firebase Auth profile, provider IDs, assigned roles, and point activity at `/profile`. Every bootstrapped `/users/{uid}` document receives the non-privileged `user` role for profile/status display; admin and CMS permissions still require Firebase custom claims.

`catCornerAddict` is a non-administrative reader role. It reveals the Cat Corner hub/menu and renders a profile badge, but it does not grant access to `/admin`, CMS writes, media management, moderation, or user management. Admin user management may still grant or revoke it manually.

## User Management

The user management console is available at `/admin/users` and is restricted to the `admin` role, not `cmsAdmin`.

It calls Firebase callable functions:

- `listAdminUsers`
- `updateAdminUserRoles`
- `setAdminUserDisabled`
- `deleteAdminUser`

All four functions require an authenticated Firebase user with `admin: true` or `roles.admin: true`. Role updates preserve unrelated custom claims, store future permissions under the `roles` custom-claim map, and mirror `admin` / `cmsAdmin` at the top level for compatibility with existing rules. Users must refresh their Firebase ID token, usually by signing out and back in, before new role claims affect their session.

Sign-in disable/restore and deletion are serialized against role changes for the same UID. Administrators cannot disable, restore, or delete their own account from User Management. Disabling preserves the Auth record, providers, roles, and site data while rejecting future sign-ins and refreshes; the callable also explicitly revokes refresh tokens. Deletion requires the exact email or UID as server-validated confirmation and removes only the Firebase Auth record. It deliberately preserves `/users/{uid}`, comments, points, authored content, and other site data, and it does not prevent the deleted email from registering again. Structured Functions logs record the actor UID, target UID, action result, and timestamp without logging the target email.

Component inventory:

- `UserManagementPageComponent` lists Firebase Auth users, filters loaded rows, pages through Auth results, edits role claims, and presents explicit disable, restore, and typed-delete confirmations.
- `UserManagementService` is the feature-scoped Firebase Functions client for user administration callables.

## Public Submission Inbox

The submission inbox is available at `/admin/submissions` for `admin`, `cmsAdmin`, and `contentEditor` roles. It reads protected `/publicSubmissions` records and never grants the browser direct mutation access.

Component inventory:

- `PublicSubmissionsPageComponent` provides status counts and filters for New, In review, Responded, Archived, and Rejected records; local text search; selected submission detail; alert-delivery health; reversible review actions; and the email response composer.
- `PublicSubmissionService` owns the Firestore listener plus `reviewPublicSubmission` and `respondToPublicSubmission` callable clients.
- `public-submission.models.ts` normalizes stored contact/proposal and alert state, preserves legacy `new` defaults, and owns the search/summary projections.
- `functions/src/public-submission-email.ts` builds privacy-minimized owner alerts, escaped reply messages, deterministic message IDs, bounded review requests, and authenticated SMTP delivery.

Safety and migration notes:

- New accepted submissions trigger a server-side owner alert only after Firestore creation. Alert failure is visible in the inbox and never changes the visitor's successful form result.
- Owner alerts contain a summary and protected inbox link, not the full private message or proposal.
- Start review, Archive, Reject, Restore to review, and successful response transitions are backend-owned. Archive and Reject retain the record and do not delete submitted information.
- Responses are stored in the submission's protected `responses` subcollection. A failed SMTP delivery remains failed and does not mark the submission Responded.
- Email requires the two `PUBLIC_SUBMISSION_SMTP_*` secrets plus authenticated SPF/DKIM sender configuration. No credential belongs in Angular, Firestore, or tracked environment files.
- Existing submission documents require no migration. The inbox treats any missing or unknown status as New.

## Comment Moderation And Engagement

The comment moderation console is available at `/admin/comments` for CMS-capable roles.

- New reader comments are submitted through the `submitPostComment` callable.
- Comment writes are server-only: direct Firestore creates are denied so clients cannot bypass callable validation.
- Localhost moderation requires Functions and Firestore to point at the same backend. The local Angular config connects to the local Firestore emulator at `127.0.0.1:8080` and Functions emulator at `127.0.0.1:5001`; use `npm run serve:emulators` when testing comments fully locally. Full emulator mode uses isolated local data, so seed/import posts before expecting the local blog list to match production content.
- The admin route shell displays a Firebase environment badge throughout `/admin/**` so operators can see whether the current build is using emulator data, live Firebase, or a mixed setup. Use `npm start` for emulator-backed local testing and `npm run start:live` for deliberate localhost testing against live Firebase.
- Comment bodies are plain text in v1. The callable rejects URLs, bare domains, email addresses, Markdown links, HTML, encoded tags, localhost/IP links, and script/data/mail schemes. Link support should be added later as a trusted-user feature with explicit moderation rules.
- Readers can reply to approved comments. Replies are stored in the same `postComments` collection with `parentCommentId`, `parentAuthorDisplayName`, `threadRootId`, and `threadDepth`; the callable rejects replies to missing, unapproved, or cross-post parent comments.
- Public blog pages load only the 10 most recent approved comment documents on first render, using a `View more comments` control to expand the window in 10-comment increments.
- First-time commenters are held as `pending`; approved commenters become trusted and future comments publish immediately.
- Users with `trustedCommenter`, `admin`, `cmsAdmin`, or `contentEditor` publish comments immediately.
- Comment approval awards points through the server-side point ledger. Reads and shares are also recorded by callable functions and de-duplicated per user/post/provider.
- Signed-in homepage and post shares can register opaque provider-specific attribution IDs. Landing telemetry is stored separately and never awards points, preventing social preview crawlers from becoming a reward signal.

Migration notes:

- Existing admins created by `functions/scripts/set-admin-claim.mjs` remain compatible because the UI reads both top-level `admin` / `cmsAdmin` claims and the nested `roles` map.
- Keep future permission names in the `roles` map; only mirror top-level claims when existing Firebase rules require backwards compatibility.

## Media Library Organizer

The admin media library is available at `/admin/cms/media-library` and lives under `src/app/admin/media-library`.

Component inventory:

- `MediaLibraryPageComponent` coordinates media loading, filtering, sorting, selection, uploads, dialogs, and keyboard shortcuts.
- Sidebar, toolbar, grid/card, inspector, preview, filter, batch rename, resize, tag editor, and status bar components are standalone and feature-scoped.

Service and migration notes:

- `MediaLibraryService` uses the existing `FirestoreService` and `BlogMediaUploadService`; finalized image results retain their canonical media identity and variant metadata in the library item instead of creating a competing upload pipeline.
- Image uploads keep the CMS client optimization as a convenience, then pass through `BlogMediaFunctionsService` for trusted finalization. Other media uses the existing generic Firebase Storage progress wrapper and is not represented as a trusted blog-image asset.
- `BlogMediaUploaderComponent` remains image-only by default, but consumers can opt into allowed Media Library types; Social Shares uses this contract for image or video attachments and enforces the existing 8 MB image and 25 MB generic-media limits before upload.
- Metadata rename updates display names only and intentionally does not rename Storage objects.
- Resize requests go through `MediaProcessingService`, which calls callable Firebase Functions named `resizeMedia` or `batchResizeMedia` when those existing functions are deployed.
- If production media metadata already uses different collection names, change the service constants instead of component logic.
