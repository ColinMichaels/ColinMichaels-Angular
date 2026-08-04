# Publishing Calendar And Social Delivery

## Purpose

The protected post editor is the primary composition surface for an article and the announcements that promote it. Its URL-backed `Post`, `Social shares`, and `Preview & SEO` workspaces let an editor develop native social copy while the article is still taking shape. The protected `/admin/cms/calendar` route remains the timing and queue surface. Social announcements stay part of the source `BlogPost`, so editors do not have to reconcile a separate campaign database with the CMS schedule.

The first implementation deliberately separates planning and queueing from third-party delivery:

1. An editor schedules or publishes a blog post with the existing `status` and `publishedAt` fields.
2. The shared social editor stores zero or more channel-specific announcements under `post.socialPromotion.announcements`. A draft can remain unscheduled in the post editor; Calendar can later make it follow publication or assign a custom delivery time.
3. The existing five-minute `publishScheduledPosts` Function promotes due posts to `published`.
4. In the same scheduled run, due announcements whose source post is live are written transactionally to `/socialOutbox/{postId}__{announcementId}` and marked `queued` on the post. Existing deterministic outbox records are reconciled instead of overwritten.
5. Future connector workers claim outbox documents, call provider APIs, and update delivery state to `posted` or `failed`.

This outbox boundary prevents provider availability, access-token expiry, rate limits, or retries from delaying the public article launch.

## Data Model

`BlogPost.socialPromotion` is optional for backward compatibility. Existing Firestore documents remain valid without migration.

Each `BlogSocialAnnouncement` includes:

- stable announcement ID
- channel: `notify`, `youtube`, `facebook`, `instagram`, `threads`, `x`, or `linkedin`
- channel-specific message
- optional ISO delivery time while the announcement is a draft; every later lifecycle state requires a valid time
- optional delivery timing: `at-publish` follows later article reschedules; missing/`scheduled` keeps a fixed time for backward compatibility
- lifecycle state: `draft`, `scheduled`, `queued`, `posted`, `failed`, or `cancelled`
- created and updated timestamps
- optional link URL, provider media URL, posted timestamp, and failure reason
- optional promotion angle: personal story, conversation starter, practical takeaway, or behind the scenes
- optional native media type: image or video, paired with a public media URL
- optional link placement: main post, first comment, profile, or no link
- optional native post format: text, link, image, video, reel, story, carousel, thread, or Community post, validated against the selected channel

The shared Social Shares composer resolves image and video attachments through `BlogMediaUploaderComponent`. Editors can reuse a ready item from the Media Library, upload through the existing Firebase Storage pipeline, or paste a public HTTP(S) URL. The selected URL and explicit `mediaType` remain the only announcement fields persisted, so no media migration or duplicate attachment collection is required. Image uploads keep the existing 8 MB optimized blog-media path; video uploads use the Media Library path and its existing 25 MB Storage-rule limit.

Multiple announcements can target the same channel. This allows a launch announcement plus later follow-up posts for an article that is already live.

Announcements created before the native-promotion fields were added remain valid. Missing `linkPlacement` means the historical in-post link behavior; a saved `mediaUrl` without `mediaType` is treated as an image in the Calendar.

## Native-First Promotion Workflow

The Calendar composer treats an article share as a small campaign asset rather than a generated link preview. Every channel plan can independently choose:

1. a promotion angle that leads with Colin's story, a question, a useful takeaway, or the reason the article was written;
2. editable starter copy generated deterministically from the article title and excerpt;
3. a public image or video to publish natively with the text; and
4. whether the article URL belongs in the main post, a first comment, the profile, or nowhere in that share.

Facebook defaults to a personal-story/image/first-comment experiment, Instagram defaults to personal-story/image/profile-link, Threads defaults to a conversation starter, and LinkedIn defaults to a practical takeaway. These are editable starting points, not claims that one distribution tactic is universally preferred. Editors should replace generic context with a real personal detail, observation, or question before scheduling.

The source article URL is retained separately from the visible message even when link placement is `first-comment`, `profile`, or `none`. This gives a future delivery worker enough information to perform a follow-up comment or omit the URL from the provider payload without losing the canonical campaign destination.

