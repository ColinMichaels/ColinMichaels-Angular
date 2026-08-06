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
- `functions/src/public-submission-email.ts`
  - Normalizes stored submission records, validates review and response requests, builds escaped summary alerts and replies, enforces reversible status transitions, and sends through authenticated SMTP.
- `functions/src/index.ts`
  - Exposes the public callable, the Firestore-created alert trigger, and CMS-role-gated review/response callables with the existing site-origin CORS allowlist.
- `src/app/admin/submissions/public-submissions-page.component.ts`
  - Provides the protected `/admin/submissions` master-detail inbox with status counts, search, private record detail, alert health, review actions, and the email response composer.
- `src/app/admin/submissions/public-submission.service.ts`
  - Reads the protected queue through Firestore Rules and sends every mutation or response through trusted callable Functions.
- `src/app/admin/submissions/public-submission.models.ts`
  - Normalizes legacy/new status, nested contact/proposal data, search projections, and alert delivery state for the admin UI.

## Questionnaire Contract

Both forms require a name, reply email, and explicit consent to store and review the answers.

The contact questionnaire adds a bounded reason, subject, and message. The author questionnaire adds:

- proposed byline, location, role, website/profile, short biography, and other public-credit notes;
- topic areas, working title, pitch, expected references or source material, and representative publishing history;
- confirmation that the proposal is original and that the prospective author can identify required sources and permissions.

Optional public-credit answers remain private application data until an editor separately creates and publishes an author profile with the contributor's approval.

## Trusted Data Boundary

Accepted records are stored at `/publicSubmissions/{submissionId}` with `schemaVersion: 1`, `type`, `status: "new"`, contact/proposal sections, optional authenticated actor UID, and server-owned timestamps. Existing `new` records require no migration. Trusted review can move a record through `new`, `in-review`, `responded`, `archived`, or `rejected`; archive and reject retain the record and can be restored to review.

The browser never writes this collection directly. `firestore.rules` provides CMS-capable roles read-only review access and denies every client create, update, and delete. The callable Function is the only creation boundary. It:

- accepts only the documented keys and request variants;
- rejects malformed email addresses, unsafe profile URL schemes, missing confirmations, oversized payloads, and out-of-range text;
- normalizes Unicode and strips control and bidirectional override characters;
- silently discards a filled honeypot while returning the normal success shape;
- limits an actor/connection identity to five accepted submissions per UTC hour through `/publicSubmissionRateLimits/{opaqueHash}`;
- stores only a SHA-256 identity in the rate-limit record, not the raw IP address.

Rate-limit documents carry `expiresAtTimestamp` for an optional Firestore TTL policy. The stable opaque document ID is reused across hours, so the feature does not create a new limit record on every submission window.

## Alerts, Review, And Responses

CMS-capable reviewers use `/admin/submissions`. The page listens to the newest 200 records, derives status counts locally to avoid a new Firestore composite index, filters by status and submitted text, and accepts `?submission={id}` deep links from alerts. It does not enable direct writes: `reviewPublicSubmission` owns Start review, Archive, Reject, and Restore to review, while `respondToPublicSubmission` owns server-side reply delivery and the `responded` transition.

`notifyPublicSubmissionCreated` runs only after Firestore creates an accepted record. It sends the configured owner a minimal alert containing submission type, sender, summary, reference, and protected admin link. The full private message, proposal, biography, and references remain out of the alert. Alert failure is recorded under `alertDelivery` and retried by the event system for up to five delivery attempts; it never turns the visitor's already-successful form submission into an error.

The response callable validates subject/body limits, uses a browser-generated cryptographic request ID as the response document ID and deterministic email message ID, and stores the response at `/publicSubmissions/{submissionId}/responses/{requestId}`. A successful SMTP result and the submission's `responded` status are committed together. A failed delivery records a failed response attempt and leaves the prior submission status intact. Firestore Rules allow CMS roles to read response history while all client writes remain denied.

SMTP credentials remain in Firebase Secret Manager. The default non-secret transport targets Google Workspace SMTP on port 465 with TLS, sends owner alerts to `colin@colinmichaels.com`, and uses `ColinMichaels.com <colin@colinmichaels.com>` as the sender; deployments may override those params without changing Angular. The sender domain must publish the records required by the selected provider, including one complete SPF record and its DKIM key. Keep DMARC in monitored rollout until every legitimate sender passes alignment.

