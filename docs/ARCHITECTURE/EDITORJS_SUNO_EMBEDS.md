# Editor.js Suno Song Embeds

## Purpose and Scope

Blog editors can add a Suno song to a post through a dedicated `Suno Song` Editor.js block. The block accepts a Suno song or embed URL, stores a typed provider-specific embed, and renders Suno's responsive 240px player with a direct `Listen on Suno` fallback.

This integration does not accept pasted iframe HTML, add a general-purpose external-frame allowlist, call a Suno API, download or proxy audio, or require Functions, Firestore, credentials, or new dependencies.

## Authoring and Stored Contract

Editors paste either of these exact URL shapes:

```text
https://suno.com/song/{uuid}
https://suno.com/embed/{uuid}
```

The tool accepts `www.suno.com` as input but canonicalizes it to `suno.com`. It rejects HTTP, alternate hosts, credentials, explicit ports, query strings, fragments, additional path segments, and malformed song IDs. An optional caption becomes the accessible iframe title and visible figure caption.

Editor.js stores the CMS-specific authoring block:

```json
{
  "id": "stable-editorjs-block-id",
  "type": "sunoEmbed",
  "data": {
    "url": "https://suno.com/song/44cd6eab-d6d7-4cb9-bea7-af398776556e",
    "caption": "Some Memories Never Stop Playing"
  }
}
```

The existing Editor.js adapter normalizes it into the public blog block model:

```json
{
  "id": "stable-editorjs-block-id",
  "type": "embed",
  "data": {
    "provider": "suno",
    "url": "https://suno.com/song/44cd6eab-d6d7-4cb9-bea7-af398776556e",
    "embedUrl": "https://suno.com/embed/44cd6eab-d6d7-4cb9-bea7-af398776556e",
    "caption": "Some Memories Never Stop Playing",
    "height": 240
  }
}
```

Opening the post in the CMS converts the typed public block back to `sunoEmbed`. Invalid legacy provider entries stay in the dedicated tool for repair rather than silently changing into a generic embed.

## Public Rendering and Security

`BlogBlockRendererComponent` independently revalidates the stored URL before trusting it. A valid song uses the canonical `https://suno.com/embed/{uuid}` resource; malformed Suno destinations render as ordinary external links instead of frames.

The public iframe is:

- fixed at 240px high and full-width, matching Suno's responsive player contract;
- lazy-loaded with a descriptive title;
- sandboxed with scripts, same-origin behavior, and popups only;
- limited to autoplay, encrypted media, and fullscreen through Permissions Policy;
- paired with a normal `noopener noreferrer` song-page link;
- framed by the existing blog media border, shadow, caption, focus, light-mode, and dark-mode treatment.

Custom HTML continues to remove all iframes and scripts. Suno is not added to the generic YouTube/Vimeo host set or the interactive-app resize-message path. Firebase Hosting's `frame-src` policy adds only the exact `https://suno.com` origin.

## Publishing and Privacy Considerations

A Link Only Suno song remains reachable by anyone who receives its direct URL. Embedding that URL in a public article therefore shares it with every article reader even when the song is not listed on the creator's public Suno profile. Editors should confirm that this is intentional and that the account has the rights needed for the post's commercial or non-commercial use.

The iframe makes normal third-party player requests to Suno under Suno's own privacy and cookie behavior. The site does not copy audio into Firebase, receive Suno credentials, or collect playback analytics through this integration.

## Deployment, Migration, and Rollback

Deployment requires Hosting only:

1. Deploy the Angular bundle containing the authoring tool, adapter, and public renderer.
2. Deploy `firebase.json` so the report-only `frame-src` policy includes `https://suno.com`.
3. Insert a Suno block in a draft and verify the CMS preview, published desktop/mobile player, play control, external fallback, and browser console.

No data migration or secret is required. Existing blog posts remain valid because `sunoEmbed` is additive and the public post contract continues to use the existing `embed` block type.

Rollback should first remove or replace published Suno blocks with normal links, then revert the tool, adapter, renderer, and CSP origin. Older editor builds should not resave a post containing the unsupported `sunoEmbed` authoring type.

## Validation

Regression coverage includes URL normalization and rejection, Editor.js save/read-only/preview behavior, adapter round trips, Editor.js registration, trusted public iframe attributes, malformed-URL link fallback, build/lint checks, and rendered desktop/mobile playback verification.