## Post Editor Workflow

The post route remains `/admin/cms/:slug/edit`; workspace state is represented with query parameters rather than new routes. Calendar and other CMS surfaces can deep-link to `?tab=social&channel=facebook&announcement=<id>`. Editor.js stays mounted while workspaces are hidden so changing tabs cannot discard an unsaved article document.

Focusing the Publish Date field or choosing **View calendar** opens an embedded scheduling surface beneath the field. It reuses `PublishingCalendarMonthComponent`, the same Monday-first month grid rendered by `/admin/cms/calendar`, and the same pure event/day projection utilities. The editor filters that shared projection to other scheduled posts, keeps the current post out of its own availability check, and lets the editor apply an open suggested time directly to the existing reactive form. The suggestions at 9:00 AM, noon, 3:00 PM, and 6:00 PM are convenience choices; they do not introduce a uniqueness constraint or replace the existing future-date validation.

The shared social editor is a controlled component. It owns channel selection, platform formats, native-media planning, copy, approximate previews, AI suggestions, and local dirty state, but it does not inject `BlogRepositoryService`. The post editor merges social changes into its normal whole-post save. Calendar remains a separate persistence host for schedule operations. This prevents a child component from overwriting unsaved article fields with a stale post snapshot.

Calendar opens the shared editor in a full-width scheduling workspace. Unsaved Calendar composition is cached per post for the lifetime of the page, so closing the workspace, changing days, or receiving a live repository update does not silently replace in-progress copy. A successful save clears that cached draft.

An unscheduled social draft or cancelled plan is valid and intentionally absent from the Calendar timeline and delivery outbox. Saving the article preserves that record. Scheduling a draft later adds a valid `scheduledAt` value and changes its lifecycle state to `scheduled`.

## AI-Assisted Social Copy

`generateBlogSocialPosts` is a CMS-authenticated Firebase callable designed to use the Firebase-managed `OPENAI_API_KEY` secret and `OPENAI_TEXT_MODEL` parameter through the OpenAI Responses API with a strict JSON schema. The client supplies the current unsaved article context, canonical article URL, and the selected channel, angle, link placement, format, and optional current draft. The callable returns two or three channel-specific alternatives with a short rationale and a grounded media concept.

AI output is suggestion-only. It never auto-saves, changes timing, or overwrites edited copy; an editor must choose **Apply**. The backend treats article content and current copy as untrusted reference data, preserves the requested target contract even when long source material is truncated, prohibits invented lived experience, quotes, statistics, urgency, and unsupported claims, and requires `[Add personal detail]` when a personal-story angle lacks a sourced detail. Returned variants are rejected if they exceed the platform limit or place a URL in a `first-comment`, `profile`, or `none` message. If the callable is unavailable, the UI keeps the existing draft and offers the deterministic `createBlogSocialMessage` starter copy instead.

Suggestion rationale and media concepts remain transient UI state. They are not written to a published `BlogPost`. Because embedded `socialPromotion` data follows the existing post-document access model, editors must not place private campaign notes, credentials, audience data, or provider tokens in announcement copy or metadata. Moving promotion drafts into a dedicated protected collection remains the appropriate future change if private campaign collaboration is required.

### Checkpoint And Deferred Activation

This source checkpoint includes the callable contract, guarded backend implementation, explicit-apply editor experience, and deterministic local fallback. It does not add, rotate, export, or expose an OpenAI credential, and it does not deploy Hosting or Functions. Live AI validation is a separate follow-up: confirm `OPENAI_API_KEY` in the intended Firebase project, review the `OPENAI_TEXT_MODEL` value, deploy Hosting and Functions together, and exercise the callable with an authenticated CMS account. Until that activation succeeds, the composer remains usable through manual copy and deterministic starter text.

Social-provider account connections and delivery workers are a separate boundary from AI copy generation. An editor can generate or prepare channel-specific copy without connecting Facebook, Instagram, X, LinkedIn, Threads, or YouTube, but actual third-party publishing still follows the connector readiness and rollout controls below.

## Component Inventory

