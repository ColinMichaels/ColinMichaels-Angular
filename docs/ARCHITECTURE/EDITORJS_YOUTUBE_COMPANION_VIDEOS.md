# Editor.js YouTube Companion Videos

## Purpose

Editors can pair one article with one exact Captain Colin video without adding a second post-level media model. The existing trusted YouTube Editor.js block owns the relationship, the article ending exposes a clear continuation, and unrelated YouTube references remain ordinary embeds.

## Authoring And Persistence

The YouTube block includes **Use as this article's companion video**. Selecting it stores `isCompanionVideo: true` on the canonical typed `embed` block alongside the normalized YouTube watch and embed URLs. The revealed **Companion video search metadata** fields persist the exact public title, factual description, ISO upload date, and positive runtime in seconds as `videoTitle`, `videoDescription`, `videoUploadDate`, and `videoDurationSeconds`. Missing or `false` values preserve the legacy embed contract and are omitted during canonical normalization.

Only one YouTube block may be selected per article. Whole-document validation reports a blocking `multiple-companion-videos` diagnostic, and direct Editor.js adaptation rejects the same ambiguous document. URL normalization accepts exact HTTP(S) YouTube watch, share, Shorts, live, and no-cookie embed destinations; lookalike hosts, unsafe schemes, and malformed video IDs are rejected.

These fields are additive. Existing posts require no migration or backfill, and opening or saving an ordinary YouTube embed does not add the marker or metadata. The editor and trusted publishing boundary accept ISO calendar dates or timezone-qualified ISO timestamps, reject invalid dates and non-positive runtimes, and allow video metadata only on a selected YouTube companion.

## Public Reader Journey

On a published online article, the exact selected companion takes priority over generic promotion:

1. `BlogDetailComponent` resolves the first valid flagged YouTube block.
2. `YouTubeCompanionVideoComponent` renders the exact video thumbnail, watch action, and Captain Colin subscribe action after reader feedback.
3. The card is deferred until it approaches the viewport and does not call the latest-video Function.
4. If no exact companion exists, explicitly classified drone/FPV articles retain the contextual latest-channel fallback.
5. Preview and offline article routes do not render either outbound continuation.

The Functions crawler fallback uses the canonical watch URL and descriptive **Watch the companion video on Captain Colin YouTube** anchor for a flagged block. When title, description, upload date, and trusted YouTube identity are complete, both Angular and Functions nest the same `VideoObject` under `BlogPosting`, with a derived YouTube thumbnail, canonical watch `url`, player `embedUrl`, and ISO 8601 `duration` when runtime is present. They deliberately omit `contentUrl` because a YouTube watch page is not the video byte stream. Missing or malformed evidence emits no `VideoObject`, keeps the companion reader journey intact, and makes no rich-result promise.

## Analytics And Privacy

Exact pair selections reuse `select_content` with `source_component=article_companion_youtube`. The event contains only the public video/channel ID, `content_group=youtube`, and a fixed action code. It excludes article copy, video title or description, visitor identity, and YouTube account data. The latest-feed article fallback remains separately attributable as `article_drones_youtube`.

YouTube Studio remains authoritative for views, watch time, subscriptions, and retention. The site event proves only that the outbound action was selected.

## Roles And Operator Workflow

The control lives inside the CMS post editor and therefore uses `CMS_ACCESS_ROLES`: `admin`, `cmsAdmin`, and `contentEditor`. The existing `/admin/guide#create-and-publish-a-post` entry documents the exact label, one-selection limit, Production Preview check, and manual reciprocal-link boundary. Viewer and media-manager roles do not receive the restricted guidance.

## Deployment, Migration, And Rollback

No Firestore migration, index, Rule, secret, dependency, or YouTube write permission is required. Release the Angular Hosting application and refresh/deploy the Functions SEO renderer together so hydrated and crawler views agree.

Before deployment:

1. run focused CMS, URL, article-journey, schema, analytics, and component tests;
2. run the complete Angular suite, `npm run build`, `npm run lint`, and `npm run build:functions`;
3. run `npm run prepare:functions-seo` and the SEO shell validator;
4. verify one flagged and one unflagged article at mobile and desktop widths, including keyboard focus and browser console output.

Rollback can stop emitting the optional nested `video` object and ignore the metadata fields without rewriting posts. Older readers safely ignore the fields; an older editor may omit them on a later resave. To deliberately remove a pairing before rollback, clear the checkbox and save the post through the canonical publishing workflow.

## Deferred Boundary

The site cannot add the reciprocal article link to a YouTube description, card, end screen, playlist, or pinned comment without an authorized channel edit. Editors must complete that external step manually and verify the public destination. Automatic channel mutation remains out of scope.
