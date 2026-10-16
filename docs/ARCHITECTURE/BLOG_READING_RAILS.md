# Blog Reading Rails

## Purpose

Articles with a valid YouTube embed now lead with a wide cinema viewer before the reading grid. See [the video-first design](../design/video-first-blog.md) for the concept, tokens, responsive states, and critique revisions.

The public blog-detail route uses a content-aware editorial reading shell at the `xl` breakpoint:

- the table of contents owns the left reading rail;
- the article header, sticky toolbar, body, and footer remain in the center column;
- post-specific interactive blocks and compact suggested-post links share the right reading rail.

Below `xl`, the same semantic order becomes a single column: post header, toolbar, collapsed contents disclosure, article body, right-rail content, and article footer. No content is duplicated solely to create the desktop layout.

At `xl` and above, the desktop grid uses the proportional `18% / 2% / 54% / 2% / 24%` contract only when both rails exist. Contents/article uses `22% / 3% / 75%`; article/related uses `72% / 3% / 25%`; an article without either rail receives one centered track. The background content surface drops its duplicate desktop inline padding so present rails align directly with the normal page gutter; absent rails no longer reserve empty columns. Smaller single-column layouts retain their existing responsive padding.

## Block Placement Contract

`selectBlogLeadVideo()` prefers the first valid editor-designated companion video, then the first valid ordinary YouTube embed. Invalid/lookalike URLs and other providers are never promoted. Only the selected video is promoted out of the content/rail render projection; a link back to the main viewer preserves its original article context and avoids orphaning an existing video-section heading. Its caption moves into the viewer using the existing rich-text sanitizer. Stored blocks, reading/search data, cover/social metadata, and video schema selection remain unchanged. Other embeds remain in their original placement. Posts without a valid YouTube video keep the existing cover-led header.

`BlogBlockData.placement` is an optional `content | rail` field. `createBlogPostLayoutBlocks()` is the single public-layout boundary that separates the two streams.

- Polls without a placement are treated as `rail` so existing poll posts adopt the new layout without a migration.
- Authors can choose `Inside the article` in the Poll Editor.js tool to retain an inline poll.
- New polls default to `Right reading rail` and persist that explicit choice through the Editor.js adapter.
- Future custom blocks may opt into the same rail with `placement: 'rail'`; the article renderer remains the shared rendering surface in both locations.

Only center-column blocks contribute table-of-contents headings. Reading-time and search calculations continue using the complete stored post, including rail content.

## Right-Rail Presentation

`BlogPostRailComponent` composes two existing content families instead of creating a separate recommendation query or poll implementation:

- `BlogBlockRendererComponent` renders rail blocks with its `rail` display mode. Polls receive a compact visual treatment but retain the same authentication, vote, result, and accessibility behavior.
- The existing taxonomy-ranked `suggestedPosts` result is rendered as a compact `More posts` list with the same post routes, thumbnail resolver, dates, and dark-mode tokens used elsewhere.

Both desktop rails stick below the shared site header and use bounded internal scrolling when their content exceeds the viewport. The right grid aside owns that sticky boundary so its interactive and suggested-post sections move as one rail. The article column remains the only reading-progress measurement surface.

## Data, Deployment, And Rollback

The video-first layout requires no CMS edits or migration. Preview and offline article shells use the same selected-video projection; remote playback still requires a connection. No player is loaded before an explicit reader click. The source uses the already allowed `www.youtube.com` iframe origin, leaving Firebase configuration and header policies intact. Hosting deployment is required. Revert the video-first commit to restore inline embeds and the previous companion continuation; preserved components and stored records require no recovery.

The optional placement field is migration-safe. Existing non-poll blocks remain inline; existing polls move to the rail unless an editor explicitly saves `content`. No Firestore rules, Functions, indexes, secrets, or external APIs are added.

Deployment requires only the normal Angular/Firebase Hosting artifact. Rollback can restore the fixed three-track template and always-open narrow contents rail. Stored placement values are optional and harmless to the earlier renderer, so rollback does not require document rewrites.

## Validation

### Video-first component inventory

- `BlogVideoViewerComponent` (`features/blog/components/video-viewer`): poster, click-to-load YouTube iframe, compact controls, persistent iframe docking, reduced-motion return, and observer teardown.
- `selectBlogLeadVideo` (`features/blog/utils`): pure, deterministic selection with validated YouTube URLs and caption retention.
- `BlogDetailComponent`: composes the stage before the existing grid and replaces only the promoted embed with a return link in the display projection. The reusable YouTube companion component remains preserved for other uses.

Final video-first validation (2026-10-16, Node 24.15.0, updated `origin/dev` baseline `828bd15`):

- `npm run build` and `npm run lint` passed; no repository-wide lint failures.
- Seventeen focused ChromeHeadless tests passed across `blog-lead-video.util.spec.ts`, `blog-youtube-journey.util.spec.ts`, `blog-block-placement.util.spec.ts`, and `blog-video-viewer.component.spec.ts`.
- Playwright Chromium checked `http://127.0.0.1:4200/blog/they-bought-a-full-size-temu-mega-drone` at 1440 × 1000 and touch/mobile 390 × 1000 and 320 × 1000. Browser plugin/skill was unavailable, so the installed Playwright runtime was used.
- All three viewports verified click-to-load, advancing real YouTube video time, pause/seek/resume through the embedded HTML media element, the same iframe across docking/return, visible switch/return/close controls, no duplicated inline video, and the no-video cover fallback. Each had zero horizontal overflow and zero page exceptions. Third-party YouTube button markup and shortcuts were not used as stable test contracts.
- Browser QA used the repository's staged Temu article as an in-memory local fixture without importing or saving it to any CMS. Each viewport recorded 16 environment console messages: seven rejected local App Check debug exchanges, seven connections to the absent Firestore emulator, and two Firestore reachability warnings. These 48 messages are not a clean-console claim or backend-health proof.
- Inspected concept and final native-size screenshots together with `view_image`: stage proportions, poster quality, control hierarchy, article scale, caption, floating placement, mobile stacking, and existing dark/seasonal styling. No unintended copy or material layout mismatch remained after the documented adaptations. Screenshots and scripts stay outside committed source.
- A separate 1440 × 1000 light-theme check passed keyboard Space toggling, caption retention, 1.5× title scaling through the existing reader-size token, and the original body return link staying on the same article. A scoped article click handler prevents Angular's base href from redirecting bare viewer fragments to the homepage.
- `npm run test:docs` and `git diff --check` passed. Physical Safari/device and real CMS/backend verification remain outside this local UI check.

Regression coverage includes:

- `blog-block-placement.util.spec.ts` for legacy poll defaults, explicit inline polls, and future rail blocks;
- `poll-block.tool.spec.ts` and `blog-editorjs-adapter.spec.ts` for placement authoring and round trips;
- `blog-post-rail.component.spec.ts` for compact interactive and suggested-post presentation;
- `blog-poll.component.spec.ts` for compact rail styling without changing vote behavior;
- `blog-reading.util.spec.ts` for all four present-rail track selections;
- `blog-table-of-contents.component.spec.ts` for collapsed narrow disclosure semantics and backward heading navigation;
- desktop and mobile Browser checks for column ownership, sticky bounds, stacked order, link interaction, overflow, and console health.
