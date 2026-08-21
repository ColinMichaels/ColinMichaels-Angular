# Higgsfield Promotion Campaign

Status: preserved production experiment. Local review does not approve or publish media.

This lab turns existing ColinMichaels.com documentary frames and disclosed editorial artwork into a reusable promotion library. It preserves the source assets in place and keeps downloaded Higgsfield masters outside production assets until review.

## Campaign Tracks

### Batch 01: source-led promotion prompts

- Four vertical drone/FPV teasers derived from Colin's documentary video frames.
- Four vertical gadget teasers derived from disclosed editorial illustrations.
- Three 16:9 premium trailer shots for the ColinMichaels.com website trailer.
- Estimated Higgsfield spend: 295 credits.
- Starting account balance observed August 20, 2026: 1,200 credits.
- Current state: `prompts_ready`; no generation, upload, or credit spend occurred.

The authoritative prompt, source, intended output, disclosure, and estimated-cost records are in
[`campaign-manifest.json`](campaign-manifest.json). Do not infer generated media from its output names.

### Motion Brand Pack: text-free brand motion

- Eight text-free 1920x1080 Higgsfield motion masters for intros, outros, transitions, stingers, and a YouTube call to action.
- Eleven editable 1920x1080 Remotion compositions, including finished examples and reusable blank slates.
- Eight original 48 kHz stereo sound effects generated locally with FFmpeg; no Pika API call or paid audio service is required.
- Motion-pack Higgsfield spend: 288 credits. Balance after generation: 607 credits.
- Masters stay in `outputs/higgsfield-masters/motion-brand-pack/`; editable source lives in `motion-kit/`.
- Current state: generated and accepted for local editing; not approved or published.

The generation jobs, prompts, credit reconciliation, review result, master filenames, and publication
boundary are recorded in [`motion-brand-pack-manifest.json`](motion-brand-pack-manifest.json). See
[`motion-kit/README.md`](motion-kit/README.md) for the composition inventory and render commands.

## Repository Layout

| Path                              | Purpose                                                            | Git policy          |
| --------------------------------- | ------------------------------------------------------------------ | ------------------- |
| `campaign-manifest.json`          | Batch 01 prompt/source/disclosure contract                         | Tracked             |
| `motion-brand-pack-manifest.json` | Generated motion provenance, review, and cost contract             | Tracked             |
| `motion-kit/`                     | Remotion compositions, local SFX recipes, render/review automation | Tracked source only |
| `outputs/`                        | Preserved downloaded video and generated audio masters             | Ignored             |
| `motion-kit/public/generated/`    | Disposable synchronized working media                              | Ignored             |
| `motion-kit/build/`               | Disposable Remotion browser bundle                                 | Ignored             |
| `motion-kit/output/`              | Final local renders, manifests, and review sheets                  | Ignored             |

Run the structural checks from `motion-kit/` with `npm run validate`. On a workstation that has the
preserved masters, use `npm run validate -- --require-local-media` to verify every declared file.

## Boundaries

- Documentary frames remain the visual authority. Motion generation must not add people, vehicles, buildings, aircraft, product details, weather events, or outcomes that were not in the source.
- Gadget visuals remain AI-generated editorial illustrations. They are not product photography, hands-on testing, purchasing evidence, or proof of capability.
- Generated typography is not used. Headlines, captions, URLs, and calls to action are added later in the local video composition so they remain exact and accessible.
- Higgsfield downloads go to `outputs/higgsfield-masters/` and remain ignored until Colin approves them.
- Approved derivatives may be copied into `src/assets/social/higgsfield-promotion/` with their disclosure metadata; masters remain preserved in this lab.
- Website video must be muted by default, lazy-loaded, supplied with a poster, and disabled for reduced-motion users.
- Nothing in this lab deploys, uploads, posts, copies media into production assets, or makes a paid provider call during validation.

## Review Gate

Every generated clip must be checked for:

1. source fidelity and truthful motion;
2. distorted buildings, aircraft, products, bodies, hands, rotors, text, or logos;
3. accidental claims of product capability or hands-on experience;
4. vertical and phone-size composition;
5. duration, resolution, codec, and audio state;
6. suitability for a disclosed article or website campaign;
7. final credit cost recorded in the manifest.

Reject rather than repair a clip that changes documentary facts.