## Author Provisioning

The workflow deliberately has no public self-service author provisioning. A response or status change does not create an account, author profile, role, draft, or publishing access.

After editorial approval, the existing workflow remains authoritative:

1. An editor creates a draft author profile through `/admin/cms/authors`.
2. The contributor and editor agree on the public biography, image, location, links, and credit.
3. The editor creates or assigns a draft post using that canonical author.
4. Publication remains subject to the existing trusted author-status, post-validation, preview, and publishing controls.

Writing-assistant access, contributor roles, draft ownership, revision workflows, automated author acceptance, public deletion controls, and submitter acknowledgements are deferred. The implemented email surface is limited to owner alerts and intentional admin-authored replies; it is not a mailing-list or new-post email provider.

## Accessibility And Responsive Behavior

- Form groups use semantic fieldsets, legends, explicit labels, required-state copy, autocomplete hints, and native controls.
- Invalid submission marks all relevant controls and moves focus to the first invalid field.
- Async status uses a disabled submit action, retained answers on failure, an alert on errors, and a focusable success summary with a reference ID.
- Desktop uses a full-width hero followed by a sticky explanation beside the form; narrow layouts hide the decorative draft stack and become one column with full-width actions.
- Focus outlines, dark mode, high-contrast public tokens, and reduced-motion preferences remain part of the existing public design system.

## Migration And Deployment

The change is additive. No existing post, author, account, route, or media record is migrated.

Before deployment, set the server-only SMTP credentials:

```bash
firebase functions:secrets:set PUBLIC_SUBMISSION_SMTP_USERNAME
firebase functions:secrets:set PUBLIC_SUBMISSION_SMTP_PASSWORD
```

The default transport is `smtp.gmail.com:465` with TLS. If another provider or SMTP relay is used, set these non-secret Functions params in `functions/.env.<project-id>`:

```text
PUBLIC_SUBMISSION_SMTP_HOST=smtp.example.com
PUBLIC_SUBMISSION_SMTP_PORT=465
PUBLIC_SUBMISSION_SMTP_SECURE=true
PUBLIC_SUBMISSION_EMAIL_FROM="ColinMichaels.com <colin@colinmichaels.com>"
PUBLIC_SUBMISSION_ALERT_TO=colin@colinmichaels.com
PUBLIC_SUBMISSION_ADMIN_URL=https://colinmichaels.com/admin/submissions
```

Deploy these scopes in order:

1. Publish SPF/DKIM for the chosen sender and verify the From address can authenticate through the SMTP account.
2. Set the two SMTP secrets and any non-default Functions params.
3. Deploy Firestore Rules for read-only CMS access to submission and response records.
4. Deploy Firebase Functions for validation, storage, alert delivery, status mutation, and responses.
5. Deploy Hosting for the public routes plus the protected inbox and Admin Guide entry.

No Firestore composite index or Firebase configuration rewrite is required. A Firestore TTL policy on `publicSubmissionRateLimits.expiresAtTimestamp` is recommended operational cleanup but is not required for correctness. The feature is not operationally complete until a real alert and a real admin reply both show SPF/DKIM/DMARC alignment at the recipient.

## Rollback

Disable or remove the alert trigger and review/response callables before removing the admin route, then redeploy Functions, Hosting, and Rules. Existing private submission and response records should be retained for review or deleted through an authorized administrative process; rollback must not expose or implicitly delete them. Revoking the two SMTP secret bindings stops new alerts and replies without changing accepted submissions. The existing `/authors`, CMS author manager, and trusted post-publishing paths remain unchanged.

## Validation Contract

- focused Angular form, route, navigation, footer, privacy, and service tests;
- Functions parser, email escaping/privacy, request validation, deterministic message-ID, status-transition, and opaque rate-identity tests;
- Firestore Rules checks for anonymous denial, CMS read-only submission/response review, and backend-only submission, response, and rate-limit writes;
- `npm run lint`;
- `npm run build` and `npm run build:functions`;
- desktop and mobile browser checks for both public routes plus `/admin/submissions`, including status filters, search, selection, responsive detail/composer layout, role denial, and console health;
- authenticated deployed-environment delivery checks for one owner alert and one admin-authored response, including alert status, response audit record, and email authentication headers;
- `git diff --check`.
