# Social Preview And Share Attribution

## Purpose

Homepage shares now use the same CMS post-selection intent as the homepage hero while keeping `https://colinmichaels.com/` as the stable canonical Open Graph object. Signed-in share controls can add an opaque attribution ID that connects the outbound URL to the existing server-authorized share-points event and to non-point landing telemetry.

The two mechanisms are intentionally separate:

- `ogv` versions the image asset URL when the selected post or image changes.
- `share` identifies a specific outbound share for attribution.

Neither parameter changes the canonical URL or `og:url`.

## Homepage Social Preview Selection

The homepage social image follows this fallback order:

1. The CMS-selected published post when `featuredPostMode` is `selected`.
2. The newest published post marked `featured` when the selected post is missing or the mode is `featured`.
3. The newest published post.
4. The branded homepage image when no published post is available.

The page title and description remain the site-level ColinMichaels.com identity. Only the image, image alt text, and known image dimensions follow the selected post.

`HomepageSocialPreviewService` applies the selection after Angular loads the homepage data. The Firebase `renderSeoHtml` Function independently resolves the same selection from `homepageSettings/home` and published Firestore posts because social crawlers generally depend on the initial server response rather than Angular-rendered tags.

## Image Versioning

The resolved JPEG-compatible image receives a deterministic `ogv` parameter derived from:

- the social-card template version;
- the selected post ID;
- the post `updatedAt` value;
- the resolved image URL.

Example:

```text
https://colinmichaels.com/assets/social/post.jpg?ogv=1abc234
```

The token is a cache version, not a security signature. The canonical homepage URL and `og:url` remain unchanged. The server-rendered homepage shell uses a five-minute browser/CDN metadata cache so a CMS selection change does not remain behind the previous one-hour shared cache.

Social networks can still retain their own URL preview caches. Their inspector/debugger tools remain the final refresh mechanism when an already-shared URL displays old metadata.

## Tracked Share URLs

Signed-in share controls generate a different random opaque ID for each provider action:

```text
https://colinmichaels.com/?share={opaqueId}
https://colinmichaels.com/blog/{slug}?share={opaqueId}
```

Anonymous share controls continue to use the clean canonical URL without an attribution parameter.

`recordSiteShare` and `recordPostShare` register the ID server-side and award the existing share points at most once for their current event scope. A tracked share record includes:

- owner UID;
- provider;
- target type, ID, and path;
- creation and expiry timestamps;
- aggregate landing count.

The URL never contains a UID, email address, post title, or predictable Firestore document identifier.

## Landing Telemetry And Points Boundary

`ShareAttributionService` recognizes a valid `share` parameter after Angular navigation and calls `recordShareLanding` with a random session-scoped visit ID. The server records each `shareId + visitId` pair once, increments the share link's landing count, and applies a hard per-link landing ceiling to bound telemetry storage.

Landing telemetry does **not** award points. This prevents Open Graph crawlers, link unfurlers, repeat refreshes, and untrusted anonymous traffic from creating point events. The existing signed-in share action remains the only points boundary in this release. A future qualified-referral reward would require a separately documented reward amount, abuse controls, self-referral exclusion, and a stronger engagement signal.

## Collections And Security

- `shareLinks/{shareId}` stores server-created attribution records.
- `shareLandingEvents/{shareId_visitId}` stores idempotency records for landing telemetry.
- `userPointEvents/{eventId}` continues to store the durable points ledger and may reference `shareId` and `targetPath`.

Firestore Rules deny all direct client reads and writes to both share-tracking collections. Only callable Functions use the Admin SDK to access them. Share links expire logically after 180 days; a Firestore TTL policy can later use `expiresAtTimestamp` for physical cleanup.

## Component Inventory

- `homepage-social-preview.util.ts` owns post selection and deterministic image versioning.
- `HomepageSocialPreviewService` applies dynamic client-side homepage metadata.
- `BlogShareActionsComponent` creates provider-specific tracked URLs when tracking is enabled.
- `ShareAttributionService` observes landing parameters and provides session-level deduplication.
- `BlogEngagementService` calls post-share, site-share, and landing Functions.
- `renderSeoHtml` resolves crawler-facing homepage metadata.
- `recordPostShare`, `recordSiteShare`, and `recordShareLanding` enforce the server boundary.

## Migration And Deployment

- Existing posts and point records require no backfill.
- Existing clean share URLs continue to work.
- `shareId` and `targetPath` are optional on point events for backward compatibility.
- Deploy Angular Hosting, Firebase Functions, and Firestore Rules together.
- No provider OAuth or automatic social posting behavior is changed by this feature.
