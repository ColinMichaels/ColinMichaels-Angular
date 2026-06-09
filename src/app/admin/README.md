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

Admin authorization is enforced through Firebase Auth custom claims. The UI, callable functions, Realtime Database rules, Firestore rules, and Storage rules treat these claims as admin-capable:

- `admin: true`
- `cmsAdmin: true`
- `roles.admin: true`

Route guards can also require future named roles by setting route data, for example `data: {roles: ['admin', 'contentEditor']}`. Any route-level role must also be enforced in Firebase Functions and Security Rules before it protects real data.
