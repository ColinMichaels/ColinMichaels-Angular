# YouTube Feature

Public YouTube feed UI and data access live here.

- `services/youtube-feed.service.ts` calls the `getLatestYouTubeVideos` Firebase callable.
- `components/latest-videos` renders a reusable latest-videos section with a channel link, explicit subscription action, and caller-owned heading, section ID, and analytics source. The homepage uses the default presentation; `/topics/drones-fpv` and eligible drone article endings supply contextual copy.
- Drone articles receive the panel only when the canonical primary topic is `drones-fpv` or stored category, subcategory, or tag data contains an explicit drone/FPV term. Incidental title and excerpt mentions do not qualify, and preview/offline routes do not make the feed request.
- `components/companion-video` renders one exact editor-selected YouTube block after an article without a feed lookup. The exact card wins over the drone latest-feed fallback; the CMS rejects multiple companion selections.
- Video, channel, and subscription selections reuse the privacy-aware `select_content` GA4 event with `source_component=homepage_youtube`, `topic_drones_youtube`, `article_drones_youtube`, `article_companion_youtube`, or `blog_index_youtube`; public IDs and fixed action codes are allowed, while video copy and viewer/account data are excluded.
- The YouTube API key is never stored in Angular environment files; it is bound to the callable as the `YOUTUBE_API_KEY` Firebase Functions secret.
- `YOUTUBE_API_KEY` must be a server-side key, not an HTTP-referrer-restricted browser key. Restrict it to `YouTube Data API v3`; leave application restrictions unset unless deployed Functions have static egress IPs.
- The target channel is configured by the public `YOUTUBE_CHANNEL_ID` Functions parameter, which must equal the canonical Captain Colin ID `UCKZ3E88t-BoUqPgZygJw6bA`. Functions reject a missing/different parameter or an unexpected API channel, and Angular rejects a callable payload with another channel ID before rendering it.
- Canonical channel, channel-link, subscription-link, and analytics identity live in `shared/seo/site-identity.ts` for Angular and `functions/src/seo-site.ts` for the isolated Functions build. Changing the primary creator channel requires one reviewed change across both contracts, the Functions parameter, physical homepage graph, content packages, and rollback notes; never switch only the runtime parameter.
- Local Angular config connects callable Functions to the local emulator at `127.0.0.1:5001`; keep `npm run serve:functions` running and add `YOUTUBE_API_KEY` to `functions/.secret.local`.
- Use `npm run serve:functions` for this feature. Bare `firebase emulators:start` also starts Hosting and can fail in Firebase's Angular framework preview path for Angular 22.
- `getLatestYouTubeVideos` is a callable endpoint for the Firebase SDK. For direct browser testing, use `getLatestYouTubeVideosHttp`.
