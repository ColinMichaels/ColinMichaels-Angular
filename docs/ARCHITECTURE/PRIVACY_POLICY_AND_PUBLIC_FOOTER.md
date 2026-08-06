# Privacy Policy and Public Footer

## Purpose

The public site exposes a plain-language privacy policy at `/privacy` and keeps legal, contact, ownership, and primary navigation links in informational footer surfaces. The fixed homepage social bar remains presentation-only social chrome so it does not become a second site-navigation system.

This work supports external platform review, including Meta app approval, by providing a canonical public privacy-policy URL and a visible path to it from the homepage and article footer.

## Component Inventory

- `src/app/features/public/pages/privacy-policy.component.ts`
  - Standalone public policy page.
  - States the no-sale commitment, account/contact/author-application information handling, service-provider use, deletion-request process, and policy update behavior.
  - Uses `colin@colinmichaels.com` for verified deletion requests.
- `src/app/features/public/public.routes.ts`
  - Lazy-loads the `/privacy` page inside the existing public route boundary.
- `src/app/components/main/main.component.html`
  - Owns the homepage `#site-footer` information surface.
  - Provides Home, Blog, Topics, About, Open OS, Privacy Policy, Contact, copyright, sharing, and bug-report links.
- `src/app/features/submissions/**`
  - Owns the public `/contact` and `/write-for-us` forms documented in `PUBLIC_SUBMISSIONS.md`.
  - Routes both forms through a trusted callable instead of allowing direct client database writes.
- `src/app/components/main/socials/socials.component.*`
  - Retains only the fixed social icon bar.
  - Does not own primary navigation, legal links, contact links, or copyright content.
- `src/app/features/blog/pages/blog-detail/blog-detail.component.ts`
  - Links the article footer to the privacy policy alongside other public resources.

## Route and SEO Contract

- `PATH_NAMES.PRIVACY` is the single Angular route-name source for `privacy`.
- `PRIVACY_SEO_METADATA` supplies the client-rendered title, description, canonical path, Open Graph image, and indexable website type.
- The Firebase `renderSeoHtml` Function mirrors the `/privacy` metadata so crawlers and platform-review tools receive the correct canonical page before Angular starts.
- The generated `sitemap.xml` includes `/privacy` in both normal and fallback sitemap output.
- The sitemap and browser/server metadata also classify `/contact` and `/write-for-us` as indexable public routes.
- Unknown paths continue to use the existing 404/noindex policy; this change does not broaden route matching.

## Information and Data Boundaries

- The policy does not claim that the site handles no information. It describes account, profile, comment, notification, contact-message, prospective-author, hosting, security, abuse-prevention, and device-local information at a high level.
- The site commits not to collect personal information for sale and not to sell, rent, or trade it.
- Visitors may request removal at any time through the published email address. Verification and limited security, legal, fraud-prevention, and backup-retention exceptions remain explicit.
- Contact messages and author applications are stored in a private backend-owned collection for review and response. Proposed author credit is not published without separate editorial action and contributor approval.
- The submission feature adds explicit Firestore Rules and a callable Function. It adds no authentication claim, provider secret, cookie, analytics provider, or automatic third-party delivery.

## Contact And Author Submission Paths

The homepage Contact link opens `/contact`, and public navigation exposes `/write-for-us` for prospective contributors. Both forms keep answers intact after a delivery error and link directly to the privacy policy before consent.

The shipped trusted boundary includes:

- dedicated public routes and accessible invalid, pending, error, and success states;
- bounded server-side field and origin validation;
- an inert honeypot and opaque per-connection hourly rate limit;
- backend-only submission and rate-limit collections;
- no automatic publication, role assignment, or CMS access; accepted records can produce a minimal owner alert and an intentional admin-authored email reply through the server-only mail transport;
- removal through the same verified deletion-request process as other submitted information.

CAPTCHA, automatic submitter acknowledgements, and contributor provisioning remain deferred. The protected `/admin/submissions` inbox owns review status and replies; do not add a client-only CAPTCHA check or expose provider secrets in Angular environment files.

## Responsive and Accessibility Behavior

- The homepage information footer uses existing public-site tokens and responsive grid primitives.
- Footer navigation has an explicit accessible label and uses real links for every destination.
- Topics and About use Angular fragment navigation, which is already supported by router anchor scrolling.
- The fixed social bar stays separate from the information footer and Reader Assistance control.
- The policy page uses semantic headings, labelled sections, visible keyboard focus styles through shared link primitives, and a direct mail link.

## Migration and Compatibility

- No existing content or data migration is required; the submission collections and routes are additive.
- Existing public routes are preserved; `/privacy` is additive.
- The Labs redirect, OS guards, admin boundaries, and blog URL contracts are unchanged.
- The previous email contact remains available inside the privacy policy for verified deletion requests.

## Deployment

Deploy Hosting, Functions, and Firestore Rules together:

1. Rules deny direct submission writes while allowing CMS-capable roles read-only review.
2. Functions publishes the callable, crawler metadata, and updated sitemap output.
3. Hosting publishes the Angular routes, footer UI, and policy component.
4. Verify `/privacy`, `/contact`, `/write-for-us`, `/sitemap.xml`, the homepage footer, and an article footer in the deployed preview.
5. Use the canonical production URL `https://colinmichaels.com/privacy` for external app-review configuration after approval of the preview.

No new environment value, Firebase secret, provider account, or Firestore composite index is required.

## Rollback

Revert the feature commit and redeploy Hosting, Functions, and Rules together. This removes the additive form routes, callable, navigation, metadata classification, and sitemap entries without deleting existing private submissions. If an external app configuration already references the production privacy URL, update or pause that review configuration before rolling that route back.

## Validation Contract

- `npm run build`
- `npm run build:functions`
- `npm run lint`, with the existing repository-wide legacy baseline reported accurately
- Focused route, policy-page, homepage-footer, and social-bar tests
- Desktop and mobile rendered checks for overflow and fixed-control overlap
- Privacy-link navigation and browser-console inspection
- `git diff --check`
