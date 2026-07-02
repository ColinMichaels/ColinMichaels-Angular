# Admin

Administrative tools belong here.

This boundary is reserved for authenticated content management, dashboards, and future CMS routes. Admin-only dependencies should be lazy-loaded from this area.

## CMS AI Assistant

The blog editor includes a CMS-local writing assistant for metadata drafting:

- Suggested titles
- Suggested excerpts/descriptions
- Suggested SEO title and description
- Suggested categories and tags
- Thumbnail generation prompt ideas

The editor calls Firebase callable functions first and falls back to the deterministic local provider when the backend is unavailable. The OpenAI key must stay in Firebase Secret Manager, not Angular environment files.

## CMS Editor.js Tools

The CMS editor extends the base Editor.js toolset with custom `code`, `typography`, `stats`, `chart`, and `html` blocks. Structured blocks store typed data rather than presentation-only HTML, so public blog rendering and assistant prompts can consume the content consistently. Editor blocks are styled with hover/focus block-type hints and preview-oriented rendering so drafts better resemble the published post while editing.

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

Generated thumbnails are written to Firebase Storage under `cms/blog-thumbnails/{slug}/` and the returned download URL is applied to the post Cover Image field.

Manual blog media uploads use the reusable `BlogMediaUploaderComponent` and `BlogMediaUploadService`. Uploaded cover, Open Graph, and Editor.js image assets are written to Firebase Storage under `cms/blog-media/{slug}/{assetRole}/`. The uploader previews stored images in a lightbox and optimizes JPEG, PNG, and WebP files client-side before upload when the optimized result is smaller. Open Graph uploads force JPEG output for social crawler compatibility. Storage rules keep reads public for published blog rendering and restrict writes to admin-capable Firebase Auth custom claims.

Draft preview links are generated from the CMS editor for posts that remain in `draft` status. The editor saves the latest draft, writes a temporary `postPreviews/{token}` snapshot, and exposes it at `/blog/preview/{token}`. Firestore rules allow public single-document reads only while the embedded post is still a draft and the preview expiry timestamp is in the future; listing preview documents remains admin-only.

Admin authorization is enforced through Firebase Auth custom claims. The UI, callable functions, Realtime Database rules, Firestore rules, and Storage rules treat these claims as admin-capable:

- `admin: true`
- `cmsAdmin: true`
- `roles.admin: true`

Route guards can also require named roles by setting route data, for example `data: {roles: ['admin', 'contentEditor']}`. The `admin` role is the super-admin override for protected admin routes. `cmsAdmin` only authorizes routes that explicitly list it. Any route-level role must also be enforced in Firebase Functions and Security Rules before it protects real data.

Known admin-console roles are defined in `src/app/shared/user-account/user-account.model.ts`:

- `admin`
- `cmsAdmin`
- `contentEditor`
- `mediaManager`
- `viewer`

The `/admin` overview accepts these roles and conditionally displays available tools. CMS routes are limited to content-capable roles. Media routes are limited to media-capable roles. User management remains limited to `admin`.

Signed-in users can inspect their current Firebase Auth profile, provider IDs, and role claims at `/profile`.

## User Management

The user management console is available at `/admin/users` and is restricted to the `admin` role, not `cmsAdmin`.

It calls Firebase callable functions:

- `listAdminUsers`
- `updateAdminUserRoles`

Both functions require an authenticated Firebase user with `admin: true` or `roles.admin: true`. Role updates preserve unrelated custom claims, store future permissions under the `roles` custom-claim map, and mirror `admin` / `cmsAdmin` at the top level for compatibility with existing rules. Users must refresh their Firebase ID token, usually by signing out and back in, before new role claims affect their session.

Component inventory:

- `UserManagementPageComponent` lists Firebase Auth users, filters loaded rows, pages through Auth results, and edits role claims.
- `UserManagementService` is the feature-scoped Firebase Functions client for user administration callables.

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
