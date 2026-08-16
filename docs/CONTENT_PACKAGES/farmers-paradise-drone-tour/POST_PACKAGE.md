# Drone Tour of the Farm Companion Article

Status: **local draft package only**. It has not been imported into the CMS, saved to Firebase, previewed as an authenticated CMS record, published, deployed, indexed, or linked from the live YouTube video.

## Editorial Decision

Turn Colin's existing `2:38` **Farmers Paradise** flight into the first complete **Captain Colin Flies** video/article pair. The article follows the footage's real progression—golden-hour farmhouse, open property, then garden-level passes—without inventing the aircraft, exact location, camera settings, flight purpose, permissions, airspace status, weather record, or operating conditions.

Recommended article title:

> Drone Tour of the Farm: From Golden Hour to Garden Rows

Canonical candidate:

`https://colinmichaels.com/blog/drone-tour-farm-golden-hour-garden-rows`

Exact companion video:

[Farmers Paradise | Golden Hour Over the Farm | Peaceful Drone Flight](https://www.youtube.com/watch?v=aiA2hlRcVpk)

## Evidence Boundary

- **First-party source:** Colin's published Captain Colin video, video ID `aiA2hlRcVpk`.
- **Sequence inspected:** public `360p` stream, `640 × 360`, `158.127891` seconds.
- **Visible chapters:** approximately `0:00–0:40` golden-hour high views, `0:40–1:20` open property, and `1:20–2:38` garden-level passes.
- **Current public identity checked August 15, 2026:** title `Farmers Paradise | Golden Hour Over the Farm | Peaceful Drone Flight`, author `Captain Colin`.
- **General flight context:** current FAA Recreational Flyers, Where Can I Fly, and Remote ID pages.
- **Not established:** aircraft, camera settings, exact location, flight purpose, airspace authorization, property permission, operating category, weather record, or compliance facts outside the visible edit.

This package uses `mixed` evidence because the story is grounded in Colin's first-party footage while the safety-context section points readers to current official FAA sources. The footage is not treated as proof of compliance.

## Package Contents

- `farmers-paradise-drone-tour-import.json` — one versioned ColinMichaels CMS draft record.
- `/src/assets/images/blog/drones/farmers-paradise-drone-tour-cover.webp` — `1200 × 675` cover derived from the public video near `0:11`.
- `/src/assets/images/blog/drones/farmers-paradise-drone-tour-thumbnail.webp` — `1200 × 1200` square card crop derived near `2:25`.
- `/src/assets/images/blog/drones/farmers-paradise-drone-tour-og.jpg` — `1200 × 630` social image derived near `0:25`.
- five in-body `640 × 360` documentary stills from approximately `0:45`, `1:16`, `1:45`, `2:07`, and `2:20`.

The frame derivatives were cropped, resized, or compressed for web delivery. No generative editing or invented visual content was used. The source video master remains authoritative; the inspected public stream is not a replacement master.

## CMS Pairing

The early YouTube embed is marked:

```json
{
  "provider": "youtube",
  "url": "https://www.youtube.com/watch?v=aiA2hlRcVpk",
  "embedUrl": "https://www.youtube.com/embed/aiA2hlRcVpk",
  "isCompanionVideo": true
}
```

That exact flag lets the current article journey code distinguish the article's own video from source-adjacent embeds.

## Reader Path

The draft gives readers four useful next actions without forcing sign-in:

1. watch the exact `2:38` companion flight;
2. open the Drones & FPV topic hub;
3. download the printable Drone Flight Field Notes sheet; and
4. vote on whether the farmhouse, open fields, or garden rows deserves a longer return flight.

Poll results stay hidden until a vote. The poll is optional and the article remains complete without an account.

## Reciprocal YouTube Gate

Do not add the article URL to YouTube until all of these are true:

1. Colin has approved the first-person voice and disclosures.
2. The draft has been imported and inspected in the authenticated CMS Production Preview.
3. The article is published and the exact canonical URL returns `200` publicly.
4. Mobile and desktop checks confirm the title, images, companion embed, field-notes link, FAA links, and poll render correctly.
5. The public article canonical equals `https://colinmichaels.com/blog/drone-tour-farm-golden-hour-garden-rows`.

Only then paste the staged companion-article line from the Farmers Paradise YouTube refresh package. A local JSON file or CMS draft is not a public destination.

## Editorial Approval Checklist

- Confirm the flight and video belong in Colin's first-person public voice.
- Confirm the no-sponsor/no-affiliate relationship disclosure.
- Confirm that no aircraft, location, flight-purpose, permission, airspace, weather, or compliance detail should be added without a primary record.
- Re-check the three official FAA pages immediately before publication.
- Confirm every frame is acceptable for public reuse, including any visible people or private details.
- Preserve the video master and treat these images only as web derivatives.
- Import as `draft`; do not change `publishedAt: null` until approval.

## Validation Authority

Required before handoff:

- blog-import validator passes with zero warnings;
- repository evidence validator passes;
- JSON-specific assertions confirm one draft, five in-body images, one exact companion video, unique block IDs, three official FAA references, and no duplicate asset paths;
- source and derivative dimensions are checked locally;
- every derivative is visually inspected;
- `npm run build` passes;
- `npm run lint` passes; and
- `git diff --check` passes.

Local validation does not prove CMS import, authenticated preview, public publication, deployment, indexation, YouTube metadata changes, referral traffic, votes, comments, subscribers, or popularity.

## Sources

- [Farmers Paradise on YouTube](https://www.youtube.com/watch?v=aiA2hlRcVpk)
- [Captain Colin channel](https://www.youtube.com/@CaptainColin)
- [FAA Recreational Flyers](https://www.faa.gov/uas/recreational_flyers)
- [FAA Where Can I Fly?](https://www.faa.gov/uas/getting_started/where_can_i_fly)
- [FAA Remote ID](https://www.faa.gov/uas/getting_started/remote_id)

## Rollback

Before import, rollback is deletion of the unapproved local package from the candidate set; do not touch the source video or master. After an approved import, archive or revise the CMS record through the normal editorial workflow. After publication, preserve the canonical slug unless a redirect and migration are approved. A YouTube reciprocal link can be removed independently if the article is unavailable, but the video, analytics history, comments, and source media must remain intact.
