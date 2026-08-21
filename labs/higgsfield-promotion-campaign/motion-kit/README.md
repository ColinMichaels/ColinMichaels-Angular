# ColinMichaels.com Motion Kit

Editable 4-second, 1920x1080, 30 fps video assets for ColinMichaels.com and its YouTube channel. Exact text and interface graphics are rendered locally over preserved, text-free Higgsfield masters.

This is an isolated lab, not a production website dependency. Rendering creates local derivatives only;
it does not publish, deploy, upload, or call a paid media provider.

## Included compositions

| Composition                  | Purpose                                     | Sound                   |
| ---------------------------- | ------------------------------------------- | ----------------------- |
| `CM-Intro-Example`           | Finished Colin Michaels channel intro       | Local intro swell       |
| `CM-Intro-Blank`             | Text-free intro slate                       | Silent                  |
| `CM-Outro-Example`           | Finished website outro                      | Local particle resolve  |
| `CM-Outro-Blank`             | Text-free outro/end-screen slate            | Silent                  |
| `CM-Subscribe-Like-Share`    | YouTube subscribe, like, and share reminder | Three-note local CTA    |
| `CM-Image-Story-Example`     | Example editorial image/title card          | Local ambient bed       |
| `CM-Image-Story-Blank`       | Reusable image/video inset slate            | Silent                  |
| `CM-Transition-Signal-Wipe`  | Full-frame signal wipe                      | Local transition whoosh |
| `CM-Transition-Optical-Iris` | Full-frame optical iris                     | Local transition whoosh |
| `CM-Stinger-Wave-Pulse`      | Short wave logo beat                        | Local impact            |
| `CM-Stinger-Prism`           | Short prism logo beat                       | Local tonal impact      |

The transitions and stingers are delivered as full-frame H.264 clips. Editors can place them above a cut and use blend modes, masks, or luma keys as needed. Blank slates intentionally contain no copy so final titles can be customized without regenerating the background.

## Commands

Prerequisites: a supported Node.js/npm runtime, FFmpeg on `PATH`, and the preserved video masters listed
in `../motion-brand-pack-manifest.json`.

```bash
npm ci
npm run validate
npm run validate -- --require-local-media
npm run dev
npm run lint
npm run build
npm run render
npm run review
```

`npm run render` regenerates the eight original local SFX, synchronizes working copies of all masters, and renders the full deliverable set. It does not call Pika, Higgsfield, or another paid API.

`npm run review` reads the portable `output/render-manifest.json` and produces a contact sheet plus a
timeline sheet for the intro, outro, and call-to-action examples. Run it after rendering.

## Production Flow

1. `scripts/validate-campaign.mjs` checks prompt records, provenance, credit math, publication state, and optionally every local master.
2. `scripts/generate-local-sfx.mjs` synthesizes the eight 48 kHz stereo WAV masters with inspectable FFmpeg filter graphs.
3. `scripts/sync-assets.mjs` converts/copies immutable masters into disposable `public/generated/` working media and copies the exact local fonts and example image.
4. Remotion renders the 11 compositions with sound enabled only when the declared local SFX file exists.
5. `scripts/generate-review-sheet.mjs` creates visual review sheets from the portable render manifest.

All animation timing is frame-based. The motion masters remain text-free; exact brand copy, accessible
labels, icons, and typography live in the tracked React compositions.

## Asset boundaries

- Higgsfield masters: `../outputs/higgsfield-masters/motion-brand-pack/`
- Local SFX masters: `../outputs/local-sfx-masters/motion-brand-pack/`
- Working media copies: `public/generated/`
- Generated browser bundle: `build/`
- Final renders, portable render manifest, and review sheets: `output/`

The `outputs/`, `build/`, `public/generated/`, and `output/` directories are generated or preserved local
media and are ignored. Keep source code, manifests, and documentation in Git; keep large derivatives
outside production web assets until individually approved. To clean the working tree, remove only the
reproducible `build/`, `public/generated/`, and `output/` directories—never the preserved `../outputs/`
masters.
