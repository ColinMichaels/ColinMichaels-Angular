# Companion Video Schema Report

## Outcome

The local article model now supports truthful `VideoObject` markup for one exact, editor-selected YouTube companion. The contract is deliberately evidence-gated: a valid YouTube identity plus title, description, and upload date are required, runtime is optional, and incomplete legacy companions remain schema-free while continuing to render.

## Implemented Graph

`BlogPosting.video` contains:

- `@type: VideoObject`
- exact `name` and factual `description`
- YouTube `thumbnailUrl` derived from the validated video ID
- exact `uploadDate`
- YouTube player `embedUrl`
- canonical watch-page `url`
- ISO 8601 `duration` when a positive runtime is supplied

The graph never maps a YouTube watch URL to `contentUrl`; that property is for the actual video file. Google requires `name`, `thumbnailUrl`, and `uploadDate`, recommends description and a usable video location such as `embedUrl`, and requires the video to be watchable on the marked-up page. Rich-result display remains Google's decision. See [Google Video structured data](https://developers.google.com/search/docs/appearance/structured-data/video) and [Google video SEO best practices](https://developers.google.com/search/docs/appearance/video).

## Cross-Surface Contract

- Angular selects a complete companion record and nests it through `SeoService`.
- Functions independently validates the same YouTube hosts, dates, and duration conversion before emitting crawler HTML.
- Editor.js, adapter, runtime, and trusted publishing validation preserve only typed metadata on a selected YouTube companion.
- Farmers Paradise and Insta360 Ace Pro local draft packages exercise exact known video identities without importing or publishing them.

## Deployment And Verification Boundary

This report covers the local source state. Production remains unchanged until the matching Hosting application and Functions SEO renderer are released together. After release, verify one complete and one incomplete companion article in rendered DOM and raw crawler HTML, then validate the public URL in Google's Rich Results Test and inspect Search Console's video indexing report. Eligibility does not guarantee appearance.
