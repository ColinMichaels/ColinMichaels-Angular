# YouTube Feature

Public YouTube feed UI and data access live here.

- `services/youtube-feed.service.ts` calls the `getLatestYouTubeVideos` Firebase callable.
- `components/latest-videos` renders the homepage latest videos section.
- The YouTube API key is never stored in Angular environment files; it is bound to the callable as the `YOUTUBE_API_KEY` Firebase Functions secret.
- `YOUTUBE_API_KEY` must be a server-side key, not an HTTP-referrer-restricted browser key. Restrict it to `YouTube Data API v3`; leave application restrictions unset unless deployed Functions have static egress IPs.
- The target channel is configured by the `YOUTUBE_CHANNEL_ID` Functions parameter.
- Local Angular config connects callable Functions to the local emulator at `127.0.0.1:5001`; keep `npm run serve:functions` running and add `YOUTUBE_API_KEY` to `functions/.secret.local`.
- Use `npm run serve:functions` for this feature. Bare `firebase emulators:start` also starts Hosting and can fail in Firebase's Angular framework preview path for Angular 22.
- `getLatestYouTubeVideos` is a callable endpoint for the Firebase SDK. For direct browser testing, use `getLatestYouTubeVideosHttp`.
