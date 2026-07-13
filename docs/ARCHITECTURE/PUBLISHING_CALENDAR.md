# Publishing Calendar And Social Delivery

## Purpose

The protected `/admin/cms/calendar` route is the planning surface for article launches and the announcements that promote them. Social announcements remain part of the source `BlogPost`, so editors do not have to reconcile a separate campaign database with the CMS schedule.

The first implementation deliberately separates planning and queueing from third-party delivery:

1. An editor schedules or publishes a blog post with the existing `status` and `publishedAt` fields.
2. The Calendar stores zero or more channel-specific announcements under `post.socialPromotion.announcements`. An announcement can follow the article's publication time or keep a custom delivery time.
3. The existing five-minute `publishScheduledPosts` Function promotes due posts to `published`.
4. In the same scheduled run, due announcements whose source post is live are written transactionally to `/socialOutbox/{postId}__{announcementId}` and marked `queued` on the post. Existing deterministic outbox records are reconciled instead of overwritten.
5. Future connector workers claim outbox documents, call provider APIs, and update delivery state to `posted` or `failed`.

This outbox boundary prevents provider availability, access-token expiry, rate limits, or retries from delaying the public article launch.

## Data Model

`BlogPost.socialPromotion` is optional for backward compatibility. Existing Firestore documents remain valid without migration.

Each `BlogSocialAnnouncement` includes:

- stable announcement ID
- channel: `notify`, `youtube`, `facebook`, `instagram`, or `linkedin`
- channel-specific message
- ISO delivery time
- optional delivery timing: `at-publish` follows later article reschedules; missing/`scheduled` keeps a fixed time for backward compatibility
- lifecycle state: `draft`, `scheduled`, `queued`, `posted`, `failed`, or `cancelled`
- created and updated timestamps
- optional link URL, provider media URL, posted timestamp, and failure reason

Multiple announcements can target the same channel. This allows a launch announcement plus later follow-up posts for an article that is already live.

## Component Inventory

- `PublishingCalendarComponent` owns month navigation, content filters, day selection, the upcoming queue, inline rescheduling, social composition, and announcement edits.
- `CmsPostEditorComponent` exposes a Distribution module that links saved scheduled/published posts directly into their Calendar plan.
- `BlogSocialPromotion` and `BlogSocialAnnouncement` extend the shared blog model without changing public article rendering.
- `BlogRepositoryService` remains the single post persistence boundary; Calendar changes use its existing `savePost` workflow.
- `publishScheduledPosts` remains the scheduled publication entry point and now also creates protected delivery outbox documents.
- Firestore rules allow CMS roles to inspect `/socialOutbox` while denying CMS client writes. The repository's existing super-admin catch-all remains an administrative override; routine creation and mutation belong to trusted backend code.

## Connector Readiness

Provider APIs and access policies change independently, so connectors should be small adapters behind one delivery interface rather than conditionals embedded in the scheduler.

| Channel | Proposed connector | Readiness notes |
| --- | --- | --- |
| Notify | Existing Web Push publish trigger | `notifyPublishedPost` already sends one generic title/excerpt alert on the transition to `published`. Calendar no longer creates a second Notify plan; migrate this trigger before adding editable notification copy to the outbox or subscribers could receive duplicates. |
| Facebook | Meta Pages API | Requires a Meta app, a managed Page, approved current permissions, and a renewable Page access-token flow. Confirm current review requirements during implementation. |
| Instagram | Instagram Content Publishing API | Intended for professional accounts and media publishing. A Calendar item will need an approved image/video asset; a link-only announcement is not a sufficient Instagram payload. |
| LinkedIn | Versioned Posts API | Supports member or organization posts, including article content. Requires OAuth, the appropriate social write permission, author URN, and current version headers. |
| YouTube | Manual or alternate workflow initially | The current YouTube Data API reference exposes writable resources such as videos and playlists but no documented Community Post creation resource. Treat Community posting as manual unless Google adds a supported endpoint; a future adapter could instead coordinate video upload or metadata updates. |

