# Reader Membership Campaign

## Purpose

The reader membership campaign gives anonymous blog visitors a clear reason to create a Firebase-backed account: comment on posts, earn reader points, and choose how to hear about new writing. It extends the current authentication, comment, points, Profile, and Web Push systems rather than creating a parallel membership platform.

The campaign is limited to public `/blog` routes. Draft previews, admin routes, Core OS screens, and the rest of the public site do not mount the prompt.

## Reader Flow

1. Firebase Auth first resolves the reader as signed out. Initialization and auth-listener failures never count as anonymous identity.
2. After the article body, an eligible anonymous reader sees a non-blocking inline card explaining the account benefits. It does not use a wall-clock trigger, overlay the article, trap focus, or lock body scrolling.
3. **Create free account**, **I already have an account**, and **Not now** are visible together. The account actions preserve the current article as the validated internal return URL; **Not now** removes the inline card and snoozes it for 30 days.
4. The account and Profile flows own all notification choices. No email, newsletter, or browser-notification preference is preselected by the inline invitation.
5. Popup sign-in remains the primary Google/Facebook path. Before a blocked-popup fallback starts redirect authentication, the app stores the validated internal return URL for at most 15 minutes. The callback restores that URL even when the provider round trip drops the `/login` query string, then clears it after successful navigation.
6. After Firebase authentication and user-account bootstrap complete, any preferences explicitly selected in an existing signup flow are written to `users/{uid}.communicationPreferences`.
7. If browser alerts were explicitly selected and the current browser supports them, a separate signed-in follow-up asks the reader to enable alerts. The native browser permission prompt is only opened from that button gesture.
8. All three choices remain editable from the protected Profile page.

**Not now** snoozes the inline invitation for 30 days. Completing or closing a signed-in follow-up suppresses the campaign for 365 days on that browser. Pending signup choices use session storage so abandoned choices do not become durable account consent.

## Component Inventory

- `ReaderMembershipInviteComponent` owns the anonymous after-article offer, internal account return links, and 30-day dismissal. It has no dialog, focus trap, body lock, or notification defaults.
- `BlogMembershipCampaignComponent` owns only saved-preference completion, browser-alert follow-up, CDK-backed modal focus containment/restoration, and responsive signed-in dialog presentation. The app shell defers this component so non-blog routes do not pay its initial bundle or artwork cost.
- `BlogMembershipCampaignStateService` owns versioned dismissal and pending-preference browser storage.
- `AuthService.authState$` distinguishes initialization, authenticated, unauthenticated, and unavailable states. Campaign eligibility uses this state; existing `user$` consumers receive only resolved identity results.
- `CommunicationPreferencesComponent` owns signed-in Profile controls for per-device browser alerts and account-level email choices.
- `LoginScreenComponent` recognizes `source=blog-membership`, opens the requested login/register mode, preserves preferences for email/password and social authentication, and provides a guest return path.
- `AuthReturnUrlService` validates same-site destinations, keeps short-lived redirect state in session storage, rejects login/logout loops and external URLs, and clears state after successful navigation.
- `UserAccountService.updateCommunicationPreferences` is the shared Firestore write boundary.
- `UserCommunicationPreferences` and `normalizeCommunicationPreferences` define and validate the optional account document field.
- `PwaPushService` remains the sole browser permission and per-device Web Push adapter.

Campaign media is separated from production UI logic:

- `src/assets/images/campaigns/reader-membership-master.webp` is the optimized popup artwork; the editable PNG master remains in the campaign lab.
- `src/assets/social/reader-membership/` contains publishable platform images and the rendered vertical video.
- `labs/reader-membership-campaign/` contains editable Remotion source, local fonts, and render scripts. Render output and dependencies remain ignored.
- `docs/design/blog-membership-popup-concept.png` preserves the approved visual direction.

## Data Contract

The optional `communicationPreferences` field on `users/{uid}` is:

```ts
{
  newPostEmails: boolean;
  newsletter: boolean;
  source: 'signup-campaign' | 'profile';
  updatedAt: string;
}
```

