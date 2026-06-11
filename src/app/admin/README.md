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

The CMS editor extends the base Editor.js toolset with a custom `typography` block. It stores structured block data rather than presentation-only HTML, so public blog rendering and assistant prompts can consume the content consistently.

Supported typography variants:

- Lead paragraph
- Pull quote with optional attribution
- Callout with optional label
- Aside
- Caption / note
- Eyebrow text

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

Generated thumbnails are written to Firebase Storage under `cms/blog-thumbnails/{slug}/` and the returned download URL is applied to the post Cover Image and Open Graph Image fields.

Manual blog media uploads use the reusable `BlogMediaUploaderComponent` and `BlogMediaUploadService`. Uploaded cover, Open Graph, and Editor.js image assets are written to Firebase Storage under `cms/blog-media/{slug}/{assetRole}/`. The uploader previews stored images in a lightbox and optimizes JPEG, PNG, and WebP files client-side before upload when the optimized result is smaller. Storage rules keep reads public for published blog rendering and restrict writes to admin-capable Firebase Auth custom claims.

Admin authorization is enforced through Firebase Auth custom claims. The UI, callable functions, Realtime Database rules, Firestore rules, and Storage rules treat these claims as admin-capable:

- `admin: true`
- `cmsAdmin: true`
- `roles.admin: true`

Route guards can also require future named roles by setting route data, for example `data: {roles: ['admin', 'contentEditor']}`. Any route-level role must also be enforced in Firebase Functions and Security Rules before it protects real data.

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
