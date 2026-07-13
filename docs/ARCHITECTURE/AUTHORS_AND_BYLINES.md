# Authors And Bylines

## Purpose

Multi-author support separates a writer's canonical public profile from the byline snapshot stored with each post. Editors can assign or create an author while editing a post, readers can browse one public page per author, and search can match or filter posts by author. Colin Michaels remains the default author for new and legacy posts and remains the fixed identity of the homepage.

## Boundaries

Author infrastructure belongs under `src/app/features/authors`. It owns author models, validation, Firestore access, public profile resolution, and the public author page. Blog components consume the author contract but do not own canonical profiles. CMS components select and manage authors through the author repository rather than querying Firestore directly.

The homepage remains intentionally separate:

- `/` continues to render `COLIN_AUTHOR_PROFILE` and Colin's personal recovery copy.
- Changing a post author never changes the homepage About section, site publisher, or primary site identity.
- A post by another author uses that author's byline and profile page.
- Colin-specific health or recovery disclaimers are not automatically attributed to another writer.

## Data Model

Canonical author documents are stored in Firestore at `/authors/{authorId}`. The stable document ID and slug are not derived again after publication.

```ts
interface AuthorProfile {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  bio: string;
  avatarUrl: string;
  imageAlt: string;
  location?: string;
  externalProfiles: readonly AuthorExternalProfile[];
  healthDisclaimer?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}
```

Newly saved `BlogPost` and `BlogPostSummary` records store the canonical relationship and the existing `BlogAuthor`
object acts as the embedded snapshot. `authorId` remains optional in the TypeScript persistence shape only so legacy
documents can be read and normalized safely:

```ts
interface BlogAuthor {
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl?: string;
  slug?: string;
}

interface BlogPost {
  authorId?: string;
  author: BlogAuthor;
}
```

`authorId` is the canonical relationship used for admin filtering, public author archives, and future aggregations. `author` is a compact snapshot used by cards, previews, feeds, crawler fallback HTML, exports, and offline copies without requiring a second read. Saving a post refreshes its snapshot from the selected canonical author. Updating an author profile does not silently rewrite every historical post.

`DEFAULT_AUTHOR_ID` is `colin-michaels`. Read normalization assigns Colin when a legacy post has no `authorId`; it preserves usable legacy byline fields until that post is saved or backfilled.

## Services And Access

- `AuthorStorageService` owns auth-aware Firestore listeners for `/authors`.
- `AuthorRepositoryService` owns normalization, published/admin projections, lookup by ID or slug, default Colin fallback, and reference checks.
- Author validation rejects malformed document shapes before data reaches public rendering; the repository requires a
  name, normalizes the slug, removes blank optional fields, and prevents duplicate slugs when saving.
- Public clients may read only authors whose `status` is `published`.
- CMS-capable roles may create and update author documents and read drafts.
- The CMS should prevent deleting an author referenced by a post. A server-side delete or bulk reassignment workflow is deferred; direct deletion is not part of the first release.

Public post rendering resolves the canonical profile when available and falls back to the embedded snapshot if the profile cannot load. Publishing must reject a missing or draft selected author.

## Routes And UI Ownership

| Route | Owner | Contract |
| --- | --- | --- |
| `/authors/:slug` | `AuthorPageComponent` | Public, indexable profile and published-post archive for one published author. Missing and draft authors resolve to the normal not-found/noindex behavior. |
| `/admin/cms/authors` | CMS author manager | Protected list/create/edit surface for canonical profiles. |
| `/admin/cms/new` | CMS post editor | Starts with Colin selected. |
| `/admin/cms/:slug/edit` | CMS post editor | Loads the assigned author, supports selecting another profile, and can open the inline add-author workflow. |
| `/admin/cms` | CMS post list | Adds an Author column plus author-aware text search and sorting. |

The public author page reuses `BlogPostListingComponent` for the archive. It presents the canonical author data as an editorial résumé: a portrait and icon-led contact rail, career summary, derived publishing record, long-form biography, and compact writing archive. The layout uses only profile and post data already present in the author contract; it does not infer employers, credentials, or experience dates. Loading, empty, and missing-profile states remain intact. Blog detail bylines and author bio cards link to `/authors/:slug` and use snapshot fallback rather than routing all writers to the homepage.