Reference material:

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Scheduled Firebase Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Meta Pages posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [YouTube Data API reference](https://developers.google.com/youtube/v3/docs)

## Connection Architecture And Rollout

External auto-posting is not enabled by this Calendar slice. `at-publish` means the plan becomes eligible for the protected outbox on the first five-minute scheduler run at or after article publication; it does not mean a provider has accepted the post.

Implement provider connections in this order:

1. **LinkedIn member posting** — the current Posts API supports text and article posts, and `w_member_social` is available through three-legged OAuth. Store the author URN and non-secret connection metadata separately from tokens.
2. **Facebook Page posting** — connect a managed Page through a reviewed Meta app and the current Page write permissions. Reuse one Meta connection boundary where appropriate, but keep Page and Instagram delivery adapters separate.
3. **Instagram professional publishing** — require a public image/video URL in the Calendar plan, then create and publish the provider media container. The Calendar now snapshots `mediaUrl` into the outbox for this purpose.
4. **YouTube Community** — keep manual until Google exposes a supported writable Community Post resource.

The future connection boundary should use server-authenticated OAuth start/callback endpoints with CSRF state validation. Store refresh/access tokens encrypted or in Secret Manager/KMS-backed storage; Firestore connection documents may expose only non-secret status such as provider, account label/id, granted scopes, expiry, last validation, and reconnect reason. Angular must never receive provider client secrets or refresh tokens.

Before activating the first worker, review existing pending outbox entries and establish an explicit enablement cutoff. A newly connected provider must not silently drain historical planning records. LinkedIn is the recommended first live adapter because it supports the current text/article payload without requiring the additional media workflow Instagram needs.

## Paused Handoff — July 13, 2026

External social auto-posting is deliberately paused while a higher-priority feature is handled in a separate workstream. The Calendar and queue foundation remains usable for editorial planning, but no external provider is connected and no provider delivery worker is live.

Completed before the pause:

- Calendar composition for launch-following and fixed-time announcements, including provider media URLs
- safe article and announcement rescheduling with fixed-time conflict protection
- Editor-to-Calendar deep links for scheduled and published posts
- five-minute publication/outbox queueing with deterministic IDs and stale-state reconciliation
- existing Web Push ownership documented and protected from duplicate Calendar notifications
- focused Calendar, validation, and delivery-state coverage

Still deferred:

- provider app registration and account approval
- OAuth start/callback endpoints, CSRF state handling, token storage, refresh, and reconnect flows
- non-secret connection metadata and health UI
- LinkedIn, Facebook, and Instagram delivery workers
- atomic claims, retries, cancellation, provider receipts, sanitized failures, and manual recovery controls
- live provider acceptance testing and deployment verification

Current behavior at the pause point:

- Calendar plans can progress into the protected outbox and show `queued` without posting to Facebook, Instagram, LinkedIn, or YouTube.
- Web Push continues to be sent by the existing `notifyPublishedPost` publication trigger; do not add a second Notify worker without first migrating ownership.
- YouTube Community promotion remains a manual workflow.
- Instagram plans require a public HTTP(S) media URL even though no Instagram worker consumes it yet.

Resume checklist:

1. Confirm the approved first provider and posting identity. The current recommendation is LinkedIn member posting; choose member versus organization before designing stored account metadata.
2. Register the provider app, approved redirect URL, scopes, and account access. Add secrets through the Firebase Functions secret workflow rather than Angular configuration or Firestore content documents.
3. Audit pending `/socialOutbox` documents and define an explicit created-at or deployment cutoff. Do not deliver historical queued work without editorial approval.
4. Implement server-side OAuth and expose only non-secret connection status to the CMS.
5. Implement one isolated LinkedIn worker with atomic claiming, idempotent retry behavior, delivery receipts, and reconnect handling.
6. Deploy any required Functions and rules changes, then test one controlled live post with an administrator account before enabling routine delivery.

## Delivery Worker Requirements

Before enabling any real connector:

- store provider credentials in Secret Manager, never in Angular or Firestore post documents
- use deterministic delivery IDs and provider idempotency keys where supported
- never overwrite an existing pending, processing, posted, failed, or cancelled deterministic outbox record from a stale post import
- claim work atomically and record attempt counts, response IDs, retry times, and sanitized errors
- distinguish retryable rate-limit/server failures from permanent permission or payload failures
- refresh OAuth tokens server-side and surface expired connections in the Calendar
- validate provider payloads again in the worker, including required media and current length limits
- provide a manual retry and cancel path for failed or pending deliveries
- avoid logging message bodies or tokens when provider responses contain sensitive data
- keep article publication successful even when all social providers fail

Cloud Tasks is a reasonable next execution layer when volume or retry needs outgrow the current Firestore outbox poller. It can schedule HTTP work and supply retry metadata, while Firestore remains the editorial audit record.

## Migration Notes

- No backfill is required. Posts without `socialPromotion` behave exactly as before.
- Existing announcements without `deliveryTiming` retain their fixed `scheduledAt` behavior. Only new or explicitly changed `at-publish` announcements follow article reschedules.
- Postponing an article past a fixed custom announcement is rejected until the editor moves or cancels that announcement; Calendar never silently rewrites a planned follow-up.
- Instagram plans now require an HTTP(S) media URL. Client validation is syntactic; the future provider worker must enforce reachable HTTPS media and reject private/local hosts before Meta fetches it.
- Existing `scheduled` posts continue to publish from `publishedAt`; the scheduled Function now performs an additional outbox scan after that work.
- Deploy the Functions change and Firestore rules before expecting Calendar announcements to move from `scheduled` to `queued`.
- The current release does not make external API calls. `queued` means the backend created durable delivery work, not that a provider accepted or published the message.
- Existing deterministic outbox records win over stale embedded announcement state, preventing an imported post snapshot from resetting completed or pending work for redelivery.
- Do not place OAuth refresh tokens or Page/account credentials in `BlogPost.socialPromotion` or `/socialOutbox`.
