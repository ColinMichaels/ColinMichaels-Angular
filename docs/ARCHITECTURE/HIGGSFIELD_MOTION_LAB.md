# Higgsfield Promotion and Motion Lab

Last updated: August 21, 2026

## Purpose

`labs/higgsfield-promotion-campaign/` preserves two related but distinct experiments:

1. a source-led, prompt-only promotion batch that was prepared but never generated; and
2. a generated, text-free motion brand pack assembled into reusable local Remotion compositions.

The lab keeps reproducible source, provenance, cost records, editorial boundaries, and validation in Git
without turning unapproved media into production website assets.

## Architecture and Ownership

| Component | Responsibility | Authority |
| --- | --- | --- |
| `campaign-manifest.json` | Eleven source assets, prompts, disclosures, intended outputs, and estimated spend | Prompt-only Batch 01 record |
| `motion-brand-pack-manifest.json` | Eight generation jobs, reviewed master filenames, actual spend, media contract, and publication state | Motion-pack provenance record |
| `motion-kit/src/` | Exact typography, icons, layout, and frame-based motion compositions | Editable delivery source |
| `motion-kit/scripts/validate-campaign.mjs` | Structural, source, cost, status, and optional local-media checks | Local release gate |
| `motion-kit/scripts/generate-local-sfx.mjs` | Provider-free FFmpeg SFX synthesis | Audio recipe authority |
| `motion-kit/scripts/sync-assets.mjs` | Read-only master-to-working-copy synchronization | Media boundary adapter |
| `motion-kit/scripts/render-all.mjs` | Composition/output/audio mapping and H.264 rendering | Derivative build step |
| `motion-kit/scripts/generate-review-sheet.mjs` | Contact-sheet and timeline inspection artifacts | Visual review aid |

The public Angular application does not import the lab. The lab must not be moved into `src/app`, and its
large media must not be copied into `src/assets` until a specific derivative receives editorial approval.

## Media Boundary

```text
ignored preserved masters
  -> ignored synchronized working copies
    -> tracked Remotion composition source
      -> ignored local renders and review sheets
        -> explicit editorial approval
          -> separately documented production adoption
```

Downloaded Higgsfield masters and locally generated SFX masters live under the ignored lab `outputs/`
directory. Synchronization may transcode or copy them into `motion-kit/public/generated/`, but it never
modifies the masters. Remotion bundles, working media, renders, and review artifacts are reproducible and
ignored. The tracked manifests are the durable record.

## Safety and Publication State

- Batch 01 remains `prompts_ready` with zero actual credits spent.
- The motion brand pack records 288 credits spent and a reviewed local-editing state.
- Local review is not production approval; both motion-pack publication flags remain false.
- Structural validation, SFX generation, asset synchronization, rendering, and review-sheet generation
  make no deployment or publication request.
- Generated typography is rejected. Exact copy and icons are rendered from tracked local source.
- Paid provider pricing is recorded as dated evidence, not a current-price guarantee.

## Validation

From `labs/higgsfield-promotion-campaign/motion-kit/`:

```bash
npm ci
npm run validate
npm run validate -- --require-local-media
npm run lint
npm run build
npm run render
npm run review
```

The strict validation mode is workstation-specific because the master media is intentionally ignored.
The default mode remains portable in a clean clone and still verifies every tracked contract plus each
Batch 01 source file.

## Migration, Deployment, and Rollback

No data migration, Firebase deployment, route change, public asset change, or production content update
is required. Rollback is source-only: revert the lab commit. Generated and preserved ignored media remains
untouched. If a derivative is later adopted, that change must document the selected master, disclosure,
poster, muted/lazy-loading behavior, reduced-motion fallback, validation, deployment target, and separate
rollback path.
