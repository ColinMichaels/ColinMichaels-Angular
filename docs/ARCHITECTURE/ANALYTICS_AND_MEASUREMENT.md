# Analytics and Measurement

## Purpose

The public site uses Google Analytics 4 to answer three practical questions:

1. Did a likely visitor arrive and engage beyond a page load?
2. Which articles and discovery surfaces held attention?
3. Which actions show useful reader intent: completion, saving, sharing, reacting, polling, searching, finishing Daily Discovery, choosing a Captain Colin video/channel action, or responding to the after-article account invitation?

GA4 remains aggregate directional evidence. It cannot prove that every event came from a unique human. Known-bot filtering, internal-traffic testing, engagement events, and comparison with Search Console and backend-authorized actions are the confidence layers.

## Runtime Architecture

- `src/index.html` loads the Google tag directly for the single production destination, `G-6V5GQRZFBH`, only on public, non-local routes. It disables the automatic initial page view so Angular route changes remain the page-view authority.
- `AppComponent` sends one query-free `page_view` per Angular path through `SiteAnalyticsService`. Query values and fragments are excluded so search text or share tokens cannot enter page-location reports.
- The retired `GTM-Q6BN` loader is no longer part of the application shell. That removes the legacy Universal Analytics destination, extra Google tag, click-listener tag, and Facebook Pixel from the deployed runtime without publishing or deleting the external GTM container.
- `SiteAnalyticsService` sends explicit GA4 events only to `G-6V5GQRZFBH` using `send_to`.
- The service is disabled during server rendering, on localhost and `.local` hosts, and on `/admin` routes.
- Components report an action only after the corresponding user action succeeds where success matters, such as saving an article or submitting a comment.
- Existing Firebase callable Functions remain authoritative for points, comments, and share attribution. GA4 is not an authorization, reward, or accounting source.

## Event Catalog

| Event                      | Trigger                                                                                                                                     | Important parameters                                                                |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `page_view`                | First render of each distinct Angular route path                                                                                            | query-free `page_location`, `page_path`, `page_title`                               |
| `article_progress`         | First crossing of 25%, 50%, 75%, and 95% per article and browser session                                                                    | `content_id`, `content_slug`, `content_group`, `progress_percent`, `auth_state`     |
| `article_complete`         | First 95% reading milestone                                                                                                                 | article parameters, `progress_percent`                                              |
| `article_saved`            | Favorite, Read Later, or offline copy is added successfully                                                                                 | article parameters, `save_type`, `auth_state`                                       |
| `article_unsaved`          | The matching saved state is removed successfully                                                                                            | article parameters, `save_type`, `auth_state`                                       |
| `continue_reading`         | A reader follows a Continue Reading card                                                                                                    | article parameters, saved `progress_percent`, `source_component`                    |
| `share`                    | A homepage or article share action is invoked                                                                                               | article or website type, `method`, `source_component`, `auth_state`                 |
| `share_landing`            | The server accepts a valid shared-link landing                                                                                              | `source_component`                                                                  |
| `comment_submit`           | A comment or reply is accepted by the backend                                                                                               | article parameters, `reply`, `moderation_status`                                    |
| `search`                   | A submitted search or search-result/advanced-search selection                                                                               | redacted `search_term`, `result_count`, `source_component`                          |
| `select_content`           | A search/reading result, contextual next-read article, YouTube action, creator-profile handoff, or same-site printable resource is selected | content parameters, `source_component`, optional redacted `search_term`, `method`   |
| `content_reaction`         | A reader chooses or changes one device-local article reaction                                                                               | article parameters, `reaction_type`, `reaction_updated`, `auth_state`               |
| `reader_membership_invite` | The eligible after-article invitation is viewed, selected, or dismissed                                                                     | bounded `content_slug`, `source_component=after_article`, `method`, anonymous state |
| `poll_vote`                | The authenticated poll callable accepts a new or changed vote                                                                               | article parameters, `poll_id`, `option_id`, `vote_updated`, `results_visible`       |
| `daily_discovery_start`    | The persistent reader play experience opens                                                                                                 | `challenge_id`, `challenge_type`, `auth_state`                                      |
| `daily_discovery_answer`   | The backend returns an answer result                                                                                                        | challenge parameters, `correct`, `daily_complete`, `auth_state`                     |
| `daily_discovery_complete` | The final correct answer completes the daily set                                                                                            | `total_questions`, `auth_state`                                                     |

GA4 Enhanced Measurement should collect 90% page scrolls, outbound clicks, form interactions, video engagement, and file downloads. Angular owns page views because this is a single-page application. Enhanced site search stays disabled because it can transmit the raw `q` URL value; the first-party `search` event applies the privacy filter instead.

## Privacy Boundary

- Comment bodies, poll questions and option labels, Daily Discovery questions and answers, email addresses, user IDs, share IDs, and profile names are never sent.
- Search text is whitespace-normalized and capped at 80 characters. Values that resemble an email address, phone number, or URL become `[redacted]`.
- Public content IDs, slugs, categories, action state, and coarse signed-in/anonymous state are allowed.
- Site-to-YouTube selections send only the public video/channel ID, `content_type`, `content_group=youtube`, one bounded source (`homepage_youtube`, `topic_drones_youtube`, `article_drones_youtube`, or `article_companion_youtube`), and a fixed action code. Video titles, descriptions, viewer identity, and YouTube account data are omitted.
- Homepage creator-profile selections send only one fixed platform code (`youtube`, `x`, `github`, `instagram`, or `linkedin`) with `content_group=creator_profile`, `source_component=homepage_social`, and `method=outbound`. Profile URLs, labels, referrers, account data, and visitor identity are omitted.
- Printable-resource selections send only a normalized filename stem capped at 64 characters with `content_type=resource`, `content_group=download`, `source_component=topic_guide` or `resource_page`, and `method=download`. The full URL, link label, referrer text, and reader identity are omitted.
- Reader-invitation events send only the normalized public article slug, `source_component=after_article`, fixed `method` values (`view`, `register`, `login`, or `dismiss`), and anonymous state. They omit account IDs, email addresses, preference values, and destination query strings.
- Contextual article selections reuse `select_content` with the public destination article identity and `source_component=related_reading`. The event does not send recommendation scores, source-article prose, viewer identity, or the full URL.
- Anonymous article reactions remain in local storage as one preference per article and device. GA4 receives the reaction code in aggregate; reactions never write to Firestore, award points, or claim survey-grade identity.
- Admin activity and local development are excluded at the application boundary.