The field is optional so existing user documents remain valid without a backfill. Firestore Rules allow an account owner to change only the existing profile-safe fields and this strictly shaped preference map. Roles, trust, points, and other protected account data remain outside the owner update boundary.

Browser subscriptions are not stored in this map. They remain per-device records behind the existing authenticated push registration Functions and backend-only `pushSubscriptions` collection.

## Consent And Delivery Boundaries

Every preference is independently reversible. The anonymous inline invitation preselects no email, newsletter, or browser-notification choice. A signed-in reader can enable browser alerts only from an explicit **Enable browser alerts** gesture before the browser shows its native permission prompt.

The current application can save email and newsletter preferences, but it does not yet contain an email service, mailing provider, or new-post email worker. The UI therefore describes these controls as joining a delivery list and never reports an email as sent. Do not advertise email delivery as live until a provider, sender identity, unsubscribe endpoint, suppression handling, and audited publish trigger are connected.

Existing Web Push delivery is functional only when the public VAPID key, private VAPID secret, subject, deployed Functions, service worker, and Firestore Rules described in `MOBILE_PWA.md` are configured together.

## Accessibility And Responsive Behavior

- The anonymous invitation is an inline landmark after meaningful article content. At narrow widths its three actions stack as full-width 44px-or-larger targets, so dismissal and account paths remain simultaneously reachable without a focus trap.
- The signed-in preference follow-up is a labelled modal dialog with focus containment on open, restoration to the prior control on close, Escape dismissal, a named 44px close button, visible focus states, and live status feedback.
- Secondary actions retain 44px targets, and consent/dismissal copy uses the campaign's muted token instead of the lower-contrast legacy gray.
- Reduced-motion preferences remove entry and control transitions.
- Desktop presentation uses a two-column editorial layout; narrow and short viewports collapse the art and make the content region scrollable.
- The signup screen hides decorative Core OS controls during the reader campaign so consent and registration controls are not obscured. Its communication choices use the login screen's translucent Apple-style settings group and switches while retaining native checkbox semantics for forms and assistive technology.
- The signup screen always keeps a keyboard-focusable guest continuation action visible for readers who decide not to authenticate after leaving the original offer.
- Registration uses one viewport-height scroll container, 16px focusable inputs, scroll margins, and explicit `name`, `email`, `current-password`, and `new-password` autocomplete contracts so browser autofill and mobile virtual keyboards cannot recenter or misclassify the form and make sibling fields appear to disappear.
- Campaign graphics keep the message in native page/video text where possible; social publishing should include the documented alt text.

## Migration And Deployment

- No Firestore data migration or account backfill is required.
- Auth-readiness, route-guard consolidation, and local logging require an Angular Hosting deployment only; they do not change Functions, Firestore Rules, or stored documents.
- Focus containment, target sizing, and contrast hardening are Angular/CSS-only changes with no account, consent, route, Rules, or Functions migration.
- The redirect-return record is tab-scoped, expires after 15 minutes, and needs no Firebase configuration or OAuth callback-domain change.
- Deploy Angular Hosting and Firestore Rules together.
- Existing authentication providers, comments, points, and push Functions are reused without a Functions code change.
- Browser-alert activation still requires the existing VAPID production configuration.
- Email and newsletter delivery require a separate provider-backed implementation before sends can begin.
- Publish social assets only after the corresponding Hosting deployment is live and the `/blog` signup route has been smoke-tested.

## Rollback

Rolling back the Angular UI removes the prompt, short-lived redirect-return behavior, and Profile controls without deleting account data. Older builds ignore the optional `communicationPreferences` field and any tab-scoped redirect record expires without server cleanup. Firestore Rules may retain the validated field safely, or the matching rules change can be rolled back after the older client is restored.

Rolling back only the auth-readiness hardening restores the former ambiguous initial `null` state and anonymous remote-log attempts, so use a full Hosting rollback only if the corresponding regression is understood. The `FirebaseAuthGuard` compatibility export can remain during rollback because it delegates to the same route contract.

