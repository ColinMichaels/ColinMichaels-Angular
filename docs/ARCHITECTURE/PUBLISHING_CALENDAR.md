# Publishing Calendar And Social Delivery

## Purpose

The protected `/admin/cms/calendar` route is the planning surface for article launches and the announcements that promote them. Social announcements remain part of the source `BlogPost`, so editors do not have to reconcile a separate campaign database with the CMS schedule.

The first implementation deliberately separates planning and queueing from third-party delivery:

1. An editor schedules or publishes a blog post with the existing `status` and `publishedAt` fields.
2. The Calendar stores zero or more channel-specific announcements under `post.socialPromotion.announcements`.
3. The existing five-minute `publishScheduledPosts` Function promotes due posts to `published`.
4. In the same scheduled run, due announcements whose source post is live are written transactionally to `/socialOutbox/{postId}__{announcementId}` and marked `queued` on the post.
5. Future connector workers claim outbox documents, call provider APIs, and update delivery state to `posted` or `failed`.

This outbox boundary prevents provider availability, access-token expiry, rate limits, or retries from delaying the public article launch.

## Data Model

`BlogPost.socialPromotion` is optional for backward compatibility. Existing Firestore documents remain valid without migration.

Each `BlogSocialAnnouncement` includes:

- stable announcement ID
- channel: `notify`, `youtube`, `facebook`, `instagram`, or `linkedin`
- channel-specific message
- ISO delivery time
- lifecycle state: `draft`, `scheduled`, `queued`, `posted`, `failed`, or `cancelled`
- created and updated timestamps
- optional link URL, posted timestamp, and failure reason

Multiple announcements can target the same channel. This allows a launch announcement plus later follow-up posts for an article that is already live.

## Component Inventory

- `PublishingCalendarComponent` owns month navigation, content filters, day selection, the upcoming queue, inline rescheduling, social composition, and announcement edits.
- `BlogSocialPromotion` and `BlogSocialAnnouncement` extend the shared blog model without changing public article rendering.
- `BlogRepositoryService` remains the single post persistence boundary; Calendar changes use its existing `savePost` workflow.
- `publishScheduledPosts` remains the scheduled publication entry point and now also creates protected delivery outbox documents.
- Firestore rules allow CMS roles to inspect `/socialOutbox` while denying CMS client writes. The repository's existing super-admin catch-all remains an administrative override; routine creation and mutation belong to trusted backend code.

## Connector Readiness

Provider APIs and access policies change independently, so connectors should be small adapters behind one delivery interface rather than conditionals embedded in the scheduler.

| Channel | Proposed connector | Readiness notes |
| --- | --- | --- |
| Notify | Firebase Admin SDK / Firebase Cloud Messaging | Requires browser notification opt-in, registration-token storage, unsubscribe handling, and a subscriber topic strategy. Email can be a later separate adapter. |
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

## Delivery Worker Requirements

Before enabling any real connector:

- store provider credentials in Secret Manager, never in Angular or Firestore post documents
- use deterministic delivery IDs and provider idempotency keys where supported
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
- Existing `scheduled` posts continue to publish from `publishedAt`; the scheduled Function now performs an additional outbox scan after that work.
- Deploy the Functions change and Firestore rules before expecting Calendar announcements to move from `scheduled` to `queued`.
- The current release does not make external API calls. `queued` means the backend created durable delivery work, not that a provider accepted or published the message.
- Do not place OAuth refresh tokens or Page/account credentials in `BlogPost.socialPromotion` or `/socialOutbox`.