- `PublishingCalendarComponent` owns month navigation, content filters, day selection, the upcoming queue, inline rescheduling, and host-level persistence for scheduled social plans.
- `PublishingCalendarMonthComponent` owns the reusable visual month grid, day/event selection, filter controls, and scheduled/published/social event presentation shared by the full Calendar and post editor.
- `publishing-calendar.utils.ts` owns the reusable local-date keys, event projection, filtering, and fixed six-week Monday-first day grid.
- `PostScheduleCalendarComponent` adapts the shared month grid for post-date selection, showing only other scheduled posts and emitting an explicitly selected open suggested time without writing to the repository directly.
- `SocialPromotionEditorComponent` is the controlled, reusable composition surface shared by the post editor and Calendar. It owns channel drafts, format/media/link choices, approximate previews, explicit AI suggestion application, and schedule fields without directly writing a post.
- `blog-social-promotion.util.ts` owns migration-safe channel defaults and deterministic native-first starter copy so the Calendar component does not duplicate copy rules.
- `SocialConnectionsPageComponent` owns sanitized Facebook, Instagram, and Threads connection health, explicit Facebook Page selection, direct Instagram connection status, reconnect, and disconnect actions. It never reads provider tokens.
- `SocialConnectionsService` is the Angular callable boundary for connection operations.
- `social-connection-functions.ts` owns CMS authorization, OAuth state consumption, provider token exchange, encrypted token persistence, and callback redirects without enabling delivery.
- `social-connections.ts` owns pure provider URL, signed-state, and AES-256-GCM primitives with focused Node tests.
- `CmsPostEditorComponent` owns the URL-backed Post/Social/Preview workspace shell, protects Editor.js from tab unmounts, merges social dirty state into unified saves and JSON backups, and links scheduled/published posts into Calendar.
- `BlogAiFunctionsService` exposes the protected social-copy callable; `blog-social-ai.ts` owns its bounded input parsing, strict provider schema, grounding prompt, and response validation.
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
| Instagram | Instagram Content Publishing API | Intended for professional accounts and media publishing. The Calendar requires an image/video selection and public media URL; a link-only announcement is not a sufficient Instagram payload. |
| Threads | Threads API | Connection authorization and Calendar planning are supported. Future delivery uses the separate Threads container/publish workflow and remains disabled until the outbox worker cutoff is approved. |
| X (Twitter) | Manual plan | Composition and thread-format planning are supported, but no X account connection or delivery worker is configured. Keep delivery manual until a separate provider review and connection boundary are approved. |
| LinkedIn | Versioned Posts API | Supports member or organization posts, including article content. Requires OAuth, the appropriate social write permission, author URN, and current version headers. |
| YouTube | Manual or alternate workflow initially | The current YouTube Data API reference exposes writable resources such as videos and playlists but no documented Community Post creation resource. Treat Community posting as manual unless Google adds a supported endpoint; a future adapter could instead coordinate video upload or metadata updates. |