## GA4 Reporting Setup

The production property now has these event-scoped custom dimensions registered:

- `content_type`, `content_slug`, `content_group`
- `source_component`, `auth_state`, `method`, `save_type`
- `moderation_status`, `challenge_type`, `correct`, `daily_complete`

It also has `progress_percent`, `result_count`, and `total_questions` registered as event-scoped custom metrics. After the application instrumentation is deployed and the new events first appear in GA4, mark `article_complete`, `article_saved`, `share`, `comment_submit`, and `daily_discovery_complete` as key events. These changes affect future reports and do not backfill historical data.

After the reaction and poll events are deployed, register `reaction_type`, `reaction_updated`, `vote_updated`, and `results_visible` as event-scoped custom dimensions. Keep `poll_id` and `option_id` available in raw event diagnostics rather than custom definitions by default; their growing cardinality makes them poor primary report dimensions. Reactions and poll votes are editorial feedback, not conversion key events.

A useful Explore funnel is:

1. `session_start`
2. `article_progress` where `progress_percent = 25`
3. `article_complete`
4. any of `article_saved`, `share`, or `comment_submit`

Break the funnel down by `content_slug`, `session source / medium`, device category, and new/established user. Keep low-volume results directional and compare Search Console clicks with Google-organic sessions rather than expecting exact parity.

For the site-to-YouTube baseline, filter `select_content` to `source_component = homepage_youtube`, `topic_drones_youtube`, `article_drones_youtube`, or `article_companion_youtube`, then break down by source, `content_type`, and `method`. Compare homepage selections with homepage sessions, topic selections with `/topics/drones-fpv` sessions, drone-fallback selections with eligible drone-article sessions, and exact companion selections with their paired article sessions. YouTube Studio remains authoritative for actual views, watch time, subscriptions, and audience retention.

For the homepage creator-profile baseline, filter `select_content` to `source_component = homepage_social`, then compare raw `content_id` counts with homepage sessions. This measures which platform handoffs visitors select; it does not prove a follow, subscription, like, or platform account match.

For printable-resource demand, filter `select_content` to `content_group = download` and compare bounded `content_id` counts by `source_component`. Compare `topic_guide` selections with sessions on `/topics/drones-fpv`; compare `resource_page` selections by bounded `content_id` with sessions on `/resources/personal-aircraft-buyer-verification` and `/resources/gadget-usefulness-scorecard`. This separates hub discovery from landing-page conversion without sending the full URL. Enhanced Measurement may also report file downloads; use the explicit event as the stable product contract and diagnose duplication before combining the two sources.

For the account-invitation baseline, filter `reader_membership_invite` to `source_component = after_article` and compare `register`, `login`, and `dismiss` counts with `view` by article slug. Treat these as directional interface choices, not completed registrations; Firebase Auth remains authoritative for account creation and sign-in outcomes.

### Share campaign reporting

Public sharing uses standard UTM fields, with no reader identity in the URL:

- Reader controls use `utm_campaign=reader_share`; the selected service is `utm_source` and the action class is `utm_medium` (`social_share`, `email`, or `share_link`).
- The global footer uses `utm_campaign=site_share` and `utm_content=homepage`.
- CMS Social Shares drafts use `utm_campaign=article_launch`, the intended channel as `utm_source`, the article slug as `utm_content`, and a channel-appropriate medium (`organic_social`, `video_description`, or `push`).

In **Reports → Acquisition → Traffic acquisition**, compare `Session source / medium` and `Session campaign`; use `Session manual ad content` to distinguish individual promoted articles. Validate a newly published channel link in **DebugView** before drawing conclusions from standard reports. UTM values identify the link that brought a session, not whether the visitor is a human or whether the provider completed a post.

## Validation

1. Run unit tests for the analytics service and each instrumented flow.
2. Run lint and the production build.
3. On a deployed public URL, use GA4 DebugView or Tag Assistant and complete one test action from each event group.
4. Confirm only `G-6V5GQRZFBH` receives the explicit product events.
5. Confirm one initial `page_view` and one additional `page_view` for each client-side route transition, with no duplicate event from `GTM-Q6BN`.
6. Verify Search Console and GA4 trends after at least several days of normal traffic.
7. Keep the Internal Traffic data filter in **Testing** until the configured IP rule is proven in reports; activate it only after that evidence is visible.

## Migration and Rollback

There is no Firestore, Authentication, Storage, or Functions migration. Article reactions are device-local and additive. Existing GA4 history and the external GTM container are unchanged.

Deployment requires Hosting after the validated application build; `npm run prepare:functions-seo` must also refresh the Functions HTML shell before a later Functions deployment. Do not publish the legacy GTM container as part of this migration.

To roll back, restore the prior GTM loader and remove the Angular route page-view call in the same Hosting release so page views still have exactly one owner. Reaction UI and local storage can be removed independently without deleting reader data. To roll back a GA4 Enhanced Measurement option, disable only that option in the production web stream. Data already collected by GA4 cannot be deleted through an application rollback.