Do not delete stored communication choices during a UI rollback. If email delivery is later activated, keep provider unsubscribe/suppression records authoritative even if the campaign UI is disabled. Existing browser push subscriptions continue to follow the PWA rollback guidance.

## Validation

Changes to this campaign should validate:

- `npm run build`
- `npm run lint`
- focused account-model, campaign-state, app-shell, login, and Profile tests
- anonymous article display with no timed dialog or body lock
- inline **Not now**, login, register, and article return paths
- desktop and mobile inline-card and signed-in follow-up rendering
- keyboard focus, Escape behavior, checkbox states, and reduced-motion behavior
- signed-in Profile preference changes
- explicit browser permission from a user gesture on a secure deployed origin
- no browser-console errors
- all Remotion still dimensions and the 1080×1920, 15-second H.264 video output

Final validation on July 25, 2026:

- `npm run build` passed; the campaign compiled into a separate 21 KB lazy chunk.
- `npm run lint` passed with no findings.
- The campaign lab passed ESLint, TypeScript, and Prettier checks.
- The app-shell, registration, campaign-state, and account-model specs passed (`20/20`).
- The repository-wide suite completed with `645/655` passing. The 10 unchanged failures are one admin route-inventory expectation, three existing chart-path expectations, and six publishing-calendar expectations; none are in the membership campaign's changed implementation or focused specs.
- Desktop (1280×720), mobile (390×844), and short keyboard-like (390×320) registration checks kept all four fields rendered after email entry with no horizontal overflow or console errors.

Auth-readiness hardening validation on August 3, 2026:

- The focused auth-state, membership-campaign, authentication-guard, Cat Corner route, and local-logging set passed (`14/14`).
- The complete Angular suite passed (`761/761`) on supported Node.js 24.15.0, including deterministic coverage that initialization does not prompt and that a delayed or open anonymous offer is cancelled when a signed-in session resolves.
- `npm run lint` and `npm run build` passed on Node.js 24.15.0; the production initial bundle remained `1.47 MB` raw and `334.38 kB` estimated transfer.
- The repository Playwright suite passed on desktop and mobile Chromium (`6/6`).
- A signed-out local-live article remained readable at the default desktop viewport and a 390×844 mobile override, with no horizontal overflow and no browser console warnings or errors. The browser already held a valid campaign dismissal, so the rendered offer itself was intentionally covered by deterministic component tests rather than by clearing user storage.

Accessibility hardening validation on August 4, 2026:

- Focused header, membership, and homepage-hero coverage passed (`34/34`), including initial campaign focus, dismissal restoration, search restoration, logo heading ownership, and the semantic featured title. The complete Angular suite passed (`763/763`).
- The live homepage and search dialog retain one route-owned H1, a visible featured H2, 44px primary controls, no horizontal overflow, and no console warnings or errors at 1280×720 and 390×844.
- The current browser's campaign dismissal was preserved. Modal containment/restoration for the membership offer was verified through the real CDK focus trap in headless Chromium rather than by altering reader storage.
- Repository lint and the production build passed on Node.js 24.15.0; the initial bundle is `1.48 MB` raw and `336.97 kB` estimated transfer. The content-backed Playwright suite passed on desktop and mobile Chromium (`6/6`); unrelated browser cases seed only their isolated test context with a one-day campaign frequency cap so the marketing prompt cannot cover the surface under test.

Inline reader-invitation validation on August 15, 2026:

- The focused membership, invitation-analytics, and topic contract set passed (`31/31`); the complete Angular suite passed (`936/936`) on supported Node.js 24.15.0.
- `npm run lint`, `npm run build`, the Functions build, the SEO-shell regression, and the focused Functions topic/fallback/header set (`15/15`) passed.
- At 390×844 in a clean anonymous browser, the article showed no modal, no body scroll lock, and no console warning/error after five seconds. The inline card measured 358px wide from y=181 to y=663, keeping Create account, Sign in, and Not now inside one viewport.
- Selecting **Not now** removed the card, preserved normal body scrolling, and left the reaction and related-reading flow visible.