The CMS author form uses `BlogMediaUploaderComponent` for avatar selection and upload. Editors can reuse an existing Media Library item or upload a portrait through the standard Firebase Storage pipeline; the resulting hosted URL is stored in `AuthorProfile.avatarUrl`. Author profiles do not own a separate upload implementation.

## Author Statistics

The first release derives statistics from the author's published posts instead of persisting counters in `/authors`:

- published article count;
- total word count;
- estimated total reading time;
- distinct category count;
- latest publication date.

Draft, scheduled, archived, and Cat Corner posts excluded from normal public discovery must not inflate public statistics. Persisted engagement totals are deferred until an author-level backend aggregation can update them atomically and reconcile deletions or reassignment.

## Search

Blog search items carry `authorId`, `authorName`, and `authorSlug`. Author name, title, and slug contribute to free-text matching and can produce an `Author` matched-field label.

The full `/search` page supports an author filter represented by the stable slug in `?author=<slug>`. Search results display the post byline and link it to the author page. The header results drawer uses the same indexed author text, so typing an author's name also finds their posts without adding another global search input.

## SEO And Syndication

- Author pages use a canonical `/authors/:slug` URL and `ProfilePage` plus `Person` JSON-LD.
- `BlogPosting.author` uses the selected author's name and profile URL.
- Colin remains the website publisher and homepage `Person` identity for posts by any writer.
- RSS, JSON Feed, crawler fallback HTML, social metadata, draft previews, exports, and offline snapshots use the post's author snapshot.
- The sitemap includes published author profiles that have at least one publicly discoverable published post.
- Draft authors and missing slugs return a real missing-route/noindex response and are excluded from the sitemap.

Angular metadata and Firebase Functions rendering must be updated together so crawlers and browser navigation expose the same author.

## Migration

The migration is additive and can be deployed without taking the blog offline:

1. Deploy Firestore rules and Functions that understand `authorId` but retain the Colin fallback.
2. Seed `/authors/colin-michaels` from the existing shared Colin profile.
3. Deploy the Angular author repository, CMS controls, author route, dynamic bylines, and author-aware search.
4. Backfill posts missing `authorId` with `colin-michaels` and a normalized Colin snapshot.
5. Verify public author URLs, post previews, feeds, sitemap XML, crawler fallback HTML, exports, and offline post validation.
6. Create and publish additional author profiles through the CMS before assigning published posts to them.

The backfill must be idempotent and must not overwrite a post that already has a non-Colin author. Existing routes, slugs, post IDs, dates, content, and media remain unchanged.

The migration command is dry-run by default:

```bash
npm --prefix functions run migrate:post-authors
npm --prefix functions run migrate:post-authors -- --apply
```

Run it with credentials for the intended Firebase project and confirm the dry-run counts before using `--apply`.

## Deployment And Rollback

Deployment scope includes Angular Hosting, Firestore rules, and Firebase Functions when SEO/feed/sitemap rendering changes. No Firebase configuration files or existing content are replaced.

Rollback is data-safe because posts retain a readable author snapshot and application normalization continues treating a missing `authorId` as Colin. If the author UI must be rolled back:

- remove the author manager and public route from navigation while leaving `/authors` documents intact;
- keep accepting the existing post snapshot shape so newer posts remain readable;
- restore Colin-only byline presentation without deleting author documents or reassigned post data;
- do not remove `/authors/:slug` without a redirect or explicit route-migration decision.

## Validation Contract

Required repository validation remains:

```bash
npm run build
npm run lint
```

Run focused coverage for author validation and fallback normalization, new-post default assignment, edit-time selection, post-list author search/filtering, public statistics, author URL search filtering, byline fallback, offline snapshots, feeds, sitemap output, and Angular/Functions JSON-LD parity. Browser verification must cover Colin and a second author at desktop and mobile widths, light/dark themes, CMS create/select flows, and console errors.