Reference material:

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Scheduled Firebase Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Meta Pages posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Threads API](https://developers.facebook.com/docs/threads/)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [YouTube Data API reference](https://developers.google.com/youtube/v3/docs)

## Connection Architecture And Rollout

External auto-posting is not enabled by this Calendar slice. `at-publish` means the plan becomes eligible for the protected outbox on the first five-minute scheduler run at or after article publication; it does not mean a provider has accepted the post.

Implement provider connections in this order:

1. **LinkedIn member posting** — the current Posts API supports text and article posts, and `w_member_social` is available through three-legged OAuth. Store the author URN and non-secret connection metadata separately from tokens.
2. **Facebook Page posting** — connect a managed Page through a reviewed Meta app and the current Page write permissions. Reuse one Meta connection boundary where appropriate, but keep Page and Instagram delivery adapters separate.
3. **Instagram professional publishing** — require a public image/video URL in the Calendar plan, then create and publish the provider media container. The Calendar now snapshots `mediaUrl` into the outbox for this purpose.
4. **YouTube Community** — keep manual until Google exposes a supported writable Community Post resource.

The connection boundary uses CMS-authenticated callable starts and public HTTPS callbacks protected by signed, single-use, ten-minute state records. Provider tokens are encrypted with provider-bound AES-256-GCM before backend-only Firestore persistence. `/socialConnections` exposes only non-secret status such as provider, account label/id, granted scopes, expiry, and last validation. Angular never receives provider client secrets or access tokens.

Before activating the first worker, review existing pending outbox entries and establish an explicit enablement cutoff. A newly connected provider must not silently drain historical planning records. LinkedIn is the recommended first live adapter because it supports the current text/article payload without requiring the additional media workflow Instagram needs.

## Paused Handoff — July 13, 2026 (Historical)

External social auto-posting was deliberately paused while a higher-priority feature was handled in a separate workstream. Connection-only work resumed later the same day, but this snapshot remains as the boundary before credentials and OAuth were introduced. No provider delivery worker is live.

Completed before the pause:

- Calendar composition for launch-following and fixed-time announcements, including provider media URLs
- safe article and announcement rescheduling with fixed-time conflict protection
- Editor-to-Calendar deep links for scheduled and published posts
- five-minute publication/outbox queueing with deterministic IDs and stale-state reconciliation
- existing Web Push ownership documented and protected from duplicate Calendar notifications
- focused Calendar, validation, and delivery-state coverage

Deferred at the pause point:

- provider app registration and account approval
- OAuth start/callback endpoints, CSRF state handling, token storage, refresh, and reconnect flows
- non-secret connection metadata and health UI
- LinkedIn, Facebook, and Instagram delivery workers
- atomic claims, retries, cancellation, provider receipts, sanitized failures, and manual recovery controls
- live provider acceptance testing and deployment verification

Current behavior at the pause point:

- Calendar plans can progress into the protected outbox and show `queued` without posting to Facebook, Instagram, Threads, LinkedIn, or YouTube.
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

## Connection-Only Implementation — July 13, 2026

The repository now includes the authorization and account-health layer for Facebook, Instagram, and Threads. Deployment is still required before the configured callback URLs resolve.

Facebook Pages use Facebook Login for Business with the Meta publishing app credential pair. Instagram uses Instagram Business Login with its provider-issued Instagram app ID and secret, requests `instagram_business_basic` and `instagram_business_content_publish`, exchanges codes through `api.instagram.com`, and validates the directly authorized professional account through `graph.instagram.com`. It no longer depends on Facebook Page discovery. Threads remains a separate Meta app and credential pair.

- `/admin/cms/social-connections` shows disconnected, connected, expired, error, or account-selection state and repeats that delivery is disabled.
- `beginSocialConnection` requires a CMS role, creates signed single-use OAuth state, and returns a provider authorization URL.
- Provider callbacks atomically consume state, exchange authorization codes server-side, obtain longer-lived user tokens where supported, and redirect to the protected connection page.
- Multiple Facebook Pages stop at `needs-selection`; an editor must explicitly choose the intended Page. Instagram Business Login authorizes one professional account directly and becomes connected after profile validation.
- `/socialConnectionSecrets/{provider}` contains only provider-bound encrypted token payloads, denies all client access, and is excluded from the legacy recursive super-admin rule.
- `/socialConnections/{provider}` contains sanitized account identity, scopes, expiry, and validation timestamps and permits CMS reads only.
- Disconnect deletes the encrypted token record but deliberately leaves Calendar plans and outbox records unchanged.
- Threads is now a first-class Calendar planning channel with a 500-character composition limit.

This phase does not call any publishing endpoint, claim outbox work, refresh tokens on a schedule, or mark an announcement `posted`. Before a future worker is deployed, audit pending outbox documents and implement an explicit enablement timestamp or delivery allowlist.

## Delivery Worker Requirements

Before enabling any real connector:

- store provider credentials in Secret Manager, never in Angular or Firestore post documents
- use deterministic delivery IDs and provider idempotency keys where supported
- never overwrite an existing pending, processing, posted, failed, or cancelled deterministic outbox record from a stale post import
- claim work atomically and record attempt counts, response IDs, retry times, and sanitized errors
- distinguish retryable rate-limit/server failures from permanent permission or payload failures
- refresh OAuth tokens server-side and surface expired connections in the Calendar
- validate provider payloads again in the worker, including required media and current length limits
- map `mediaType` and `mediaUrl` into the provider's native upload/container workflow instead of falling back to a link-preview post
- honor `linkPlacement`: omit the URL from the main payload for profile/no-link plans and create a follow-up comment only where the provider and connected identity support it
- provide a manual retry and cancel path for failed or pending deliveries
- avoid logging message bodies or tokens when provider responses contain sensitive data
- keep article publication successful even when all social providers fail

Cloud Tasks is a reasonable next execution layer when volume or retry needs outgrow the current Firestore outbox poller. It can schedule HTTP work and supply retry metadata, while Firestore remains the editorial audit record.

## Migration Notes

- The embedded post-editor calendar reads the existing `BlogPost.status` and `BlogPost.publishedAt` fields and emits the existing `datetime-local` form value. It adds no stored field, Firestore index, Rules, Function, dependency, or backfill requirement.
- Rollback is UI-only: remove `PostScheduleCalendarComponent` from the post editor and restore the full Calendar's inlined month view if the shared component extraction is reverted. Existing scheduled posts and typed Publish Date values remain valid.
- Suggested slots indicate exact-hour occupancy among scheduled posts; they are not a server-enforced publishing policy. Manually entered future times continue through the existing validation and save path.
- No backfill is required. Posts without `socialPromotion` behave exactly as before.
- Existing announcements without `deliveryTiming` retain their fixed `scheduledAt` behavior. Only new or explicitly changed `at-publish` announcements follow article reschedules.
- Existing announcements without `contentAngle`, `mediaType`, or `linkPlacement` require no backfill. They render as custom copy, infer image media from any existing `mediaUrl`, and retain in-post link behavior.
- Existing announcements without `postFormat` require no backfill and keep the legacy provider behavior. New formats are optional, channel-validated metadata for the editor and future workers.
- Existing announcements keep their required schedule. New `draft` and `cancelled` records may omit `scheduledAt`; unscheduled records never enter Calendar events or the outbox parser.
- `x` is an additive channel value. Older clients ignore the optional promotion data; no X connection or automatic delivery is enabled by this release.
- Deploy Hosting and Functions together before relying on AI social suggestions. Before deployment, verify the Firebase-managed OpenAI secret/model configuration in the intended project; this checkpoint commits no credential, browser-visible API key, or new Firestore collection.
- Rolling back the Calendar UI and Functions queue changes leaves the optional strategy fields inert in Firestore. Older clients ignore them while continuing to read the existing message, link URL, and media URL fields.
- Postponing an article past a fixed custom announcement is rejected until the editor moves or cancels that announcement; Calendar never silently rewrites a planned follow-up.
- Instagram plans now require an HTTP(S) media URL. Client validation is syntactic; the future provider worker must enforce reachable HTTPS media and reject private/local hosts before Meta fetches it.
- Existing `scheduled` posts continue to publish from `publishedAt`; the scheduled Function now performs an additional outbox scan after that work.
- Deploy the Functions change and Firestore rules before expecting Calendar announcements to move from `scheduled` to `queued`.
- Deploy Functions, Firestore rules, and Hosting together before testing social OAuth callbacks. Rolling back the connection-only release means removing the three callback rewrites and Functions exports; encrypted connection records may remain inert or be disconnected from the CMS first.
- Register the Facebook callback in Facebook Login for Business and the Instagram callback in Instagram Business Login. Deploy `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` before the updated Instagram callback Function. Existing Instagram connections created through the former Facebook-Page-linked token format must reconnect; no Firestore document backfill is required. Rollback requires restoring the former shared Meta credential binding and reconnecting Instagram again because the encrypted token formats are intentionally provider-flow-specific.
- The current release does not make external API calls. `queued` means the backend created durable delivery work, not that a provider accepted or published the message.
- Existing deterministic outbox records win over stale embedded announcement state, preventing an imported post snapshot from resetting completed or pending work for redelivery.
- Do not place OAuth refresh tokens or Page/account credentials in `BlogPost.socialPromotion` or `/socialOutbox`.
