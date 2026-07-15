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
- `AdminControlModuleComponent` provides a compact disclosure row for secondary or infrequently changed settings. Its projected content remains mounted while hidden so forms, uploads, and in-progress edits are preserved when a module is collapsed.
- `AdminOverviewComponent` is an operations dashboard backed by `BlogRepositoryService`, with publishing counts, the next scheduled post, recent drafts, recently published posts, and role-aware management links.

The public `SiteHeaderComponent` is intentionally not rendered on `/admin/**`. Existing routes and guards remain unchanged; the shell only reorganizes navigation and page composition.

The post editor uses compact control modules to keep the writing surface visible: Post Details stays open while Publishing, Cover Image, Search & Sharing, Draft Preview, SEO, AI suggestions, and Last Saved details start collapsed. Each closed module exposes a live summary or status badge, and validation opens the module containing a field that needs attention. At the desktop `xl` breakpoint, the right-side inspector stays pinned beneath the 64px admin header and scrolls within a viewport-bounded region above the fixed action bar. The sticky mobile command bar keeps status and Save visible, with View/Delete actions in a compact contextual menu, so it does not obscure the editor.

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

The CMS editor extends the base Editor.js toolset with custom `code`, `markdown`, `typography`, `stats`, `chart`, and `html` blocks. Structured blocks store typed data rather than presentation-only HTML, so public blog rendering and assistant prompts can consume the content consistently. Markdown blocks preserve their source and are parsed through the sanitized public renderer. Editor blocks are styled with hover/focus block-type hints and preview-oriented rendering so drafts better resemble the published post while editing.

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

Supported custom content blocks:

- Code: multi-line snippets with optional language labels, soft-wrapped CMS previews, and reader-facing copy actions on public posts
- Stats: repeated label/value/caption items for specification snapshots and key metrics, with CSV/JSON file import, pasted comma-separated row import, required-field help, and downloadable examples
- Chart: simple bar or line charts with visible point labels, values, units, notes, and captions, with CSV/JSON file import, pasted comma-separated row import, required-field help, and downloadable examples
- HTML: sanitized custom markup for one-off sections such as spec tables or static SVG snippets; scripts and unsafe markup are not rendered

Required backend setup:

```bash
firebase functions:secrets:set OPENAI_API_KEY
npm --prefix functions install
npm run build:functions
firebase deploy --only functions,firestore,database,storage
```

## Authentication And Roles

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

Manual blog media uploads use the reusable `BlogMediaUploaderComponent` and `BlogMediaUploadService`. Uploaded cover, optional full-screen post background, Open Graph, and Editor.js image assets are written to Firebase Storage under `cms/blog-media/{slug}/{assetRole}/`. The post editor's Post Images module keeps the cover required, lets selected posts opt into a separate `post-background` asset, and can detach that background without deleting the reusable media item. Inside Editor.js, both the header-level Insert Image action and the inline Image block's Choose Existing action reuse the same media-library stream; the inline action fills the current block instead of inserting a duplicate. The uploader previews stored images in a lightbox and optimizes JPEG, PNG, and WebP files client-side before upload when the optimized result is smaller. Open Graph uploads force JPEG output for social crawler compatibility. Storage rules keep reads public for published blog rendering and restrict
writes to admin-capable Firebase Auth custom claims.

Draft preview links are generated from the CMS editor for posts that remain in `draft` status. The editor saves the latest draft, writes a temporary `postPreviews/{token}` snapshot, and exposes it at `/blog/preview/{token}`. Firestore rules allow public single-document reads only while the embedded post is still a draft and the preview expiry timestamp is in the future; listing preview documents remains admin-only.

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

- `PublishingCalendarComponent` provides month navigation, scheduled/published/social filters, day agendas, post lookup, inline post rescheduling, an upcoming queue, and social announcement create/edit/cancel controls.
- `BlogSocialPromotion` stores provider-specific messages and delivery times without changing the public blog post rendering contract.
- `publishScheduledPosts` queues due announcements in the protected `socialOutbox` collection after their source article is published.

Migration notes:

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

Both functions require an authenticated Firebase user with `admin: true` or `roles.admin: true`. Role updates preserve unrelated custom claims, store future permissions under the `roles` custom-claim map, and mirror `admin` / `cmsAdmin` at the top level for compatibility with existing rules. Users must refresh their Firebase ID token, usually by signing out and back in, before new role claims affect their session.

Component inventory:

- `UserManagementPageComponent` lists Firebase Auth users, filters loaded rows, pages through Auth results, and edits role claims.
- `UserManagementService` is the feature-scoped Firebase Functions client for user administration callables.

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

- `MediaLibraryService` uses the existing `FirestoreService` and `BlogMediaUploadService` rather than creating a new upload pipeline.
- Image uploads keep the CMS image optimization/upload path behavior through `BlogMediaUploadService`; other media uses the existing Firebase Storage progress wrapper.
- Metadata rename updates display names only and intentionally does not rename Storage objects.
- Resize requests go through `MediaProcessingService`, which calls callable Firebase Functions named `resizeMedia` or `batchResizeMedia` when those existing functions are deployed.
- If production media metadata already uses different collection names, change the service constants instead of component logic.
