# Public Contact And Author Submissions

## Purpose

The public submission feature adds two simple intake routes without opening the trusted publishing system:

- `/contact` accepts general questions, project notes, corrections, media requests, privacy requests, and other messages.
- `/write-for-us` collects a prospective author's post idea, source plan, publishing history, contact information, and proposed public credit.

An author-pitch submission is an application for review. It does not create an `/authors` document, a post, a Firebase user, a role claim, a draft, or CMS access. Approved contributors can be added later through the existing author and publishing workflows.

## Component Inventory

- `src/app/features/submissions/pages/public-submission-page.component.ts`
  - Owns the shared responsive questionnaire, type-specific validation, invalid-control focus, pending/error/success states, and privacy/original-work confirmations.
  - Uses route data to render the contact or author-pitch variant without duplicating form behavior.
  - Keeps the page title in a full-width editorial hero so long author-route copy cannot intrude into the form, then uses the existing public accent, panel, type, motion, and dark-mode tokens for the decorative draft stack and numbered form sections.
- `src/app/features/submissions/services/public-submission.service.ts`
  - Calls the trusted `submitPublicSubmission` Function and fails closed when Functions are unavailable.
- `src/app/features/submissions/models/public-submission.model.ts`
  - Defines discriminated contact and author-pitch request contracts.
- `src/app/features/submissions/submission.routes.ts`
  - Lazy-loads `/contact` and `/write-for-us` with route-specific SEO metadata.
- `functions/src/public-submissions.ts`
  - Normalizes and bounds every field, validates consent, filters honeypot traffic, rate-limits by an opaque actor/connection hash, and writes the private review record transactionally.
- `functions/src/index.ts`
  - Exposes the public callable with the existing site-origin CORS allowlist and mirrors crawler metadata and sitemap entries.

## Questionnaire Contract

Both forms require a name, reply email, and explicit consent to store and review the answers.

The contact questionnaire adds a bounded reason, subject, and message. The author questionnaire adds:

- proposed byline, location, role, website/profile, short biography, and other public-credit notes;
- topic areas, working title, pitch, expected references or source material, and representative publishing history;
- confirmation that the proposal is original and that the prospective author can identify required sources and permissions.

Optional public-credit answers remain private application data until an editor separately creates and publishes an author profile with the contributor's approval.

## Trusted Data Boundary

Accepted records are stored at `/publicSubmissions/{submissionId}` with `schemaVersion: 1`, `type`, `status: "new"`, contact/proposal sections, optional authenticated actor UID, and server-owned timestamps.

The browser never writes this collection directly. `firestore.rules` provides CMS-capable roles read-only review access and denies every client create, update, and delete. The callable Function is the only creation boundary. It:

- accepts only the documented keys and request variants;
- rejects malformed email addresses, unsafe profile URL schemes, missing confirmations, oversized payloads, and out-of-range text;
- normalizes Unicode and strips control and bidirectional override characters;
- silently discards a filled honeypot while returning the normal success shape;
- limits an actor/connection identity to five accepted submissions per UTC hour through `/publicSubmissionRateLimits/{opaqueHash}`;
- stores only a SHA-256 identity in the rate-limit record, not the raw IP address.

Rate-limit documents carry `expiresAtTimestamp` for an optional Firestore TTL policy. The stable opaque document ID is reused across hours, so the feature does not create a new limit record on every submission window.

## Review And Author Provisioning

The first release deliberately has no public self-service author provisioning and no automatic email delivery. CMS-capable reviewers can inspect private records in Firebase tooling. A future admin inbox should use a trusted backend mutation for status changes instead of enabling direct Firestore writes.

After editorial approval, the existing workflow remains authoritative:

1. An editor creates a draft author profile through `/admin/cms/authors`.
2. The contributor and editor agree on the public biography, image, location, links, and credit.
3. The editor creates or assigns a draft post using that canonical author.
4. Publication remains subject to the existing trusted author-status, post-validation, preview, and publishing controls.

Writing-assistant access, contributor roles, draft ownership, revision workflows, notifications, and email acknowledgements are deferred. They must not be inferred from the existence or status of an application.

## Accessibility And Responsive Behavior

- Form groups use semantic fieldsets, legends, explicit labels, required-state copy, autocomplete hints, and native controls.
- Invalid submission marks all relevant controls and moves focus to the first invalid field.
- Async status uses a disabled submit action, retained answers on failure, an alert on errors, and a focusable success summary with a reference ID.
- Desktop uses a full-width hero followed by a sticky explanation beside the form; narrow layouts hide the decorative draft stack and become one column with full-width actions.
- Focus outlines, dark mode, high-contrast public tokens, and reduced-motion preferences remain part of the existing public design system.

## Migration And Deployment

The change is additive. No existing post, author, account, route, or media record is migrated.

Deploy these scopes together:

1. Firestore Rules for the backend-only submission and rate-limit collections.
2. Firebase Functions for validation, rate limiting, storage, crawler metadata, and sitemap output.
3. Hosting for the two Angular routes and navigation links.

No API key, email provider, CAPTCHA secret, Firestore composite index, or Firebase configuration rewrite is required. A Firestore TTL policy on `publicSubmissionRateLimits.expiresAtTimestamp` is recommended operational cleanup but is not required for correctness.

## Rollback

Remove the two public routes and navigation links, remove or disable the callable export, and redeploy Hosting, Functions, and Rules. Existing private submission records should be retained for review or deleted through an authorized administrative process; rollback must not expose them or delete them implicitly. The existing `/authors`, CMS author manager, and trusted post-publishing paths remain unchanged.

## Validation Contract

- focused Angular form, route, navigation, footer, privacy, and service tests;
- Functions parser and opaque rate-identity tests;
- Firestore Rules checks for anonymous denial, CMS read-only review, and backend-only rate-limit records;
- `npm run lint`;
- `npm run build` and `npm run build:functions`;
- desktop and mobile browser checks for both routes, invalid focus, success/error states, dark mode, overflow, and console health;
- `git diff --check`.
