# Editor.js Image Galleries

## Outcome

The CMS provides one typed `gallery` block for two to twenty images. Authors can select **Slideshow**, **Grid**, or **Mosaic** without entering presentation HTML. The same canonical data drives Production Preview, public articles, crawler fallback HTML, search, reading time, offline media warming, media-reference checks, and social-image fallback.

The feature extends the existing Editor.js adapter and blog renderer. It does not replace the single-image block, upload pipeline, Media Library, or accessible article lightbox.

## Authoring And Rendering

`CmsGalleryBlockTool` is registered as **Image Gallery**. Authors can upload several files in their chosen order, select several finalized Media Library images in one pass, or add an HTTPS image URL. The shared picker records explicit selection order, shows numbered selected items, and limits each batch to the gallery's remaining capacity. Every image requires alternative text; captions and positive intrinsic dimensions remain optional. Images can be reordered or removed before save. Uploads are processed sequentially through the existing staged-upload/finalization callback so progress, ownership, generated variants, and Media Library records keep their established contracts.

Layout presets are bounded:

- `slideshow` shows one image at a time with manual Previous/Next controls, a position announcement, scoped Arrow Left/Right support, and no autoplay.
- `grid` uses equal responsive columns while preserving document and keyboard order.
- `mosaic` varies visual spans through CSS Grid while preserving the stored DOM order and stacking at narrow widths or larger Reader text scales.

Every public image remains a semantic figure/button and opens the shared focus-trapped lightbox. Gallery lightbox navigation is scoped to that gallery rather than crossing into unrelated article images. Missing or failed images keep visible context instead of becoming empty controls. Reduced-motion preferences remove transitions.

## Data Contract

Raw Editor.js stores:

```json
{
  "type": "gallery",
  "data": {
    "layout": "grid",
    "title": "Optional gallery title",
    "caption": "Optional gallery caption",
    "images": [
      {
        "url": "https://...",
        "alt": "Required image description",
        "caption": "Optional image caption",
        "width": 1600,
        "height": 1067
      }
    ]
  }
}
```

Canonical `BlogBlockData` stores the same meaning as `galleryLayout` and `galleryImages`; the adapter performs the lossless mapping in both directions. Layout must be `slideshow`, `grid`, or `mosaic`. A gallery must contain 2–20 strictly shaped items. Each item requires a non-empty trusted URL and non-empty `alt`; optional caption, width, and height are validated and bounded by the existing content and URL policies. Malformed known gallery blocks cannot leave JSON mode or save, while direct adaptation protects their original payload through the existing unsupported-block envelope.

Existing posts require no migration. Gallery fields are additive, and a post changes only when an author inserts and saves a Gallery block.

## Component Inventory

- `gallery-block.tool.ts` owns Editor.js authoring, preset selection, ordering, accessible status, bounded Media Library multi-selection, and sequential upload requests.
- `blog-editorjs-adapter.ts` owns raw-to-canonical round trips.
- `blog-editor-document-validation.util.ts`, `blog-validation.util.ts`, and `functions/src/blog-publishing.ts` enforce the same bounded shape at editor, hydration, and trusted publishing boundaries.
- `BlogGalleryComponent` owns public Grid, Mosaic, and Slideshow presentation.
- `BlogBlockRendererComponent` supplies shared lightbox behavior and gallery-scoped navigation.
- `functions/src/index.ts` supplies semantic crawler fallback markup.

## Deployment And Rollback

Deploy the updated `mutateBlogPost`/publishing Functions before deploying Hosting. The older callable allowlist rejects the new canonical block, so Hosting-first deployment lets authors compose galleries but prevents their save. After Functions succeeds, deploy Hosting and perform an authenticated draft-save, Production Preview, and public/draft-preview smoke test for all three layouts.

Hosting rollback is not safe while stored posts still contain canonical `gallery` blocks: an older hydration validator treats the unknown block type as an invalid post and can drop the whole post from the client read path. Before reverting Hosting, convert or remove gallery blocks from every affected post, or first ship a compatibility-reader release that preserves/omits unknown canonical blocks without rejecting the post. Only then revert Hosting. Functions may be rolled back after the old Hosting client is restored and no saved gallery blocks or gallery writes remain.

No Firebase Rules, Storage policy, secret, index, or dependency change is required. Existing uploaded media remains governed by the current reference-aware deletion and staged-finalization lifecycle.
