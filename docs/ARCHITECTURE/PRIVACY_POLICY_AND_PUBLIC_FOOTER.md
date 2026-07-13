# Privacy Policy and Public Footer

## Purpose

The public site exposes a plain-language privacy policy at `/privacy` and keeps legal, contact, ownership, and primary navigation links in informational footer surfaces. The fixed homepage social bar remains presentation-only social chrome so it does not become a second site-navigation system.

This work supports external platform review, including Meta app approval, by providing a canonical public privacy-policy URL and a visible path to it from the homepage and article footer.

## Component Inventory

- `src/app/features/public/pages/privacy-policy.component.ts`
  - Standalone public policy page.
  - States the no-sale commitment, limited information handling, service-provider use, deletion-request process, and policy update behavior.
  - Uses `colin@colinmichaels.com` for verified deletion requests.
- `src/app/features/public/public.routes.ts`
  - Lazy-loads the `/privacy` page inside the existing public route boundary.
- `src/app/components/main/main.component.html`
  - Owns the homepage `#site-footer` information surface.
  - Provides Home, Blog, Topics, About, Open OS, Privacy Policy, Contact, copyright, sharing, and bug-report links.
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
- Unknown paths continue to use the existing 404/noindex policy; this change does not broaden route matching.

## Information and Data Boundaries

- The policy does not claim that the site handles no information. It describes account, profile, comment, notification, hosting, security, and device-local information at a high level.
- The site commits not to collect personal information for sale and not to sell, rent, or trade it.
- Visitors may request removal at any time through the published email address. Verification and limited security, legal, fraud-prevention, and backup-retention exceptions remain explicit.
- No new database collection, Firebase rule, authentication claim, secret, cookie, analytics provider, or third-party data transfer is introduced by this feature.

## Contact Path and Deferred Form

The homepage Contact link currently opens `mailto:colin@colinmichaels.com`. It is intentionally a working email path rather than a dead `/contact` route.

A future site contact form remains deferred until it includes:

- a dedicated public route and accessible form states;
- CAPTCHA or an equivalent abuse-control provider;
- server-side token verification before message delivery;
- request size, field, origin, and rate-limit validation;
- safe logging that excludes message bodies and unnecessary personal data;
- explicit retention, deletion, and delivery-failure behavior;
- corresponding privacy-policy and deployment documentation updates.

Do not ship a client-only CAPTCHA check or expose provider secrets in Angular environment files.

## Responsive and Accessibility Behavior

- The homepage information footer uses existing public-site tokens and responsive grid primitives.
- Footer navigation has an explicit accessible label and uses real links for every destination.
- Topics and About use Angular fragment navigation, which is already supported by router anchor scrolling.
- The fixed social bar stays separate from the information footer and Reader Assistance control.
- The policy page uses semantic headings, labelled sections, visible keyboard focus styles through shared link primitives, and a direct mail link.

## Migration and Compatibility

- No content or data migration is required.
- Existing public routes are preserved; `/privacy` is additive.
- The Labs redirect, OS guards, admin boundaries, and blog URL contracts are unchanged.
- The email Contact path is compatible with the future contact form: replace only the footer link destination when the protected form route is ready.

## Deployment

Deploy Hosting and Functions together:

1. Hosting publishes the Angular route, footer UI, and policy component.
2. Functions publishes crawler metadata and the updated sitemap output.
3. Verify `/privacy`, `/sitemap.xml`, the homepage footer, and an article footer in the deployed preview.
4. Use the canonical production URL `https://colinmichaels.com/privacy` for external app-review configuration after approval of the preview.

No new environment value, Firebase secret, Firestore index, or security-rule deployment is required.

## Rollback

Revert the feature commit and redeploy Hosting and Functions together. This removes the additive Angular route, policy page, footer links, server-rendered metadata classification, and sitemap entry without changing stored data. If an external app configuration already references the production privacy URL, update or pause that review configuration before rolling the route back.

## Validation Contract

- `npm run build`
- `npm run build:functions`
- `npm run lint`, with the existing repository-wide legacy baseline reported accurately
- Focused route, policy-page, homepage-footer, and social-bar tests
- Desktop and mobile rendered checks for overflow and fixed-control overlap
- Privacy-link navigation and browser-console inspection
- `git diff --check`
